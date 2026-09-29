import { env, WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { and, eq } from "drizzle-orm";
import { CHARS_PER_PAGE, OUTPUT_SHAPE, noteTypeDef, planDef, type NoteTypeKey, type OutputKey } from "@a2n/shared";
import { llmJSON } from "../ai/llm";
import { billingFor, blockReason, chargedFor, refundItem, spend } from "../billing/credits";
import { ANALYSE_PROMPT, outputPrompt, PROMPT_VERSION } from "../ai/prompts";
import { ANALYSE_SCHEMA, llmSchema, toOutputData } from "../ai/schemas";
import { cardReviews, flashcards, generations, sources, tasks, userSources } from "../db/schema";
import { db, newId } from "../lib/http";
import { anchorKind, contentKey, renderForPrompt, type ExtractedContent } from "./content";
import { extract, userError } from "./extract";

export type ProcessParams = { sourceId: string; userId: string; autoOutputs: boolean };

const STEP = { retries: { limit: 2, delay: "10 seconds", backoff: "exponential" }, timeout: "10 minutes" } as const;

async function setStatus(sourceId: string, status: string, progress: number, error: string | null = null) {
  await db.update(sources).set({ status, progress, error, updatedAt: Date.now() }).where(eq(sources.id, sourceId));
}

async function loadContent(sourceId: string): Promise<ExtractedContent> {
  const obj = await env.BUCKET.get(contentKey(sourceId));
  if (!obj) throw new Error("Extracted content missing");
  return obj.json<ExtractedContent>();
}

/** Charges what's still owed for an item (a retry only pays for what isn't already charged). */
async function charge(userId: string, sourceId: string, credits: number, meta?: { minutes: number; pages: number }) {
  const owed = credits - (await chargedFor(sourceId));
  if (owed <= 0) return;
  const bill = await billingFor(userId);
  if (!bill.canUse) throw userError(blockReason(bill)!.message);
  if (!(await spend(userId, owed, "item", { sourceId, meta })))
    throw userError(`This needs ${credits} credits and you have ${bill.credits.balance} left. Upgrade in Plan & billing, or wait for your plan to renew.`);
}

/** plan.md §5.2 `process-source`. */
export class ProcessSource extends WorkflowEntrypoint<Cloudflare.Env, ProcessParams> {
  async run(event: WorkflowEvent<ProcessParams>, step: WorkflowStep) {
    const { sourceId, userId } = event.payload;
    try {
      /* 1–4. Extract, check limits, store content */
      const extracted = await step.do("extract", STEP, async () => {
        const [src] = await db.select().from(sources).where(eq(sources.id, sourceId));
        if (!src) throw new NonRetryableError("Source not found");
        const meta = JSON.parse(src.metaJson ?? "{}") as { mime?: string; filename?: string; credits?: number };
        // A retry reuses what was already extracted; it only pays again if the credits were refunded.
        if (src.contentR2Key && (await this.env.BUCKET.head(src.contentR2Key))) {
          await charge(userId, sourceId, meta.credits ?? 0);
          return { hasTitle: !!src.title };
        }
        const media = ["audio", "video", "recording"].includes(src.kind);
        await setStatus(sourceId, media ? "transcribing" : "extracting", 8);

        const content = await extract({ kind: src.kind as never, sourceRef: src.sourceRef, mime: meta.mime, filename: meta.filename });

        // Credits (plan.md §8): 1 per started media minute, 1 per page (pasted text and articles: per 3,000 characters).
        const minutes = content.durationSec ? Math.ceil(content.durationSec / 60) : 0;
        const chars = content.segments.reduce((n, seg) => n + seg.text.length, 0);
        const pages = media ? 0 : (content.pages ?? Math.max(1, Math.ceil(chars / CHARS_PER_PAGE)));
        const bill = await billingFor(userId);
        if (!bill.canUse) throw userError(blockReason(bill)!.message);
        const maxSec = planDef(bill.plan!).maxMediaSeconds;
        if (content.durationSec && content.durationSec > maxSec)
          throw userError(`Your plan takes recordings up to ${maxSec / 3600} hours. Upgrade in Plan & billing for longer ones.`);
        const credits = minutes + pages;
        await charge(userId, sourceId, credits, { minutes, pages });

        await this.env.BUCKET.put(contentKey(sourceId), JSON.stringify(content), { httpMetadata: { contentType: "application/json" } });
        await db
          .update(sources)
          .set({
            contentR2Key: contentKey(sourceId),
            extractionMethod: content.method,
            language: content.language ?? null,
            metaJson: JSON.stringify({ ...meta, durationSec: content.durationSec, pages: content.pages, credits }),
            title: src.title ?? content.title ?? null,
            progress: 30,
            updatedAt: Date.now(),
          })
          .where(eq(sources.id, sourceId));
        return { hasTitle: !!(src.title ?? content.title) };
      });

      /* 5. Title + note type (if auto) */
      const plan = await step.do("analyse", STEP, async () => {
        const [us] = await db.select().from(userSources).where(and(eq(userSources.userId, userId), eq(userSources.sourceId, sourceId)));
        if (!us) throw new NonRetryableError("Library entry not found");
        const content = await loadContent(sourceId);
        let noteType = us.noteType as NoteTypeKey | "auto";
        let outputs = JSON.parse(us.selectedOutputsJson) as OutputKey[];
        if (noteType === "auto" || !extracted.hasTitle) {
          const { data } = await llmJSON({
            model: this.env.MODEL_LIGHT,
            system: ANALYSE_PROMPT,
            user: renderForPrompt(content).slice(0, 40_000),
            schema: ANALYSE_SCHEMA,
            maxTokens: 1000,
            reasoning: "off",
          });
          if (!extracted.hasTitle) await db.update(sources).set({ title: data.title }).where(eq(sources.id, sourceId));
          if (noteType === "auto") {
            noteType = data.noteType;
            if (event.payload.autoOutputs) outputs = noteTypeDef(noteType).defaults;
            await db
              .update(userSources)
              .set({ noteType, selectedOutputsJson: JSON.stringify(outputs) })
              .where(and(eq(userSources.userId, userId), eq(userSources.sourceId, sourceId)));
          }
        }
        // Primary output first so something shows up quickly.
        const primary = noteTypeDef(noteType).primary;
        outputs = outputs.includes(primary) ? [primary, ...outputs.filter((o) => o !== primary)] : outputs;
        for (const output of outputs)
          await db
            .insert(generations)
            .values({ id: newId(), sourceId, noteType, outputType: output, language: us.language, status: "queued" })
            .onConflictDoNothing();
        await setStatus(sourceId, "generating", 40);
        const today = new Date(us.addedAt + 5.5 * 3600_000).toISOString().slice(0, 10);
        return { noteType, outputs, language: us.language, instructions: us.instructions, today };
      });

      /* 6–9. Generate outputs: the first alone, the rest in parallel */
      let done = 0;
      const generate = async (output: OutputKey) => {
        try {
          await step.do(`generate:${output}`, STEP, async () => {
            const [existing] = await db
              .select({ status: generations.status })
              .from(generations)
              .where(and(eq(generations.sourceId, sourceId), eq(generations.outputType, output)));
            if (existing?.status === "ready") return; // kept from an earlier run
            await db
              .update(generations)
              .set({ status: "running", error: null, updatedAt: Date.now() })
              .where(and(eq(generations.sourceId, sourceId), eq(generations.outputType, output)));
            const content = await loadContent(sourceId);
            const shape = OUTPUT_SHAPE[output];
            const anchors = anchorKind(content);
            const { data, model } = await llmJSON({
              model: shape === "notes" ? this.env.MODEL_NOTES : this.env.MODEL_LIGHT,
              system: outputPrompt({ noteType: plan.noteType, output, language: plan.language, instructions: plan.instructions, hasAnchors: anchors, today: plan.today }),
              user: renderForPrompt(content),
              schema: llmSchema(shape, anchors) as never,
            });
            const outputData = toOutputData(shape, data, anchors);
            const [gen] = await db
              .update(generations)
              .set({ status: "ready", contentJson: JSON.stringify(outputData), model, promptVersion: PROMPT_VERSION, updatedAt: Date.now() })
              .where(and(eq(generations.sourceId, sourceId), eq(generations.outputType, output)))
              .returning({ id: generations.id });
            await saveStudyRows(userId, sourceId, gen!.id, outputData);
          });
        } catch (e) {
          await db
            .update(generations)
            .set({ status: "failed", error: userMessage(e), updatedAt: Date.now() })
            .where(and(eq(generations.sourceId, sourceId), eq(generations.outputType, output)));
        } finally {
          done++;
          await setStatus(sourceId, "generating", 40 + Math.round((done / plan.outputs.length) * 58));
        }
      };
      const [first, ...rest] = plan.outputs;
      if (first) await generate(first);
      await Promise.all(rest.map(generate));

      await step.do("finish", async () => {
        const rows = await db.select({ status: generations.status }).from(generations).where(eq(generations.sourceId, sourceId));
        const anyReady = rows.some((r) => r.status === "ready");
        if (!anyReady) await refundItem(userId, sourceId);
        await setStatus(sourceId, anyReady ? "ready" : "failed", 100, anyReady ? null : "We couldn't generate notes for this. Try again.");
      });
    } catch (e) {
      // Nothing usable came out of it, so give the credits back.
      await refundItem(userId, sourceId);
      await setStatus(sourceId, "failed", 0, userMessage(e));
    }
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

/** Tasks and flashcards also live in their own tables so users can tick and review them. */
async function saveStudyRows(userId: string, sourceId: string, generationId: string, data: ReturnType<typeof toOutputData>) {
  const now = Date.now();
  if (data.type === "tasks") {
    await db.delete(tasks).where(and(eq(tasks.generationId, generationId), eq(tasks.userId, userId)));
    const rows = data.items.map((t, i) => ({
      id: newId(),
      userId,
      sourceId,
      generationId,
      task: t.task,
      kind: t.kind,
      dueDate: t.due,
      anchorJson: t.anchor ? JSON.stringify(t.anchor) : null,
      position: i,
    }));
    for (const chunk of chunks(rows, 8)) await insertChunk(tasks, chunk);
  }
  if (data.type === "flashcards" && data.cards.length) {
    await db.delete(flashcards).where(eq(flashcards.generationId, generationId));
    const rows = data.cards.map((c, i) => ({
      id: newId(),
      generationId,
      sourceId,
      front: c.front,
      back: c.back,
      topic: c.topic,
      anchorJson: c.anchor ? JSON.stringify(c.anchor) : null,
      position: i,
    }));
    for (const chunk of chunks(rows, 12)) await insertChunk(flashcards, chunk);
    for (const chunk of chunks(rows, 12)) await insertChunk(cardReviews, chunk.map((r) => ({ userId, cardId: r.id, due: now })));
  }
}

/* D1 allows at most 100 bound parameters per statement and Drizzle binds every column, so chunk rows by column count
 * (tasks 12 columns → 8 rows, flashcards/card_reviews 8 → 12). */
const chunks = <T>(xs: T[], size: number) => Array.from({ length: Math.ceil(xs.length / size) }, (_, i) => xs.slice(i * size, i * size + size));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const insertChunk = (table: any, rows: object[]) => (rows.length ? db.insert(table).values(rows as never) : Promise.resolve());
