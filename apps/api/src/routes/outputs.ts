import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { OUTPUT_KEYS, OUTPUT_LABELS, OUTPUT_SHAPE, type EditOutputResponse, type ItemResponse, type OutputKey } from "@a2n/shared";
import { toEditedData } from "../ai/schemas";
import { generations, userSources } from "../db/schema";
import { db, fail, newId, type AppEnv } from "../lib/http";
import { replaceStudyRows, syncStudyRows } from "../pipeline/study-rows";
import { assertIdle, ownedSource, requirePlan, startRun } from "./library";
import { effectiveGenerations, outputEntries, selectedOutputs, toLibraryItem } from "./serialize";

/*
 * Output actions on one item (all free: credits are per minute/page, not per output). Edits and
 * regenerations go into the user's own copy of that output (generations.variant = their id), so
 * everyone else reading the shared copy of a public video keeps theirs.
 */

export const outputs = new Hono<AppEnv>();

const outputKey = z.enum(OUTPUT_KEYS as [OutputKey, ...OutputKey[]]);
const studyKind = (output: OutputKey) => (OUTPUT_SHAPE[output] === "tasks" ? "tasks" : OUTPUT_SHAPE[output] === "flashcards" ? "flashcards" : null);

/** The item plus one of the outputs the user picked for it. */
async function pickedOutput(userId: string, sourceId: string, raw: string) {
  const parsed = outputKey.safeParse(raw);
  if (!parsed.success) throw fail(404, "OUTPUT_NOT_FOUND", "That output doesn't exist.");
  const output = parsed.data;
  const row = await ownedSource(userId, sourceId);
  if (!selectedOutputs(row.us).includes(output))
    throw fail(404, "OUTPUT_NOT_FOUND", `${OUTPUT_LABELS[output]} isn't one of this note's outputs. Add it first.`);
  return { ...row, output };
}

async function itemResponse(userId: string, sourceId: string): Promise<ItemResponse> {
  const { src, us } = await ownedSource(userId, sourceId);
  return { item: toLibraryItem(src, us) };
}

/** Adds outputs to the item and makes whichever aren't made yet. */
outputs.post("/sources/:id/outputs", async (c) => {
  const user = c.get("user");
  const { src, us } = await ownedSource(user.id, c.req.param("id"));
  const body = z.object({ outputs: z.array(outputKey).min(1).max(20) }).parse(await c.req.json());
  assertIdle(us);
  if (us.noteType === "auto" || !src.contentR2Key) throw fail(409, "NOT_READY", "This note didn't finish processing. Retry it first, then add outputs.");
  const picked = selectedOutputs(us);
  const added = [...new Set(body.outputs)].filter((o) => !picked.includes(o));
  const next = [...picked, ...added];
  if (next.length > 20) throw fail(422, "TOO_MANY_OUTPUTS", "A note can have up to 20 outputs. Remove some first.");

  const wanted = { ...us, selectedOutputsJson: JSON.stringify(next) };
  const gens = await effectiveGenerations(wanted, body.outputs);
  const missing = body.outputs.filter((o) => gens.get(o)?.status !== "ready");
  if (missing.length) await requirePlan(user.id);
  if (added.length)
    await db
      .update(userSources)
      .set({ selectedOutputsJson: wanted.selectedOutputsJson })
      .where(and(eq(userSources.userId, user.id), eq(userSources.sourceId, src.id)));
  // Already made (e.g. someone else asked for it on this video): just set up this user's tasks/reviews for it.
  if (missing.length) await startRun(wanted, { outputs: missing });
  else await syncStudyRows(wanted);
  return c.json(await itemResponse(user.id, src.id));
});

/** A fresh version of one output, as this user's own copy. */
outputs.post("/sources/:id/outputs/:output/regenerate", async (c) => {
  const user = c.get("user");
  const { src, us, output } = await pickedOutput(user.id, c.req.param("id"), c.req.param("output"));
  const raw = await c.req.text();
  const { instructions } = z.object({ instructions: z.string().trim().max(1000).optional() }).parse(JSON.parse(raw || "{}"));
  assertIdle(us);
  if (!src.contentR2Key) throw fail(409, "NOT_READY", "This note didn't finish processing. Retry it first.");
  await requirePlan(user.id);
  await startRun(us, { outputs: [output], mode: "regenerate", instructions: instructions || undefined });
  return c.json(await itemResponse(user.id, src.id));
});

/** Saves a manual edit as this user's own copy of the output. */
outputs.patch("/sources/:id/outputs/:output", async (c) => {
  const user = c.get("user");
  const { src, us, output } = await pickedOutput(user.id, c.req.param("id"), c.req.param("output"));
  const body = z.object({ data: z.looseObject({ type: z.string() }) }).parse(await c.req.json());
  const shape = OUTPUT_SHAPE[output];
  if (body.data.type !== shape) throw fail(422, "WRONG_SHAPE", `${OUTPUT_LABELS[output]} is saved as "${shape}" data, not "${body.data.type}".`);
  const data = toEditedData(shape, body.data);

  const current = (await effectiveGenerations(us, [output])).get(output);
  if (!current?.contentJson) throw fail(409, "NOT_READY", `${OUTPUT_LABELS[output]} isn't ready yet, so there's nothing to edit.`);
  if (current.variant === user.id && (current.status === "queued" || current.status === "running"))
    throw fail(409, "BUSY", `${OUTPUT_LABELS[output]} is being regenerated. Edit it once that's done.`);

  const now = Date.now();
  const [gen] = await db
    .insert(generations)
    .values({
      id: newId(),
      sourceId: src.id,
      variant: user.id,
      noteType: us.noteType,
      outputType: output,
      language: us.language,
      status: "ready",
      contentJson: JSON.stringify(data),
      model: current.model,
      promptVersion: current.promptVersion,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [generations.sourceId, generations.variant, generations.noteType, generations.language, generations.outputType],
      set: { status: "ready", contentJson: JSON.stringify(data), error: null, updatedAt: now },
    })
    .returning();
  // Their copy's tasks keep ticks for unchanged text; its cards start their schedule again.
  await replaceStudyRows(gen!, data);
  const kind = studyKind(output);
  if (kind) await syncStudyRows(us, kind);

  const entries = await outputEntries(us, await effectiveGenerations(us, [output]));
  const res: EditOutputResponse = { output: entries[output]! };
  return c.json(res);
});

/** Drops this user's own copy of an output and goes back to the shared one. */
outputs.delete("/sources/:id/outputs/:output/custom", async (c) => {
  const user = c.get("user");
  const { src, us, output } = await pickedOutput(user.id, c.req.param("id"), c.req.param("output"));
  if (us.instructions)
    throw fail(409, "NO_SHARED_COPY", "This note follows your custom instructions, so there's no original to go back to. Regenerate it instead.");
  const [own] = await db
    .select()
    .from(generations)
    .where(
      and(
        eq(generations.sourceId, src.id),
        eq(generations.variant, user.id),
        eq(generations.noteType, us.noteType),
        eq(generations.language, us.language),
        eq(generations.outputType, output),
      ),
    );
  if (!own) throw fail(404, "NOT_CUSTOM", `${OUTPUT_LABELS[output]} is already the original.`);
  if (own.status === "queued" || own.status === "running") throw fail(409, "BUSY", `${OUTPUT_LABELS[output]} is being regenerated. Try again once that's done.`);
  // Its cards (with their reviews) and quiz attempts go with it; tasks move back to the shared copy below, keeping ticks.
  await db.delete(generations).where(eq(generations.id, own.id));
  await syncStudyRows(us);
  if (!(await effectiveGenerations(us, [output])).has(output)) {
    // No shared copy was ever made (unusual): make one.
    await requirePlan(user.id);
    await startRun(us, { outputs: [output] });
  }
  return c.json(await itemResponse(user.id, src.id));
});
