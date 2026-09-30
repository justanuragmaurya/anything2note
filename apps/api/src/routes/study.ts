import { and, asc, eq, lte } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { OUTPUT_KEYS, type Anchor, type NoteTypeKey, type OutputData, type OutputKey, type ReviewCard, type TrackedTask } from "@a2n/shared";
import { cardReviews, flashcards, quizAttempts, reviewLog, sources, tasks, userSources } from "../db/schema";
import { DAY, db, fail, newId, type AppEnv } from "../lib/http";
import { effectiveGenerations, parseJson } from "./serialize";

export const study = new Hono<AppEnv>();

const noteTypeOf = (t: string) => (t === "auto" ? "general" : t) as NoteTypeKey;

/* ───────────── Tasks ───────────── */

study.get("/tasks", async (c) => {
  const user = c.get("user");
  const rows = await db
    .select({ t: tasks, title: sources.title, meta: sources.metaJson, us: userSources })
    .from(tasks)
    .innerJoin(sources, eq(sources.id, tasks.sourceId))
    .innerJoin(userSources, and(eq(userSources.sourceId, tasks.sourceId), eq(userSources.userId, user.id)))
    .where(eq(tasks.userId, user.id))
    .orderBy(asc(userSources.addedAt), asc(tasks.position));
  const list: TrackedTask[] = rows.map(({ t, title, meta, us }) => ({
    id: t.id,
    task: t.task,
    kind: t.kind as TrackedTask["kind"],
    due: t.dueDate,
    anchor: parseJson<Anchor>(t.anchorJson),
    done: t.status === "done",
    itemId: t.sourceId,
    itemTitle: us.titleOverride ?? title ?? parseJson<{ label?: string }>(meta)?.label ?? "Untitled",
    itemDate: us.addedAt,
    noteType: noteTypeOf(us.noteType),
  }));
  return c.json({ tasks: list });
});

/** Tick, rename, re-type or re-date one of the user's tasks (any subset). The item's tasks output reads the same rows. */
study.patch("/tasks/:id", async (c) => {
  const body = z
    .object({
      done: z.boolean().optional(),
      task: z.string().trim().min(1, "A task can't be empty.").max(500).optional(),
      kind: z.enum(["homework", "reading", "exam", "project"]).optional(),
      due: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a yyyy-mm-dd date, or null for none.")
        .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "That isn't a real date.")
        .nullable()
        .optional(),
    })
    .parse(await c.req.json());
  const [row] = await db
    .update(tasks)
    .set({
      ...(body.done !== undefined && { status: body.done ? "done" : "open" }),
      ...(body.task !== undefined && { task: body.task }),
      ...(body.kind !== undefined && { kind: body.kind }),
      ...(body.due !== undefined && { dueDate: body.due }),
      updatedAt: Date.now(),
    })
    .where(and(eq(tasks.id, c.req.param("id")), eq(tasks.userId, c.get("user").id)))
    .returning({ id: tasks.id });
  if (!row) throw fail(404, "NOT_FOUND", "Task not found.");
  return c.json({ ok: true });
});

/* ───────────── Flashcard review ───────────── */

study.get("/reviews/due", async (c) => {
  const user = c.get("user");
  const rows = await db
    .select({ card: flashcards, title: sources.title, meta: sources.metaJson, us: userSources })
    .from(cardReviews)
    .innerJoin(flashcards, eq(flashcards.id, cardReviews.cardId))
    .innerJoin(sources, eq(sources.id, flashcards.sourceId))
    .innerJoin(userSources, and(eq(userSources.sourceId, flashcards.sourceId), eq(userSources.userId, user.id)))
    .where(and(eq(cardReviews.userId, user.id), lte(cardReviews.due, Date.now())))
    .orderBy(asc(cardReviews.due), asc(flashcards.position))
    .limit(100);
  const cards: ReviewCard[] = rows.map(({ card, title, meta, us }) => ({
    id: card.id,
    front: card.front,
    back: card.back,
    topic: card.topic,
    anchor: parseJson<Anchor>(card.anchorJson),
    itemId: card.sourceId,
    itemTitle: us.titleOverride ?? title ?? parseJson<{ label?: string }>(meta)?.label ?? "Untitled",
    noteType: noteTypeOf(us.noteType),
  }));
  return c.json({ cards });
});

/** Simple SM-2 style scheduling: again → 10 min, otherwise the interval grows with ease. */
study.post("/reviews", async (c) => {
  const user = c.get("user");
  const { cardId, rating } = z.object({ cardId: z.string(), rating: z.enum(["again", "hard", "good", "easy"]) }).parse(await c.req.json());
  const [cur] = await db.select().from(cardReviews).where(and(eq(cardReviews.userId, user.id), eq(cardReviews.cardId, cardId)));
  if (!cur) throw fail(404, "NOT_FOUND", "Card not found.");
  const now = Date.now();
  let { intervalDays, ease, reps, lapses } = cur;
  if (rating === "again") {
    intervalDays = 0;
    ease = Math.max(1.3, ease - 0.2);
    lapses += 1;
    reps = 0;
  } else {
    const base = reps === 0 ? 1 : reps === 1 ? 3 : intervalDays * ease;
    intervalDays = rating === "hard" ? Math.max(1, (reps === 0 ? 1 : intervalDays) * 1.2) : rating === "easy" ? base * 1.3 + 1 : base;
    ease = rating === "hard" ? Math.max(1.3, ease - 0.15) : rating === "easy" ? ease + 0.15 : ease;
    reps += 1;
  }
  const due = rating === "again" ? now + 10 * 60_000 : now + Math.round(intervalDays * DAY);
  await db.batch([
    db
      .update(cardReviews)
      .set({ due, intervalDays, ease, reps, lapses, lastReview: now })
      .where(and(eq(cardReviews.userId, user.id), eq(cardReviews.cardId, cardId))),
    db.insert(reviewLog).values({ id: newId(), userId: user.id, cardId, rating, reviewedAt: now }),
  ]);
  return c.json({ nextDue: due });
});

/* ───────────── Quiz ───────────── */

study.post("/quiz-attempts", async (c) => {
  const user = c.get("user");
  const body = z
    .object({ itemId: z.string(), output: z.enum(OUTPUT_KEYS as [OutputKey, ...OutputKey[]]), answers: z.array(z.number().int()) })
    .parse(await c.req.json());
  const [us] = await db.select().from(userSources).where(and(eq(userSources.userId, user.id), eq(userSources.sourceId, body.itemId)));
  // Scored against the quiz this user sees (their own copy if they edited or regenerated it).
  const gen = us ? (await effectiveGenerations(us, [body.output])).get(body.output) : undefined;
  const data = parseJson<OutputData>(gen?.contentJson);
  if (!gen || data?.type !== "quiz") throw fail(404, "NOT_FOUND", "Quiz not found.");
  const total = data.questions.length;
  const score = data.questions.filter((q, i) => body.answers[i] === q.correct).length;
  await db.insert(quizAttempts).values({ id: newId(), userId: user.id, generationId: gen.id, answersJson: JSON.stringify(body.answers), score, total, createdAt: Date.now() });
  return c.json({ score, total });
});
