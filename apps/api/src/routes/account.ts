import { and, eq, gte } from "drizzle-orm";
import { Hono } from "hono";
import type { MeResponse, OutputData, StatsResponse } from "@a2n/shared";
import { billingFor } from "../billing/credits";
import { flashcards, generations, quizAttempts, reviewLog, sources, userSources } from "../db/schema";
import { DAY, db, istDay, period, startOfIstDay, type AppEnv } from "../lib/http";
import { parseJson } from "./serialize";

export const account = new Hono<AppEnv>();

/** Review counts per IST day index, for the last `days` days. */
async function reviewDays(userId: string, days: number) {
  const since = startOfIstDay(Date.now()) - (days - 1) * DAY;
  const rows = await db
    .select({ at: reviewLog.reviewedAt, rating: reviewLog.rating, topic: flashcards.topic, sourceId: flashcards.sourceId })
    .from(reviewLog)
    .innerJoin(flashcards, eq(flashcards.id, reviewLog.cardId))
    .where(and(eq(reviewLog.userId, userId), gte(reviewLog.reviewedAt, since)));
  const byDay = new Map<number, number>();
  for (const r of rows) byDay.set(istDay(r.at), (byDay.get(istDay(r.at)) ?? 0) + 1);
  return { rows, byDay };
}

function streakOf(byDay: Map<number, number>): number {
  let day = istDay(Date.now());
  if (!byDay.has(day)) day -= 1; // today not reviewed yet doesn't break the streak
  let n = 0;
  while (byDay.has(day)) {
    n++;
    day--;
  }
  return n;
}

account.get("/me", async (c) => {
  const user = c.get("user");
  const { byDay } = await reviewDays(user.id, 400);
  const body: MeResponse = {
    user: { id: user.id, name: user.name, email: user.email, image: user.image ?? null },
    billing: await billingFor(user.id),
    streak: streakOf(byDay),
  };
  return c.json(body);
});

account.get("/stats", async (c) => {
  const user = c.get("user");
  const { rows, byDay } = await reviewDays(user.id, 400);
  const today = istDay(Date.now());

  const heatmap = Array.from({ length: 26 * 7 }, (_, i) => byDay.get(today - (26 * 7 - 1 - i)) ?? 0);
  const weekday = (new Date(Date.now() + 5.5 * 3600_000).getUTCDay() + 6) % 7; // Mon = 0
  const weekly = Array.from({ length: 7 }, (_, i) => (i <= weekday ? (byDay.get(today - weekday + i) ?? 0) : 0));

  const month = period();
  const [y, m] = month.split("-").map(Number) as [number, number];
  const lastMonth = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
  const monthOf = (ts: number) => period(ts);
  const cardsReviewedThisMonth = rows.filter((r) => monthOf(r.at) === month).length;
  const cardsReviewedLastMonth = rows.filter((r) => monthOf(r.at) === lastMonth).length;

  // Weak topics: quiz answers + card ratings ("again"/"hard" count as misses).
  const attempts = await db
    .select({ a: quizAttempts, content: generations.contentJson, sourceId: generations.sourceId })
    .from(quizAttempts)
    .innerJoin(generations, eq(generations.id, quizAttempts.generationId))
    .where(eq(quizAttempts.userId, user.id));
  const topics = new Map<string, { right: number; total: number; sourceId: string }>();
  const bump = (topic: string, sourceId: string, right: boolean) => {
    if (!topic) return;
    const t = topics.get(topic) ?? { right: 0, total: 0, sourceId };
    t.total++;
    if (right) t.right++;
    topics.set(topic, t);
  };
  let quizRight = 0;
  let quizTotal = 0;
  for (const { a, content, sourceId } of attempts) {
    quizRight += a.score;
    quizTotal += a.total;
    const data = parseJson<OutputData>(content);
    const answers = parseJson<number[]>(a.answersJson) ?? [];
    if (data?.type === "quiz") data.questions.forEach((q, i) => bump(q.topic, sourceId, answers[i] === q.correct));
  }
  for (const r of rows) bump(r.topic, r.sourceId, r.rating === "good" || r.rating === "easy");

  const weak = [...topics.entries()]
    .map(([topic, t]) => ({ topic, sourceId: t.sourceId, accuracy: Math.round((t.right / t.total) * 100), total: t.total }))
    .filter((t) => t.total >= 2 && t.accuracy < 80)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);
  const titles = new Map<string, string>();
  for (const w of weak) {
    if (titles.has(w.sourceId)) continue;
    const [row] = await db
      .select({ title: sources.title, override: userSources.titleOverride })
      .from(sources)
      .innerJoin(userSources, and(eq(userSources.sourceId, sources.id), eq(userSources.userId, user.id)))
      .where(eq(sources.id, w.sourceId));
    titles.set(w.sourceId, row?.override ?? row?.title ?? "Untitled");
  }

  const body: StatsResponse = {
    streak: streakOf(byDay),
    cardsReviewedThisMonth,
    cardsReviewedLastMonth,
    quizAccuracy: quizTotal ? Math.round((quizRight / quizTotal) * 100) : null,
    heatmap,
    weekly,
    weakTopics: weak.map((w) => ({ topic: w.topic, item: titles.get(w.sourceId) ?? "", accuracy: w.accuracy })),
    billing: await billingFor(user.id),
  };
  return c.json(body);
});
