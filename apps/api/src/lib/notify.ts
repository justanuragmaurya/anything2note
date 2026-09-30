import { env } from "cloudflare:workers";
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { user } from "../db/auth-schema";
import { cardReviews, reminderLog, sources, tasks, userSettings, userSources } from "../db/schema";
import { escapeHtml, sendNotifications, type Email } from "../email";
import { parseJson, type SourceMeta } from "../routes/serialize";
import { db, istDay } from "./http";
import { settingsFor } from "./settings";

/*
 * Emails (plan.md §2.3): "your notes are ready" when an item finishes, and a morning reminder
 * when flashcards are due or tasks are due that day. Both respect UserSettings and are logged in
 * reminder_log, so a retried step or cron run never sends one twice.
 */

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";
const settingsLink = () => `${env.WEB_ORIGIN}/app/settings`;

function layout(paragraphs: string[], cta: { label: string; url: string }, footer: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.5;color:#111">${paragraphs.join("")}<p><a href="${cta.url}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">${escapeHtml(cta.label)}</a></p><p style="color:#666;font-size:13px">${footer}</p></div>`;
}

/* ───────────── Notes ready ───────────── */

/** Once per item (a retry or a later run for new outputs doesn't email again). */
export async function notifyReady(userId: string, sourceId: string): Promise<void> {
  if (!(await settingsFor(userId)).emailNotesReady) return;
  const [row] = await db
    .select({ email: user.email, name: user.name, title: sources.title, meta: sources.metaJson, override: userSources.titleOverride })
    .from(userSources)
    .innerJoin(sources, eq(sources.id, userSources.sourceId))
    .innerJoin(user, eq(user.id, userSources.userId))
    .where(and(eq(userSources.userId, userId), eq(userSources.sourceId, sourceId)));
  if (!row) return;

  const kind = `ready:${sourceId}`;
  const [claimed] = await db.insert(reminderLog).values({ userId, kind, day: 0, sentAt: Date.now() }).onConflictDoNothing().returning();
  if (!claimed) return;

  const title = row.override ?? row.title ?? parseJson<SourceMeta>(row.meta)?.label ?? "Your item";
  const url = `${env.WEB_ORIGIN}/app/i/${sourceId}`;
  const email: Email = {
    to: row.email,
    subject: `Your notes are ready: ${title}`,
    text: `Hi ${firstName(row.name)},\n\nYour notes for "${title}" are ready.\n\nOpen them: ${url}\n\nTurn these emails off in Settings: ${settingsLink()}`,
    html: layout(
      [`<p>Hi ${escapeHtml(firstName(row.name))},</p>`, `<p>Your notes for <strong>${escapeHtml(title)}</strong> are ready.</p>`],
      { label: "Open your notes", url },
      `You get this email when notes finish. <a href="${settingsLink()}" style="color:#666">Turn it off in Settings</a>.`,
    ),
  };
  try {
    await sendNotifications([email]);
  } catch (e) {
    // Let the step retry send it.
    await db.delete(reminderLog).where(and(eq(reminderLog.userId, userId), eq(reminderLog.kind, kind)));
    throw e;
  }
}

/* ───────────── Morning reminders ───────────── */

/** 02:00 UTC = 07:30 IST. Must match the cron in wrangler.jsonc. */
export const REMINDER_CRON = "0 2 * * *";
const IST = 5.5 * 3600_000;
/** D1 binds at most 100 parameters per query (a reminder_log insert binds 4 per user). */
const BATCH = 20;

type Due = { cards: number; tasks: { task: string; item: string }[] };

function reminderEmail(to: string, name: string, due: Due): Email {
  const cards = due.cards ? `${due.cards} flashcard${due.cards === 1 ? "" : "s"} to review` : "";
  const taskCount = due.tasks.length ? `${due.tasks.length} task${due.tasks.length === 1 ? "" : "s"} due today` : "";
  const subject = [cards, taskCount].filter(Boolean).join(" and ") + (cards && !taskCount ? " today" : "");
  const shown = due.tasks.slice(0, 5);
  const more = due.tasks.length - shown.length;
  const cta = due.cards ? { label: "Start reviewing", url: `${env.WEB_ORIGIN}/app/review` } : { label: "See your tasks", url: `${env.WEB_ORIGIN}/app/tasks` };
  const text = [
    `Good morning, ${firstName(name)}.`,
    "",
    ...(due.cards ? [`You have ${cards}.`] : []),
    ...(shown.length ? [`Due today:`, ...shown.map((t) => `• ${t.task} (${t.item})`), ...(more > 0 ? [`…and ${more} more`] : [])] : []),
    "",
    `${cta.label}: ${cta.url}`,
    "",
    `Turn these emails off in Settings: ${settingsLink()}`,
  ].join("\n");
  const html = layout(
    [
      `<p>Good morning, ${escapeHtml(firstName(name))}.</p>`,
      ...(due.cards ? [`<p>You have <strong>${cards}</strong>.</p>`] : []),
      ...(shown.length
        ? [
            `<p>Due today:</p><ul>${shown.map((t) => `<li>${escapeHtml(t.task)} <span style="color:#666">(${escapeHtml(t.item)})</span></li>`).join("")}${more > 0 ? `<li>…and ${more} more</li>` : ""}</ul>`,
          ]
        : []),
    ],
    cta,
    `You get this email on mornings when something is due. <a href="${settingsLink()}" style="color:#666">Turn it off in Settings</a>.`,
  );
  return { to, subject: subject.charAt(0).toUpperCase() + subject.slice(1), text, html };
}

/** The daily cron: one email per user with due flashcards or tasks due today (IST), unless they turned reminders off. */
export async function sendDailyReminders(now = Date.now()): Promise<{ sent: number }> {
  const day = istDay(now);
  const today = new Date(now + IST).toISOString().slice(0, 10);

  const cardRows = await db
    .select({ userId: cardReviews.userId, n: sql<number>`count(*)` })
    .from(cardReviews)
    .where(lte(cardReviews.due, now))
    .groupBy(cardReviews.userId);
  const taskRows = await db
    .select({ userId: tasks.userId, task: tasks.task, title: sources.title, meta: sources.metaJson, override: userSources.titleOverride })
    .from(tasks)
    .innerJoin(userSources, and(eq(userSources.userId, tasks.userId), eq(userSources.sourceId, tasks.sourceId)))
    .innerJoin(sources, eq(sources.id, tasks.sourceId))
    .where(and(eq(tasks.status, "open"), eq(tasks.dueDate, today)));

  const due = new Map<string, Due>();
  const entry = (id: string) => due.get(id) ?? due.set(id, { cards: 0, tasks: [] }).get(id)!;
  for (const r of cardRows) entry(r.userId).cards = Number(r.n);
  for (const r of taskRows) entry(r.userId).tasks.push({ task: r.task, item: r.override ?? r.title ?? parseJson<SourceMeta>(r.meta)?.label ?? "Untitled" });

  let sent = 0;
  const ids = [...due.keys()];
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const [users, optedOut, already] = await Promise.all([
      db.select({ id: user.id, email: user.email, name: user.name }).from(user).where(inArray(user.id, batch)),
      db.select({ id: userSettings.userId }).from(userSettings).where(and(inArray(userSettings.userId, batch), eq(userSettings.emailReminders, false))),
      db.select({ id: reminderLog.userId }).from(reminderLog).where(and(inArray(reminderLog.userId, batch), eq(reminderLog.kind, "daily"), eq(reminderLog.day, day))),
    ]);
    const skip = new Set([...optedOut, ...already].map((r) => r.id));
    const targets = users.filter((u) => !skip.has(u.id));
    if (!targets.length) continue;

    // Claim first, so an overlapping run can't send the same reminder; release the claims if sending fails.
    const claimed = await db
      .insert(reminderLog)
      .values(targets.map((u) => ({ userId: u.id, kind: "daily", day, sentAt: now })))
      .onConflictDoNothing()
      .returning({ userId: reminderLog.userId });
    const mine = new Set(claimed.map((r) => r.userId));
    const emails = targets.filter((u) => mine.has(u.id)).map((u) => reminderEmail(u.email, u.name, due.get(u.id)!));
    try {
      await sendNotifications(emails);
      sent += emails.length;
    } catch (e) {
      console.error("[reminders] send failed", e);
      await db.delete(reminderLog).where(and(inArray(reminderLog.userId, [...mine]), eq(reminderLog.kind, "daily"), eq(reminderLog.day, day)));
    }
  }
  console.log(`[reminders] ${today}: ${sent} sent, ${due.size} users had something due`);
  return { sent };
}
