import { env } from "cloudflare:workers";
import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import {
  NOTE_TYPE_KEYS,
  OUTPUT_KEYS,
  isYoutubeUrl,
  noteTypeDef,
  planDef,
  youtubeIdOf,
  type Anchor,
  type ChatMessage,
  type ChatResponse,
  type ChatStreamEvent,
  type ItemDetail,
  type LibraryResponse,
  type NoteTypeKey,
  type OutputKey,
  type SourceKind,
} from "@a2n/shared";
import { streamSSE } from "hono/streaming";
import { llmJSON, llmStream } from "../ai/llm";
import { billingFor, blockReason, canChat, consumeChat } from "../billing/credits";
import { CHAT_PROMPT, CHAT_STREAM_PROMPT } from "../ai/prompts";
import { chatSchema, citationsIn, toAnchor } from "../ai/schemas";
import { cardReviews, chatMessages, flashcards, folders, generations, quizAttempts, reviewLog, shares, sources, tasks, uploads, userSources } from "../db/schema";
import { anchorKind, renderForPrompt, type ExtractedContent } from "../pipeline/content";
import { syncStudyRows } from "../pipeline/study-rows";
import type { ProcessParams } from "../pipeline/workflow";
import { db, fail, newId, type AppEnv } from "../lib/http";
import { presignGet } from "../lib/r2";
import { videoInfo } from "../lib/youtube";
import {
  effectiveGenerations,
  outputEntries,
  parseJson,
  selectedOutputs,
  toLibraryItem,
  toShare,
  type SourceMeta,
  type UserSourceRow,
} from "./serialize";
import { sourceFromUpload } from "./uploads";

export const library = new Hono<AppEnv>();

export async function ownedSource(userId: string, sourceId: string) {
  const [row] = await db
    .select({ src: sources, us: userSources })
    .from(userSources)
    .innerJoin(sources, eq(sources.id, userSources.sourceId))
    .where(and(eq(userSources.userId, userId), eq(userSources.sourceId, sourceId)));
  if (!row) throw fail(404, "NOT_FOUND", "That note isn't in your library.");
  return row;
}

/** 402 unless the account has a usable plan with credits left. */
async function requireCredits(userId: string) {
  const blocked = blockReason(await billingFor(userId));
  if (blocked) throw fail(402, blocked.code, blocked.message);
}

async function dueCounts(userId: string, sourceIds?: string[]) {
  const rows = await db
    .select({ sourceId: flashcards.sourceId, n: sql<number>`count(*)` })
    .from(cardReviews)
    .innerJoin(flashcards, eq(flashcards.id, cardReviews.cardId))
    .where(and(eq(cardReviews.userId, userId), lte(cardReviews.due, Date.now()), sourceIds ? inArray(flashcards.sourceId, sourceIds) : undefined))
    .groupBy(flashcards.sourceId);
  return new Map(rows.map((r) => [r.sourceId, Number(r.n)]));
}

/* ───────────── Library ───────────── */

library.get("/library", async (c) => {
  const user = c.get("user");
  const rows = await db
    .select({ src: sources, us: userSources })
    .from(userSources)
    .innerJoin(sources, eq(sources.id, userSources.sourceId))
    .where(eq(userSources.userId, user.id))
    .orderBy(desc(userSources.addedAt));
  const due = await dueCounts(user.id);
  const fs = await db.select({ id: folders.id, name: folders.name }).from(folders).where(eq(folders.userId, user.id)).orderBy(asc(folders.createdAt));
  const body: LibraryResponse = { items: rows.map((r) => toLibraryItem(r.src, r.us, due.get(r.src.id) ?? 0)), folders: fs };
  return c.json(body);
});

library.post("/folders", async (c) => {
  const { name } = z.object({ name: z.string().trim().min(1).max(60) }).parse(await c.req.json());
  const folder = { id: newId(), userId: c.get("user").id, name };
  await db.insert(folders).values(folder);
  return c.json({ folder: { id: folder.id, name } }, 201);
});

library.delete("/folders/:id", async (c) => {
  await db.delete(folders).where(and(eq(folders.id, c.req.param("id")), eq(folders.userId, c.get("user").id)));
  return c.body(null, 204);
});

/* ───────────── Create a source ───────────── */

const createSchema = z.object({
  source: z.discriminatedUnion("type", [
    z.object({ type: z.literal("upload"), uploadId: z.string(), recording: z.boolean().optional() }),
    z.object({ type: z.literal("text"), text: z.string().trim().min(20, "Paste at least a few sentences.").max(400_000), title: z.string().max(200).optional() }),
    z.object({ type: z.literal("url"), url: z.string().url() }),
  ]),
  noteType: z.enum([...(NOTE_TYPE_KEYS as [NoteTypeKey, ...NoteTypeKey[]]), "auto"]),
  outputs: z.array(z.enum(OUTPUT_KEYS as [OutputKey, ...OutputKey[]])).max(20).optional(),
  language: z.string().max(40).optional(),
  instructions: z.string().max(1000).optional(),
});

type CreateBody = z.infer<typeof createSchema>;

/** Adds a source to a user's library and starts their processing run. */
async function addToLibrary(userId: string, sourceId: string, body: CreateBody) {
  const autoOutputs = !body.outputs?.length;
  const outputs = body.outputs?.length ? body.outputs : body.noteType === "auto" ? [] : noteTypeDef(body.noteType).defaults;
  const now = Date.now();
  await db.insert(userSources).values({
    userId,
    sourceId,
    noteType: body.noteType,
    selectedOutputsJson: JSON.stringify(outputs),
    language: body.language ?? "auto",
    instructions: body.instructions?.trim() || null,
    status: "queued",
    addedAt: now,
    updatedAt: now,
  });
  await env.PROCESS_SOURCE.create({ id: newId(), params: { sourceId, userId, autoOutputs } });
  const { src, us } = await ownedSource(userId, sourceId);
  return toLibraryItem(src, us);
}

const minutesText = (sec: number) => `${Math.ceil(sec / 60)} minutes`;

/**
 * A YouTube link. Checked with the Data API before anything is spent. A public video is one
 * shared source for everyone (processed once, outputs reused); an unlisted one stays private.
 */
async function addYoutube(userId: string, videoId: string, body: CreateBody) {
  const video = await videoInfo(videoId);
  if (!video) throw fail(422, "VIDEO_UNAVAILABLE", "This video is private, deleted, or doesn't exist.");
  if (video.live !== "none" || !video.durationSec)
    throw fail(422, "VIDEO_LIVE", "Live streams and premieres aren't supported. Try again once the video has finished.");
  const bill = await billingFor(userId);
  const maxSec = planDef(bill.plan!).maxMediaSeconds;
  if (video.durationSec > maxSec)
    throw fail(422, "TOO_LONG", `This video is ${minutesText(video.durationSec)} long; your plan takes videos up to ${maxSec / 3600} hours. Upgrade in Plan & billing for longer ones.`);
  const minutes = Math.ceil(video.durationSec / 60);
  if (bill.credits.balance < minutes)
    throw fail(402, "NO_CREDITS", `This video needs ${minutes} credits (1 per minute) and you have ${bill.credits.balance}. Upgrade in Plan & billing, or try a shorter video.`);

  const meta: SourceMeta = { label: video.channel, durationSec: video.durationSec, language: video.language };
  const now = Date.now();
  const row = { kind: "youtube", sourceRef: videoId, title: video.title, metaJson: JSON.stringify(meta), status: "queued", createdAt: now, updatedAt: now };

  if (video.privacy !== "public") {
    const id = newId();
    await db.insert(sources).values({ ...row, id, visibility: "private", ownerUserId: userId });
    return { item: await addToLibrary(userId, id, body), created: true };
  }

  await db
    .insert(sources)
    .values({ ...row, id: newId(), visibility: "shared", ownerUserId: null })
    .onConflictDoNothing();
  const [src] = await db
    .select()
    .from(sources)
    .where(and(eq(sources.kind, "youtube"), eq(sources.sourceRef, videoId), eq(sources.visibility, "shared")));
  const [existing] = await db.select().from(userSources).where(and(eq(userSources.userId, userId), eq(userSources.sourceId, src!.id)));
  if (existing) return { item: toLibraryItem(src!, existing), created: false };
  return { item: await addToLibrary(userId, src!.id, body), created: true };
}

library.post("/sources", async (c) => {
  const user = c.get("user");
  const body = createSchema.parse(await c.req.json());
  await requireCredits(user.id);

  if (body.source.type === "url") {
    const videoId = youtubeIdOf(body.source.url);
    if (videoId) {
      const { item, created } = await addYoutube(user.id, videoId, body);
      return c.json({ item }, created ? 201 : 200);
    }
    if (isYoutubeUrl(body.source.url)) throw fail(422, "BAD_YOUTUBE_URL", "That YouTube link isn't a single video. Paste the link to one video.");
  }

  const id = newId();
  let kind: SourceKind;
  let sourceRef: string | null;
  let title: string | null = null;
  let meta: SourceMeta;

  if (body.source.type === "upload") {
    ({ kind, sourceRef, meta } = await sourceFromUpload(user.id, body.source.uploadId, body.source.recording));
  } else if (body.source.type === "text") {
    kind = "text";
    sourceRef = `text/${user.id}/${id}.txt`;
    await env.BUCKET.put(sourceRef, body.source.text, { httpMetadata: { contentType: "text/plain; charset=utf-8" } });
    title = body.source.title?.trim() || null;
    meta = { label: "Pasted text", size: body.source.text.length };
  } else {
    const u = new URL(body.source.url);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw fail(422, "BAD_URL", "Only http(s) links are supported.");
    kind = "web";
    sourceRef = u.toString();
    meta = { label: u.hostname.replace(/^www\./, "") };
  }

  const now = Date.now();
  await db.insert(sources).values({ id, kind, ownerUserId: user.id, sourceRef, title, metaJson: JSON.stringify(meta), status: "queued", createdAt: now, updatedAt: now });
  return c.json({ item: await addToLibrary(user.id, id, body) }, 201);
});

/* ───────────── Item workspace ───────────── */

/** 409 while this user's run for the item is going. One that hasn't moved in 15 minutes is stuck (e.g. the dev server restarted), so it doesn't count. */
export function assertIdle(us: UserSourceRow) {
  const stale = Date.now() - us.updatedAt > 15 * 60_000;
  if (us.status !== "failed" && us.status !== "ready" && !stale) throw fail(409, "BUSY", "This note is still being processed. Try again once it's ready.");
}

/** A run only charges what isn't paid for yet (the workflow checks the balance), but it needs a plan. */
export async function requirePlan(userId: string) {
  const bill = await billingFor(userId);
  if (!bill.canUse) throw fail(402, "NO_PLAN", blockReason(bill)!.message);
}

/** Queues a processing run of this user's item (see ProcessParams for `outputs` and `mode`). */
export async function startRun(us: UserSourceRow, params: Pick<ProcessParams, "outputs" | "mode" | "instructions"> = {}) {
  await db
    .update(userSources)
    .set({ status: "queued", progress: 0, error: null, updatedAt: Date.now() })
    .where(and(eq(userSources.userId, us.userId), eq(userSources.sourceId, us.sourceId)));
  await env.PROCESS_SOURCE.create({ id: newId(), params: { sourceId: us.sourceId, userId: us.userId, autoOutputs: us.noteType === "auto", ...params } });
}

library.get("/sources/:id", async (c) => {
  const user = c.get("user");
  const { src, us } = await ownedSource(user.id, c.req.param("id"));
  const due = await dueCounts(user.id, [src.id]);

  const obj = src.contentR2Key ? await env.BUCKET.get(src.contentR2Key) : null;
  const content = obj ? await obj.json<ExtractedContent>() : null;
  const outputs = await outputEntries(us, await effectiveGenerations(us));

  const uploaded = src.sourceRef?.startsWith("uploads/");
  const meta = parseJson<SourceMeta>(src.metaJson) ?? {};
  const chat = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, user.id), eq(chatMessages.sourceId, src.id)))
    .orderBy(asc(chatMessages.createdAt));
  const [share] = await db.select().from(shares).where(and(eq(shares.userId, user.id), eq(shares.sourceId, src.id)));

  await db.update(userSources).set({ lastOpenedAt: Date.now() }).where(and(eq(userSources.userId, user.id), eq(userSources.sourceId, src.id)));

  const body: ItemDetail = {
    item: toLibraryItem(src, us, due.get(src.id) ?? 0),
    content: content ? { kind: content.kind, segments: content.segments } : null,
    outputs,
    mediaUrl: uploaded && src.sourceRef ? await presignGet(src.sourceRef) : null,
    mediaType: uploaded ? (meta.mime ?? null) : null,
    chat: chat.map(toChatMessage),
    share: share ? toShare(share) : null,
  };
  return c.json(body);
});

library.patch("/sources/:id", async (c) => {
  const user = c.get("user");
  const { src, us } = await ownedSource(user.id, c.req.param("id"));
  const body = z
    .object({
      title: z.string().trim().min(1).max(200).optional(),
      folderId: z.string().nullable().optional(),
      noteType: z.enum(NOTE_TYPE_KEYS as [NoteTypeKey, ...NoteTypeKey[]]).optional(),
    })
    .parse(await c.req.json());
  if (body.folderId) {
    const [f] = await db.select().from(folders).where(and(eq(folders.id, body.folderId), eq(folders.userId, user.id)));
    if (!f) throw fail(404, "FOLDER_NOT_FOUND", "That folder doesn't exist.");
  }
  // A new note type means that type's default outputs; whichever aren't made yet are generated (no extra credits).
  const noteType = body.noteType !== undefined && body.noteType !== us.noteType ? body.noteType : undefined;
  if (noteType) {
    assertIdle(us);
    await requirePlan(user.id);
  }
  await db
    .update(userSources)
    .set({
      ...(body.title !== undefined && { titleOverride: body.title }),
      ...(body.folderId !== undefined && { folderId: body.folderId }),
      ...(noteType && { noteType, selectedOutputsJson: JSON.stringify(noteTypeDef(noteType).defaults) }),
    })
    .where(and(eq(userSources.userId, user.id), eq(userSources.sourceId, src.id)));
  if (noteType) {
    const { us: next } = await ownedSource(user.id, src.id);
    // The old type's tasks and card reviews go (or come back, if this type was made before).
    await syncStudyRows(next);
    const gens = await effectiveGenerations(next);
    const missing = selectedOutputs(next).filter((o) => gens.get(o)?.status !== "ready");
    if (missing.length) await startRun(next, { outputs: missing });
  }
  const row = await ownedSource(user.id, src.id);
  return c.json({ item: toLibraryItem(row.src, row.us) });
});

library.delete("/sources/:id", async (c) => {
  const user = c.get("user");
  const { src } = await ownedSource(user.id, c.req.param("id"));
  if (src.visibility === "shared") {
    // Others may have this source too: remove only this user's entry and state, keep the shared outputs.
    const cards = db.select({ id: flashcards.id }).from(flashcards).where(eq(flashcards.sourceId, src.id));
    const gens = db.select({ id: generations.id }).from(generations).where(eq(generations.sourceId, src.id));
    await db.batch([
      db.delete(cardReviews).where(and(eq(cardReviews.userId, user.id), inArray(cardReviews.cardId, cards))),
      db.delete(reviewLog).where(and(eq(reviewLog.userId, user.id), inArray(reviewLog.cardId, cards))),
      db.delete(quizAttempts).where(and(eq(quizAttempts.userId, user.id), inArray(quizAttempts.generationId, gens))),
      db.delete(tasks).where(and(eq(tasks.userId, user.id), eq(tasks.sourceId, src.id))),
      db.delete(chatMessages).where(and(eq(chatMessages.userId, user.id), eq(chatMessages.sourceId, src.id))),
      db.delete(shares).where(and(eq(shares.userId, user.id), eq(shares.sourceId, src.id))),
      db.delete(generations).where(and(eq(generations.sourceId, src.id), eq(generations.variant, user.id))),
      db.delete(userSources).where(and(eq(userSources.userId, user.id), eq(userSources.sourceId, src.id))),
    ]);
    return c.body(null, 204);
  }
  const keys = [src.contentR2Key, src.sourceRef?.startsWith("uploads/") || src.sourceRef?.startsWith("text/") ? src.sourceRef : null].filter(
    (k): k is string => !!k,
  );
  if (keys.length) await env.BUCKET.delete(keys);
  await db.delete(sources).where(eq(sources.id, src.id));
  if (src.sourceRef?.startsWith("uploads/")) await db.delete(uploads).where(eq(uploads.r2Key, src.sourceRef));
  return c.body(null, 204);
});

/** Re-run a failed item (or its failed outputs). */
library.post("/sources/:id/retry", async (c) => {
  const user = c.get("user");
  const { src, us } = await ownedSource(user.id, c.req.param("id"));
  assertIdle(us);
  await requirePlan(user.id);
  // Failed outputs go back in the queue; the new run claims them (and any stuck ones) again.
  const gens = await effectiveGenerations(us);
  const failed = [...gens.values()].filter((g) => g.status === "failed").map((g) => g.id);
  if (failed.length) await db.update(generations).set({ status: "queued", error: null, updatedAt: Date.now() }).where(inArray(generations.id, failed));
  // Only what isn't ready is made again (everything, if extraction never finished).
  const picked = selectedOutputs(us);
  const missing = picked.filter((o) => gens.get(o)?.status !== "ready");
  await startRun(us, missing.length && missing.length < picked.length ? { outputs: missing } : {});
  const row = await ownedSource(user.id, src.id);
  return c.json({ item: toLibraryItem(row.src, row.us) });
});

/* ───────────── Chat ───────────── */

const toChatMessage = (m: typeof chatMessages.$inferSelect): ChatMessage => ({
  id: m.id,
  role: m.role as ChatMessage["role"],
  content: m.content,
  citations: parseJson<Anchor[]>(m.citationsJson) ?? [],
  createdAt: m.createdAt,
});

/**
 * POST /sources/:id/chat. Everything that can be refused (not ready, no allowance) is checked
 * before an answer starts, so a stream only ever fails on the model's side. The exchange is saved
 * and one message of allowance (or 1 credit) used once the answer is complete, never for a
 * failed one.
 */
library.post("/sources/:id/chat", async (c) => {
  const user = c.get("user");
  const { src, us } = await ownedSource(user.id, c.req.param("id"));
  const { message } = z.object({ message: z.string().trim().min(1).max(4000) }).parse(await c.req.json());
  if (!src.contentR2Key) throw fail(409, "NOT_READY", "This note is still being processed.");

  if (!(await canChat(user.id))) {
    const blocked = blockReason(await billingFor(user.id));
    throw fail(402, blocked?.code ?? "NO_CREDITS", blocked?.message ?? "You've used this cycle's chat messages and have no credits left. Upgrade in Plan & billing.");
  }

  const obj = await env.BUCKET.get(src.contentR2Key);
  if (!obj) throw fail(409, "NOT_READY", "This note's content is missing. Try processing it again.");
  const content = await obj.json<ExtractedContent>();
  const anchors = anchorKind(content);
  const history = (
    await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.userId, user.id), eq(chatMessages.sourceId, src.id)))
      .orderBy(desc(chatMessages.createdAt))
      .limit(12)
  ).reverse();
  const convo = history.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n");
  const noteType = (us.noteType === "auto" ? "general" : us.noteType) as NoteTypeKey;
  const prompt = `CONTENT:\n${renderForPrompt(content).slice(0, 300_000)}\n\n${convo ? `CONVERSATION SO FAR:\n${convo}\n\n` : ""}QUESTION: ${message}`;
  const askedAt = Date.now();

  const save = async (answer: string, citations: Anchor[]) => {
    const userMsg = { id: newId(), userId: user.id, sourceId: src.id, role: "user", content: message, citationsJson: null, createdAt: askedAt };
    const reply = {
      id: newId(),
      userId: user.id,
      sourceId: src.id,
      role: "assistant",
      content: answer,
      citationsJson: JSON.stringify(citations),
      createdAt: Math.max(Date.now(), askedAt + 1),
    };
    await db.insert(chatMessages).values([userMsg, reply]);
    await consumeChat(user.id);
    return toChatMessage(reply);
  };

  if (!c.req.header("Accept")?.includes("text/event-stream")) {
    const { data } = await llmJSON({
      model: env.MODEL_CHAT,
      system: CHAT_PROMPT(noteType),
      user: prompt,
      schema: chatSchema(anchors),
      maxTokens: 4000,
      reasoning: "off",
    });
    const citations = data.citations.map((v) => toAnchor(anchors, v)).filter((a): a is Anchor => !!a);
    const body: ChatResponse = { message: await save(data.answer, citations) };
    return c.json(body);
  }

  return streamSSE(c, async (stream) => {
    // The client may go away mid-answer; the answer is still finished and saved so it's in the history.
    const send = (e: ChatStreamEvent) => stream.writeSSE({ data: JSON.stringify(e) }).catch(() => undefined);
    let answer = "";
    try {
      for await (const text of llmStream({ model: env.MODEL_CHAT, system: CHAT_STREAM_PROMPT(noteType, anchors), user: prompt, maxTokens: 4000 })) {
        answer += text;
        await send({ type: "delta", text });
      }
      if (!answer.trim()) throw new Error("Empty chat answer");
      await send({ type: "done", message: await save(answer.trim(), citationsIn(answer, anchors)) });
    } catch (e) {
      console.error("[chat]", e);
      await send({ type: "error", error: { code: "CHAT_FAILED", message: "The answer couldn't be finished. Try asking again." } });
    }
  });
});
