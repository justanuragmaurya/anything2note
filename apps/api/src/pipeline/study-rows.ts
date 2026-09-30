import { and, eq, inArray, ne } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Flashcard, OutputData, Task } from "@a2n/shared";
import { cardReviews, flashcards, tasks, userSources } from "../db/schema";
import { db, newId } from "../lib/http";
import { effectiveGenerations, parseJson, type GenerationRow, type UserSourceRow } from "../routes/serialize";

/*
 * Tasks and flashcards also live in their own tables so users can tick and review them. Cards
 * belong to a generation (everyone reading it reviews the same cards); tasks and review state
 * belong to each user. These keep a user's rows in step with the generations they see
 * (effectiveGenerations), so moving to their own copy of an output, back to the shared one, or
 * to another note type moves their tasks and reviews along with it.
 */

type TaskItem = Pick<Task, "task" | "kind" | "due" | "anchor"> & { done?: boolean };
type Gen = Pick<GenerationRow, "id" | "sourceId">;

const sameText = (s: string) => s.trim().toLowerCase();

async function batch(ops: BatchItem<"sqlite">[]) {
  if (ops.length) await db.batch(ops as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}

/* D1 allows at most 100 bound parameters per statement and Drizzle binds every column, so chunk rows by column count
 * (tasks 12 columns → 8 rows, flashcards/card_reviews 8 → 12). */
const chunks = <T>(xs: T[], size: number) => Array.from({ length: Math.ceil(xs.length / size) }, (_, i) => xs.slice(i * size, i * size + size));

/**
 * Replaces a user's tasks for a source with `items` (from generation `generationId`). A task whose
 * text is unchanged keeps its id and tick; others take `done` from the item.
 */
export async function replaceTasks(userId: string, sourceId: string, generationId: string, items: TaskItem[]) {
  const mine = and(eq(tasks.userId, userId), eq(tasks.sourceId, sourceId));
  const old = await db.select({ id: tasks.id, task: tasks.task, status: tasks.status }).from(tasks).where(mine);
  const byText = new Map<string, typeof old>();
  for (const t of old) byText.set(sameText(t.task), [...(byText.get(sameText(t.task)) ?? []), t]);
  const now = Date.now();
  const rows = items.map((t, i) => {
    const prev = byText.get(sameText(t.task))?.shift();
    return {
      id: prev?.id ?? newId(),
      userId,
      sourceId,
      generationId,
      task: t.task,
      kind: t.kind,
      dueDate: t.due,
      status: (prev ? prev.status === "done" : t.done) ? "done" : "open",
      anchorJson: t.anchor ? JSON.stringify(t.anchor) : null,
      position: i,
      updatedAt: now,
    };
  });
  await batch([db.delete(tasks).where(mine), ...chunks(rows, 8).map((c) => db.insert(tasks).values(c))]);
}

async function insertCards(gen: Gen, cards: Flashcard[], positions?: number[]): Promise<string[]> {
  const rows = cards.map((c, i) => ({
    id: newId(),
    generationId: gen.id,
    sourceId: gen.sourceId,
    front: c.front,
    back: c.back,
    topic: c.topic,
    anchorJson: c.anchor ? JSON.stringify(c.anchor) : null,
    position: positions?.[i] ?? i,
  }));
  await batch(chunks(rows, 12).map((c) => db.insert(flashcards).values(c)));
  return rows.map((r) => r.id);
}

const reviewRows = (userId: string, cardIds: string[], due: number) =>
  chunks(cardIds, 12).map((c) =>
    db
      .insert(cardReviews)
      .values(c.map((cardId) => ({ userId, cardId, due })))
      .onConflictDoNothing(),
  );

/**
 * A generation's content was replaced in place (regenerated, or edited by its owner): rebuild its
 * study rows for everyone reading it. Tasks keep ticks whose text is unchanged. Cards are
 * rescheduled from scratch for whoever was reviewing them; an edited card keeps its row (and
 * review history) when its id comes back, the rest are replaced.
 */
export async function replaceStudyRows(gen: Gen, data: OutputData) {
  if (data.type === "tasks") {
    const users = await db.selectDistinct({ userId: tasks.userId }).from(tasks).where(eq(tasks.generationId, gen.id));
    for (const { userId } of users) await replaceTasks(userId, gen.sourceId, gen.id, data.items);
  }
  if (data.type === "flashcards") {
    const reviewers = await db
      .selectDistinct({ userId: cardReviews.userId })
      .from(cardReviews)
      .innerJoin(flashcards, eq(flashcards.id, cardReviews.cardId))
      .where(eq(flashcards.generationId, gen.id));
    const existing = new Set((await db.select({ id: flashcards.id }).from(flashcards).where(eq(flashcards.generationId, gen.id))).map((r) => r.id));
    const keptIds = data.cards.filter((c) => existing.has(c.id)).map((c) => c.id);
    await batch([
      ...chunks(
        [...existing].filter((id) => !keptIds.includes(id)),
        90,
      ).map((ids) => db.delete(flashcards).where(inArray(flashcards.id, ids))),
      ...data.cards.flatMap((c, i) =>
        existing.has(c.id)
          ? [
              db
                .update(flashcards)
                .set({ front: c.front, back: c.back, topic: c.topic, anchorJson: c.anchor ? JSON.stringify(c.anchor) : null, position: i })
                .where(eq(flashcards.id, c.id)),
            ]
          : [],
      ),
    ]);
    const added = await insertCards(
      gen,
      data.cards.filter((c) => !existing.has(c.id)),
      data.cards.map((c, i) => (existing.has(c.id) ? -1 : i)).filter((i) => i >= 0),
    );
    const now = Date.now();
    await batch([
      ...chunks(keptIds, 90).map((ids) =>
        db.update(cardReviews).set({ due: now, intervalDays: 0, ease: 2.5, reps: 0, lapses: 0, lastReview: null }).where(inArray(cardReviews.cardId, ids)),
      ),
      ...reviewers.flatMap((r) => reviewRows(r.userId, added, now)),
    ]);
  }
}

/** The user's tasks for a source follow the tasks output they see: rows from other generations go, missing ones are copied in. */
async function syncTasks(us: UserSourceRow) {
  const gen = (await effectiveGenerations(us, ["tasks"])).get("tasks");
  const mine = and(eq(tasks.userId, us.userId), eq(tasks.sourceId, us.sourceId));
  if (!gen) return void (await db.delete(tasks).where(mine));
  const data = parseJson<OutputData>(gen.contentJson);
  // Still being made: keep what they have until it's ready.
  if (data?.type !== "tasks") return;
  const rows = await db.select({ generationId: tasks.generationId }).from(tasks).where(mine);
  if (rows.length ? rows.every((r) => r.generationId === gen.id) : !data.items.length) return;
  await replaceTasks(us.userId, us.sourceId, gen.id, data.items);
}

/** The user reviews the cards of the flashcards output they see, and no other cards from this source. */
async function syncCards(us: UserSourceRow) {
  const gen = (await effectiveGenerations(us, ["flashcards"])).get("flashcards");
  const data = gen ? parseJson<OutputData>(gen.contentJson) : undefined;
  if (gen && data?.type !== "flashcards") return;
  let cardIds: string[] = [];
  if (gen && data?.type === "flashcards") {
    cardIds = (await db.select({ id: flashcards.id }).from(flashcards).where(eq(flashcards.generationId, gen.id))).map((r) => r.id);
    if (!cardIds.length && data.cards.length) cardIds = await insertCards(gen, data.cards);
  }
  const others = db
    .select({ id: flashcards.id })
    .from(flashcards)
    .where(and(eq(flashcards.sourceId, us.sourceId), gen ? ne(flashcards.generationId, gen.id) : undefined));
  await batch([
    db.delete(cardReviews).where(and(eq(cardReviews.userId, us.userId), inArray(cardReviews.cardId, others))),
    ...reviewRows(us.userId, cardIds, Date.now()),
  ]);
}

/** Brings one user's tasks and/or card reviews for a source in line with what they see now. */
export async function syncStudyRows(user: UserSourceRow | { userId: string; sourceId: string }, only?: "tasks" | "flashcards") {
  const us =
    "selectedOutputsJson" in user
      ? user
      : (await db.select().from(userSources).where(and(eq(userSources.userId, user.userId), eq(userSources.sourceId, user.sourceId))))[0];
  if (!us) return;
  if (only !== "flashcards") await syncTasks(us);
  if (only !== "tasks") await syncCards(us);
}
