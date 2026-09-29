import { env } from "cloudflare:workers";
import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import {
  UPLOAD_LIMITS,
  NOTE_TYPE_KEYS,
  OUTPUT_KEYS,
  SUPPORTED_UPLOADS,
  noteTypeDef,
  type Anchor,
  type ChatMessage,
  type ItemDetail,
  type LibraryResponse,
  type NoteTypeKey,
  type OutputData,
  type OutputEntry,
  type OutputKey,
  type SourceKind,
} from "@a2n/shared";
import { llmJSON } from "../ai/llm";
import { billingFor, blockReason, canChat, consumeChat } from "../billing/credits";
import { CHAT_PROMPT } from "../ai/prompts";
import { chatSchema, toAnchor } from "../ai/schemas";
import { cardReviews, chatMessages, flashcards, folders, generations, sources, tasks, uploads, userSources } from "../db/schema";
import { anchorKind, renderForPrompt, type ExtractedContent } from "../pipeline/content";
import { db, fail, newId, type AppEnv } from "../lib/http";
import { presignGet, presignPut } from "../lib/r2";
import { parseJson, toLibraryItem, type SourceMeta } from "./serialize";

export const library = new Hono<AppEnv>();

const MEDIA_KINDS: SourceKind[] = ["audio", "video", "recording"];
const EXT_KIND: Record<string, SourceKind> = {
  pdf: "pdf",
  docx: "docx",
  pptx: "slides",
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  mp3: "audio",
  m4a: "audio",
  wav: "audio",
  ogg: "audio",
  flac: "audio",
  aac: "audio",
  mp4: "video",
  mov: "video",
  webm: "video",
};

function kindOf(contentType: string, filename: string): SourceKind | null {
  for (const [kind, types] of Object.entries(SUPPORTED_UPLOADS)) if (types.includes(contentType)) return kind as SourceKind;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_KIND[ext] ?? null;
}

async function ownedSource(userId: string, sourceId: string) {
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

/* ───────────── Uploads ───────────── */

library.post("/uploads", async (c) => {
  const user = c.get("user");
  const body = z
    .object({ filename: z.string().min(1).max(200), contentType: z.string().max(120), size: z.number().int().positive() })
    .parse(await c.req.json());
  await requireCredits(user.id);
  const kind = kindOf(body.contentType, body.filename);
  if (!kind) throw fail(415, "UNSUPPORTED_FILE", "That file type isn't supported yet. Try PDF, Word, PowerPoint, an image, or audio/video.");
  const max = MEDIA_KINDS.includes(kind) ? UPLOAD_LIMITS.maxMediaBytes : UPLOAD_LIMITS.maxUploadBytes;
  if (body.size > max)
    throw fail(
      413,
      "FILE_TOO_LARGE",
      MEDIA_KINDS.includes(kind) ? "Audio and video files over 25 MB aren't supported yet." : `Files can be up to ${UPLOAD_LIMITS.maxUploadBytes / 1024 / 1024} MB.`,
    );
  const id = newId();
  const safe = body.filename.replace(/[^\w.\- ]+/g, "_").slice(-120);
  const key = `uploads/${user.id}/${id}/${safe}`;
  const contentType = body.contentType || "application/octet-stream";
  await db.insert(uploads).values({ id, userId: user.id, r2Key: key, filename: body.filename, contentType, size: body.size });
  const url = await presignPut(key, contentType);
  return c.json({ uploadId: id, url, headers: { "Content-Type": contentType }, expiresAt: Date.now() + 3600_000 }, 201);
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

library.post("/sources", async (c) => {
  const user = c.get("user");
  const body = createSchema.parse(await c.req.json());
  await requireCredits(user.id);
  const id = newId();
  let kind: SourceKind;
  let sourceRef: string | null;
  let title: string | null = null;
  let meta: SourceMeta;

  if (body.source.type === "upload") {
    const [up] = await db.select().from(uploads).where(and(eq(uploads.id, body.source.uploadId), eq(uploads.userId, user.id)));
    if (!up) throw fail(404, "UPLOAD_NOT_FOUND", "That upload wasn't found. Upload the file again.");
    const head = await env.BUCKET.head(up.r2Key);
    if (!head) throw fail(409, "UPLOAD_INCOMPLETE", "The file didn't finish uploading. Try again.");
    kind = body.source.recording ? "recording" : kindOf(up.contentType, up.filename)!;
    sourceRef = up.r2Key;
    meta = { label: up.filename, mime: up.contentType, filename: up.filename, size: head.size };
  } else if (body.source.type === "text") {
    kind = "text";
    sourceRef = `text/${user.id}/${id}.txt`;
    await env.BUCKET.put(sourceRef, body.source.text, { httpMetadata: { contentType: "text/plain; charset=utf-8" } });
    title = body.source.title?.trim() || null;
    meta = { label: "Pasted text", size: body.source.text.length };
  } else {
    const u = new URL(body.source.url);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw fail(422, "BAD_URL", "Only http(s) links are supported.");
    if (/(^|\.)(youtube\.com|youtu\.be)$/.test(u.hostname)) throw fail(422, "YOUTUBE_UNSUPPORTED", "YouTube links aren't supported yet.");
    kind = "web";
    sourceRef = u.toString();
    meta = { label: u.hostname.replace(/^www\./, "") };
  }

  const autoOutputs = !body.outputs?.length;
  const outputs = body.outputs?.length ? body.outputs : body.noteType === "auto" ? [] : noteTypeDef(body.noteType).defaults;
  const now = Date.now();
  await db.batch([
    db.insert(sources).values({ id, kind, ownerUserId: user.id, sourceRef, title, metaJson: JSON.stringify(meta), status: "queued", createdAt: now, updatedAt: now }),
    db.insert(userSources).values({
      userId: user.id,
      sourceId: id,
      noteType: body.noteType,
      selectedOutputsJson: JSON.stringify(outputs),
      language: body.language ?? "auto",
      instructions: body.instructions?.trim() || null,
      addedAt: now,
    }),
  ]);
  await env.PROCESS_SOURCE.create({ id, params: { sourceId: id, userId: user.id, autoOutputs } });
  const { src, us } = await ownedSource(user.id, id);
  return c.json({ item: toLibraryItem(src, us) }, 201);
});

/* ───────────── Item workspace ───────────── */

library.get("/sources/:id", async (c) => {
  const user = c.get("user");
  const { src, us } = await ownedSource(user.id, c.req.param("id"));
  const due = await dueCounts(user.id, [src.id]);

  const obj = src.contentR2Key ? await env.BUCKET.get(src.contentR2Key) : null;
  const content = obj ? await obj.json<ExtractedContent>() : null;

  const gens = await db.select().from(generations).where(eq(generations.sourceId, src.id));
  const taskRows = await db.select().from(tasks).where(and(eq(tasks.sourceId, src.id), eq(tasks.userId, user.id))).orderBy(asc(tasks.position));
  const cardRows = await db.select().from(flashcards).where(eq(flashcards.sourceId, src.id)).orderBy(asc(flashcards.position));
  const outputs: Partial<Record<OutputKey, OutputEntry>> = {};
  for (const g of gens) {
    let data = parseJson<OutputData>(g.contentJson);
    // Task ticks live in the tasks table; reflect them (and use its ids) in the output.
    if (data?.type === "tasks")
      data = {
        type: "tasks",
        items: taskRows.map((t) => ({ id: t.id, task: t.task, kind: t.kind as never, due: t.dueDate, anchor: parseJson<Anchor>(t.anchorJson), done: t.status === "done" })),
      };
    // Same for flashcards: use the review ids so a card rated here is the card in Review.
    const cards = cardRows.filter((r) => r.generationId === g.id);
    if (data?.type === "flashcards" && cards.length)
      data = { type: "flashcards", cards: cards.map((r) => ({ id: r.id, front: r.front, back: r.back, topic: r.topic, anchor: parseJson<Anchor>(r.anchorJson) })) };
    outputs[g.outputType as OutputKey] = { key: g.outputType as OutputKey, status: g.status as OutputEntry["status"], data, error: g.error ?? undefined };
  }

  const uploaded = src.sourceRef?.startsWith("uploads/");
  const meta = parseJson<SourceMeta>(src.metaJson) ?? {};
  const chat = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, user.id), eq(chatMessages.sourceId, src.id)))
    .orderBy(asc(chatMessages.createdAt));

  await db.update(userSources).set({ lastOpenedAt: Date.now() }).where(and(eq(userSources.userId, user.id), eq(userSources.sourceId, src.id)));

  const body: ItemDetail = {
    item: toLibraryItem(src, us, due.get(src.id) ?? 0),
    content: content ? { kind: content.kind, segments: content.segments } : null,
    outputs,
    mediaUrl: uploaded && src.sourceRef ? await presignGet(src.sourceRef) : null,
    mediaType: uploaded ? (meta.mime ?? null) : null,
    chat: chat.map(toChatMessage),
  };
  return c.json(body);
});

library.patch("/sources/:id", async (c) => {
  const user = c.get("user");
  const { src } = await ownedSource(user.id, c.req.param("id"));
  const body = z.object({ title: z.string().trim().min(1).max(200).optional(), folderId: z.string().nullable().optional() }).parse(await c.req.json());
  if (body.folderId) {
    const [f] = await db.select().from(folders).where(and(eq(folders.id, body.folderId), eq(folders.userId, user.id)));
    if (!f) throw fail(404, "FOLDER_NOT_FOUND", "That folder doesn't exist.");
  }
  await db
    .update(userSources)
    .set({ ...(body.title !== undefined && { titleOverride: body.title }), ...(body.folderId !== undefined && { folderId: body.folderId }) })
    .where(and(eq(userSources.userId, user.id), eq(userSources.sourceId, src.id)));
  const row = await ownedSource(user.id, src.id);
  return c.json({ item: toLibraryItem(row.src, row.us) });
});

library.delete("/sources/:id", async (c) => {
  const user = c.get("user");
  const { src } = await ownedSource(user.id, c.req.param("id"));
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
  // Processing that hasn't moved in 15 minutes is stuck (e.g. the dev server restarted mid-run), so allow a retry.
  const stale = Date.now() - src.updatedAt > 15 * 60_000;
  if (src.status !== "failed" && src.status !== "ready" && !stale) throw fail(409, "BUSY", "This note is still being processed.");
  // A retry only charges for what isn't already paid for (the workflow checks the balance), but it needs a plan.
  const bill = await billingFor(user.id);
  if (!bill.canUse) throw fail(402, "NO_PLAN", blockReason(bill)!.message);
  await db.delete(generations).where(and(eq(generations.sourceId, src.id), inArray(generations.status, ["failed", "queued", "running"])));
  await db.update(sources).set({ status: "queued", progress: 0, error: null, updatedAt: Date.now() }).where(eq(sources.id, src.id));
  await env.PROCESS_SOURCE.create({ id: `${src.id}-${Date.now()}`, params: { sourceId: src.id, userId: user.id, autoOutputs: us.noteType === "auto" } });
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

library.post("/sources/:id/chat", async (c) => {
  const user = c.get("user");
  const { src, us } = await ownedSource(user.id, c.req.param("id"));
  const { message } = z.object({ message: z.string().trim().min(1).max(4000) }).parse(await c.req.json());
  if (!src.contentR2Key) throw fail(409, "NOT_READY", "This note is still being processed.");

  if (!(await canChat(user.id))) {
    const blocked = blockReason(await billingFor(user.id));
    throw fail(402, blocked?.code ?? "NO_CREDITS", blocked?.message ?? "You've used this cycle's chat messages and have no credits left. Upgrade in Plan & billing.");
  }

  const content = await (await env.BUCKET.get(src.contentR2Key))!.json<ExtractedContent>();
  const history = (
    await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.userId, user.id), eq(chatMessages.sourceId, src.id)))
      .orderBy(desc(chatMessages.createdAt))
      .limit(12)
  ).reverse();
  const convo = history.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n");

  const { data } = await llmJSON({
    model: env.MODEL_CHAT,
    system: CHAT_PROMPT((us.noteType === "auto" ? "general" : us.noteType) as NoteTypeKey),
    user: `CONTENT:\n${renderForPrompt(content).slice(0, 300_000)}\n\n${convo ? `CONVERSATION SO FAR:\n${convo}\n\n` : ""}QUESTION: ${message}`,
    schema: chatSchema(anchorKind(content)),
    maxTokens: 4000,
    reasoning: "off",
  });

  const now = Date.now();
  const userMsg = { id: newId(), userId: user.id, sourceId: src.id, role: "user", content: message, citationsJson: null, createdAt: now };
  const reply = {
    id: newId(),
    userId: user.id,
    sourceId: src.id,
    role: "assistant",
    content: data.answer,
    citationsJson: JSON.stringify(data.citations.map((v) => toAnchor(anchorKind(content), v)).filter(Boolean)),
    createdAt: now + 1,
  };
  await db.insert(chatMessages).values([userMsg, reply]);
  await consumeChat(user.id);
  return c.json({ message: toChatMessage(reply) });
});
