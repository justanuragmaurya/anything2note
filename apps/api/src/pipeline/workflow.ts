import { env, WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { and, eq, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { CHARS_PER_PAGE, OUTPUT_SHAPE, noteTypeDef, planDef, type NoteTypeKey, type OutputData, type OutputKey } from "@a2n/shared";
import { llmJSON } from "../ai/llm";
import { billingFor, blockReason, chargedFor, refundItem, spend } from "../billing/credits";
import { ANALYSE_PROMPT, outputPrompt, PROMPT_VERSION } from "../ai/prompts";
import { ANALYSE_SCHEMA, llmSchema, toOutputData } from "../ai/schemas";
import { generations, sources, userSources } from "../db/schema";
import { db, newId } from "../lib/http";
import { parseJson, variantOf, type SourceMeta } from "../routes/serialize";
import { anchorKind, contentKey, renderForPrompt, type ExtractedContent } from "./content";
import { replaceStudyRows, syncStudyRows } from "./study-rows";
import { extract, userError } from "./extract";
import { extractUploadedMedia, needsProcessor } from "./transcribe";
import { extractYoutube } from "./youtube";
import { notifyReady } from "../lib/notify";
import { deleteOriginal, ORIGINAL_DELETED } from "../lib/retention";

export type ProcessParams = {
  sourceId: string;
  userId: string;
  autoOutputs: boolean;
  /** Make (or reuse) only these of the user's outputs, e.g. ones just added; default all of them */
  outputs?: OutputKey[];
  /** "regenerate": a fresh version of `outputs` as the user's own copy, steered by `instructions` */
  mode?: "regenerate";
  instructions?: string;
};

const STEP = { retries: { limit: 2, delay: "10 seconds", backoff: "exponential" }, timeout: "10 minutes" } as const;

/*
 * Several users can process one shared source (a public YouTube video) at once, so extraction
 * and each generation are claimed by one run; the others wait, then reuse the result. A claim
 * whose heartbeat (updated_at) is older than this is abandoned and can be taken over.
 */
const STALE_MS = 15 * 60_000;
const WAIT = "20 seconds";
/** 120 waits × 20 s: long enough for another run to transcribe a long video. */
const MAX_WAITS = 120;

async function setStatus(userId: string, sourceId: string, status: string, progress: number, error: string | null = null) {
  await db
    .update(userSources)
    .set({ status, progress, error, updatedAt: Date.now() })
    .where(and(eq(userSources.userId, userId), eq(userSources.sourceId, sourceId)));
}

async function loadContent(sourceId: string): Promise<ExtractedContent> {
  const obj = await env.BUCKET.get(contentKey(sourceId));
  if (!obj) throw new Error("Extracted content missing");
  return obj.json<ExtractedContent>();
}

/** Checks the user's plan allows this length, then charges what's still owed (a retry only pays for what isn't already charged). */
async function charge(userId: string, sourceId: string, meta: SourceMeta & { credits?: number; minutes?: number }) {
  const bill = await billingFor(userId);
  if (!bill.canUse) throw userError(blockReason(bill)!.message);
  const maxSec = planDef(bill.plan!).maxMediaSeconds;
  if (meta.durationSec && meta.durationSec > maxSec)
    throw userError(`Your plan takes recordings and videos up to ${maxSec / 3600} hours. Upgrade in Plan & billing for longer ones.`);
  const credits = meta.credits ?? 0;
  const owed = credits - (await chargedFor(userId, sourceId));
  if (owed <= 0) return;
  if (!(await spend(userId, owed, "item", { sourceId, meta: { minutes: meta.minutes ?? 0, pages: meta.pages ?? 0 } })))
    throw userError(`This needs ${credits} credits and you have ${bill.credits.balance} left. Upgrade in Plan & billing, or wait for your plan to renew.`);
}

/** Before transcribing a long upload: the plan's length limit and enough credits, so no Whisper time is spent on a file that can't be charged. */
async function checkMedia(userId: string, sourceId: string, durationSec: number) {
  const bill = await billingFor(userId);
  if (!bill.canUse) throw userError(blockReason(bill)!.message);
  const minutes = Math.ceil(durationSec / 60);
  const maxSec = planDef(bill.plan!).maxMediaSeconds;
  if (durationSec > maxSec)
    throw userError(`This recording is ${minutes} minutes long; your plan takes recordings and videos up to ${maxSec / 3600} hours. Upgrade in Plan & billing for longer ones.`);
  const owed = minutes - (await chargedFor(userId, sourceId));
  if (owed > bill.credits.balance)
    throw userError(`This recording needs ${minutes} credits (1 per minute) and you have ${bill.credits.balance} left. Upgrade in Plan & billing, or wait for your plan to renew.`);
}

/** plan.md §5.2 `process-source`: one user's run for one source. */
export class ProcessSource extends WorkflowEntrypoint<Cloudflare.Env, ProcessParams> {
  async run(event: WorkflowEvent<ProcessParams>, step: WorkflowStep) {
    const { sourceId, userId } = event.payload;
    const runId = event.instanceId;
    try {
      /* 1–4. Extract once per source (or wait for the run that is), store content, charge this user */
      let claimed = false;
      for (let i = 0; !claimed; i++) {
        const r = await step.do(`claim:${i}`, STEP, async () => {
          const [src] = await db.select().from(sources).where(eq(sources.id, sourceId));
          if (!src) throw new NonRetryableError("Source not found");
          if (src.contentR2Key && (await this.env.BUCKET.head(src.contentR2Key))) {
            await charge(userId, sourceId, parseJson(src.metaJson) ?? {});
            return "ready";
          }
          const now = Date.now();
          const [won] = await db
            .update(sources)
            .set({ processingBy: runId, status: "extracting", error: null, updatedAt: now })
            .where(and(eq(sources.id, sourceId), or(isNull(sources.processingBy), eq(sources.processingBy, runId), lt(sources.updatedAt, now - STALE_MS))))
            .returning({ id: sources.id });
          const media = ["audio", "video", "recording"].includes(src.kind);
          await setStatus(userId, sourceId, media ? "transcribing" : "extracting", 8);
          return won ? "claimed" : "wait";
        });
        if (r === "ready") break;
        if (r === "claimed") claimed = true;
        else if (i >= MAX_WAITS) throw userError("This is taking longer than expected. Try again in a few minutes.");
        else await step.sleep(`claim-wait:${i}`, WAIT);
      }
      if (claimed) await this.extractAndStore(step, sourceId, userId, runId);

      /* 5. Title + note type (if auto) */
      const plan = await step.do("analyse", STEP, async () => {
        const [row] = await db
          .select({ us: userSources, title: sources.title })
          .from(userSources)
          .innerJoin(sources, eq(sources.id, userSources.sourceId))
          .where(and(eq(userSources.userId, userId), eq(userSources.sourceId, sourceId)));
        if (!row) throw new NonRetryableError("Library entry not found");
        const { us } = row;
        let noteType = us.noteType as NoteTypeKey | "auto";
        let outputs = JSON.parse(us.selectedOutputsJson) as OutputKey[];
        if (noteType === "auto" || !row.title) {
          const content = await loadContent(sourceId);
          const { data } = await llmJSON({
            model: this.env.MODEL_LIGHT,
            system: ANALYSE_PROMPT,
            user: renderForPrompt(content).slice(0, 40_000),
            schema: ANALYSE_SCHEMA,
            maxTokens: 1000,
            reasoning: "off",
          });
          if (!row.title) await db.update(sources).set({ title: data.title }).where(eq(sources.id, sourceId));
          if (noteType === "auto") {
            noteType = data.noteType;
            if (event.payload.autoOutputs) outputs = noteTypeDef(noteType).defaults;
            await db
              .update(userSources)
              .set({ noteType, selectedOutputsJson: JSON.stringify(outputs) })
              .where(and(eq(userSources.userId, userId), eq(userSources.sourceId, sourceId)));
          }
        }
        // This run makes `todo` (all picked outputs unless told otherwise), primary first so something shows up quickly.
        const selected = outputs;
        const only = event.payload.outputs;
        const primary = noteTypeDef(noteType).primary;
        let todo = only ? selected.filter((o) => only.includes(o)) : selected;
        todo = todo.includes(primary) ? [primary, ...todo.filter((o) => o !== primary)] : todo;
        // Each output is read from the user's own copy if they have one (or are regenerating it), else the shared one.
        const regenerate = event.payload.mode === "regenerate";
        const own = new Set(
          (
            await db
              .select({ output: generations.outputType })
              .from(generations)
              .where(
                and(
                  eq(generations.sourceId, sourceId),
                  eq(generations.variant, userId),
                  eq(generations.noteType, noteType),
                  eq(generations.language, us.language),
                ),
              )
          ).map((r) => r.output),
        );
        const variants: Record<string, string> = {};
        for (const o of selected) variants[o] = us.instructions || own.has(o) || (regenerate && todo.includes(o)) ? userId : "shared";
        for (const output of todo)
          await db
            .insert(generations)
            .values({ id: newId(), sourceId, variant: variants[output]!, noteType, outputType: output, language: us.language, status: "queued", updatedAt: Date.now() })
            .onConflictDoNothing();
        // A regeneration re-queues the user's copy (keeping its current content on show until the new one is ready).
        if (regenerate && todo.length)
          await db
            .update(generations)
            .set({ status: "queued", error: null, updatedAt: Date.now() })
            .where(
              and(
                eq(generations.sourceId, sourceId),
                eq(generations.variant, userId),
                eq(generations.noteType, noteType),
                eq(generations.language, us.language),
                inArray(generations.outputType, todo),
              ),
            );
        await setStatus(userId, sourceId, "generating", 40);
        const today = new Date(us.addedAt + 5.5 * 3600_000).toISOString().slice(0, 10);
        return {
          noteType,
          outputs: todo,
          selected,
          variants,
          variant: variantOf(us),
          language: us.language,
          instructions: [us.instructions, regenerate ? event.payload.instructions : null].filter(Boolean).join("\n") || null,
          fresh: regenerate,
          today,
        };
      });

      // One output's row as this user reads it; with no output, every output they picked (so a run that adds or
      // regenerates one still counts the ones they already have).
      const genKey = (output?: OutputKey): ReturnType<typeof and> =>
        output
          ? and(
              eq(generations.sourceId, sourceId),
              eq(generations.variant, plan.variants[output] ?? plan.variant),
              eq(generations.noteType, plan.noteType),
              eq(generations.language, plan.language),
              eq(generations.outputType, output),
            )
          : or(...plan.selected.map((o) => genKey(o)));

      /* 6–9. Generate outputs (or reuse ones already made for the same choices): the first alone, the rest in parallel */
      let done = 0;
      const generate = async (output: OutputKey) => {
        try {
          for (let i = 0; ; i++) {
            const r = await step.do(`generate:${output}:${i}`, STEP, () => this.generateOne(userId, sourceId, runId, output, plan, genKey(output)));
            if (r === "done") break;
            if (i >= MAX_WAITS) throw new Error(`Timed out waiting for ${output}`);
            await step.sleep(`generate-wait:${output}:${i}`, WAIT);
          }
        } catch (e) {
          // Only a generation this run was making is marked failed; another run's stays theirs.
          await db
            .update(generations)
            .set({ status: "failed", error: userMessage(e), updatedAt: Date.now() })
            .where(and(genKey(output), eq(generations.runId, runId), eq(generations.status, "running")));
        } finally {
          done++;
          await setStatus(userId, sourceId, "generating", 40 + Math.round((done / plan.outputs.length) * 58));
        }
      };
      const [first, ...rest] = plan.outputs;
      if (first) await generate(first);
      await Promise.all(rest.map(generate));

      const ready = await step.do("finish", async () => {
        const rows = await db.select({ status: generations.status }).from(generations).where(genKey());
        const anyReady = rows.some((r) => r.status === "ready");
        if (!anyReady) await refundItem(userId, sourceId);
        await setStatus(userId, sourceId, anyReady ? "ready" : "failed", 100, anyReady ? null : "We couldn't generate notes for this. Try again.");
        return anyReady;
      });
      // 10. Retention and the "notes ready" email. Neither can fail the item: the notes are already there.
      // The email is for an item's first notes only: not for added or regenerated outputs, and
      // notifyReady sends at most one per item, so a retry of a ready item doesn't email again.
      if (ready) {
        await step.do("retention", STEP, () => deleteOriginal(userId, sourceId)).catch((e) => console.error("[process-source] retention", sourceId, e));
        if (!event.payload.outputs && !event.payload.mode)
          await step.do("notify", STEP, () => notifyReady(userId, sourceId)).catch((e) => console.error("[process-source] notify", sourceId, e));
      }
    } catch (e) {
      // Nothing usable came out of it, so give the credits back and let go of anything this run held.
      await refundItem(userId, sourceId);
      await setStatus(userId, sourceId, "failed", 0, userMessage(e));
      await db
        .update(sources)
        .set({ processingBy: null, status: "failed", error: userMessage(e), updatedAt: Date.now() })
        .where(and(eq(sources.id, sourceId), eq(sources.processingBy, runId)));
      await db
        .update(generations)
        .set({ status: "failed", error: userMessage(e), updatedAt: Date.now() })
        .where(and(eq(generations.sourceId, sourceId), eq(generations.runId, runId), eq(generations.status, "running")));
    }
  }

  /** Runs extraction for a source this run has claimed, then records it and charges the user. */
  private async extractAndStore(step: WorkflowStep, sourceId: string, userId: string, runId: string) {
    const [src] = await step.do("load-source", STEP, async () => db.select().from(sources).where(eq(sources.id, sourceId)));
    const meta = parseJson<SourceMeta>(src!.metaJson) ?? {};
    if (!src!.sourceRef) throw userError(ORIGINAL_DELETED);
    const heartbeat = async () => {
      await db
        .update(sources)
        .set({ updatedAt: Date.now() })
        .where(and(eq(sources.id, sourceId), eq(sources.processingBy, runId)));
    };

    if (src!.kind === "youtube") {
      await extractYoutube(step, {
        sourceId,
        videoId: src!.sourceRef!,
        durationSec: meta.durationSec ?? 0,
        language: meta.language,
        heartbeat,
        onTranscribing: async (f) => {
          await heartbeat();
          await setStatus(userId, sourceId, "transcribing", 10 + Math.round(f * 20));
        },
      });
    } else if (["audio", "video", "recording"].includes(src!.kind) && needsProcessor(src!.kind, meta.mime, meta.size)) {
      await extractUploadedMedia(step, {
        sourceId,
        r2Key: src!.sourceRef!,
        checkDuration: (sec) => checkMedia(userId, sourceId, sec),
        heartbeat,
        onTranscribing: async (f) => {
          await heartbeat();
          await setStatus(userId, sourceId, "transcribing", 10 + Math.round(f * 20));
        },
      });
    } else {
      await step.do("extract", STEP, async () => {
        const content = await extract({ kind: src!.kind as never, sourceRef: src!.sourceRef, mime: meta.mime, filename: meta.filename });
        await this.env.BUCKET.put(contentKey(sourceId), JSON.stringify(content), { httpMetadata: { contentType: "application/json" } });
      });
    }

    await step.do("store", STEP, async () => {
      const content = await loadContent(sourceId);
      // Credits (plan.md §8): 1 per started media minute, 1 per page (pasted text and articles: per 3,000 characters).
      const media = content.kind === "media";
      const durationSec = content.durationSec || meta.durationSec;
      const minutes = durationSec ? Math.ceil(durationSec / 60) : 0;
      const chars = content.segments.reduce((n, seg) => n + seg.text.length, 0);
      const pages = media ? 0 : (content.pages ?? Math.max(1, Math.ceil(chars / CHARS_PER_PAGE)));
      const stored = { ...meta, durationSec, pages: content.pages, credits: minutes + pages, minutes };
      // Saved before charging: the content is good for anyone who adds this source, even if this user can't pay.
      await db
        .update(sources)
        .set({
          contentR2Key: contentKey(sourceId),
          extractionMethod: content.method,
          language: content.language ?? null,
          metaJson: JSON.stringify(stored),
          title: src!.title ?? content.title ?? null,
          status: "ready",
          processingBy: null,
          updatedAt: Date.now(),
        })
        .where(eq(sources.id, sourceId));
      await setStatus(userId, sourceId, "extracting", 30);
      await charge(userId, sourceId, { ...stored, pages });
    });
  }

  /** One attempt at one output: reuse it if ready, wait if another run is making it, else make it. */
  private async generateOne(
    userId: string,
    sourceId: string,
    runId: string,
    output: OutputKey,
    plan: { noteType: NoteTypeKey; language: string; instructions: string | null; today: string },
    key: ReturnType<typeof and>,
  ): Promise<"done" | "wait"> {
    const [gen] = await db.select().from(generations).where(key);
    if (!gen) throw new Error(`Generation row missing for ${output}`);
    const only = OUTPUT_SHAPE[output] === "tasks" ? "tasks" : OUTPUT_SHAPE[output] === "flashcards" ? "flashcards" : null;
    // A shared output made with an older prompt is made again rather than reused; a user's own copy is always theirs to keep.
    if (gen.status === "ready" && (gen.variant !== "shared" || gen.promptVersion === PROMPT_VERSION)) {
      if (only) await syncStudyRows({ userId, sourceId }, only);
      return "done";
    }
    const now = Date.now();
    const [mine] = await db
      .update(generations)
      .set({ status: "running", runId, error: null, updatedAt: now })
      .where(
        and(
          eq(generations.id, gen.id),
          or(
            inArray(generations.status, ["queued", "failed"]),
            eq(generations.runId, runId),
            lt(generations.updatedAt, now - STALE_MS),
            and(eq(generations.status, "ready"), eq(generations.variant, "shared"), or(isNull(generations.promptVersion), ne(generations.promptVersion, PROMPT_VERSION))),
          ),
        ),
      )
      .returning({ id: generations.id });
    if (!mine) return "wait";

    const content = await loadContent(sourceId);
    const shape = OUTPUT_SHAPE[output];
    const anchors = anchorKind(content);
    const { data, model } = await llmJSON({
      model: shape === "notes" ? this.env.MODEL_NOTES : this.env.MODEL_LIGHT,
      system: outputPrompt({
        noteType: plan.noteType,
        output,
        language: plan.language,
        instructions: plan.instructions,
        hasAnchors: anchors,
        today: plan.today,
        sourceLanguage: content.language,
      }),
      user: renderForPrompt(content),
      schema: llmSchema(shape, anchors) as never,
    });
    const outputData = toOutputData(shape, data, anchors);
    await db
      .update(generations)
      .set({ status: "ready", contentJson: JSON.stringify(outputData), model, promptVersion: PROMPT_VERSION, error: null, updatedAt: Date.now() })
      .where(eq(generations.id, gen.id));
    // Anyone already studying this generation (a regenerated or re-made shared one) moves to the new content.
    await replaceStudyRows(gen, outputData);
    if (only) await syncStudyRows({ userId, sourceId }, only);
    return "done";
  }
}

/** Errors made with `userError` carry a USER: marker (it survives step serialisation); others stay private. */
function userMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const i = msg.indexOf("USER:");
  if (i >= 0) return msg.slice(i + 5).trim();
  console.error("[process-source]", e);
  return "Something went wrong while processing this. Try again.";
}
