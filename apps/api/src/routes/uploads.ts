import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { UPLOAD_LIMITS, SUPPORTED_UPLOADS, type CreateUploadResponse, type SourceKind } from "@a2n/shared";
import { billingFor, blockReason } from "../billing/credits";
import { uploads } from "../db/schema";
import { db, fail, newId, type AppEnv } from "../lib/http";
import { completeMultipart, createMultipart, presignPart, presignPut } from "../lib/r2";
import type { SourceMeta } from "./serialize";

export const uploadRoutes = new Hono<AppEnv>();

export const MEDIA_KINDS: SourceKind[] = ["audio", "video", "recording"];
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

export function kindOf(contentType: string, filename: string): SourceKind | null {
  for (const [kind, types] of Object.entries(SUPPORTED_UPLOADS)) if (types.includes(contentType)) return kind as SourceKind;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_KIND[ext] ?? null;
}

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;
const tooLarge = (media: boolean) =>
  fail(413, "FILE_TOO_LARGE", media ? `Audio and video files can be up to ${UPLOAD_LIMITS.maxMediaBytes / GB} GB.` : `Files can be up to ${UPLOAD_LIMITS.maxUploadBytes / MB} MB.`);

/** Parts are 10 MB (R2 needs equal parts of at least 5 MB, and at most 10,000 of them). */
const partBytesFor = (size: number) => Math.max(10 * MB, Math.ceil(size / 10_000 / MB) * MB);
/** Long enough to send a 2 GB recording over a slow connection. */
const MULTIPART_EXPIRES_SEC = 6 * 3600;

/*
 * POST /uploads (CreateUploadResponse): a presigned PUT for small files, or an R2 multipart
 * upload with one presigned URL per part for files over UPLOAD_LIMITS.multipartThresholdBytes.
 */
uploadRoutes.post("/uploads", async (c) => {
  const user = c.get("user");
  const body = z
    .object({ filename: z.string().min(1).max(200), contentType: z.string().max(120), size: z.number().int().positive() })
    .parse(await c.req.json());
  const blocked = blockReason(await billingFor(user.id));
  if (blocked) throw fail(402, blocked.code, blocked.message);
  const kind = kindOf(body.contentType, body.filename);
  if (!kind) throw fail(415, "UNSUPPORTED_FILE", "That file type isn't supported yet. Try PDF, Word, PowerPoint, an image, or audio/video.");
  const media = MEDIA_KINDS.includes(kind);
  if (body.size > (media ? UPLOAD_LIMITS.maxMediaBytes : UPLOAD_LIMITS.maxUploadBytes)) throw tooLarge(media);
  const id = newId();
  const safe = body.filename.replace(/[^\w.\- ]+/g, "_").slice(-120);
  const key = `uploads/${user.id}/${id}/${safe}`;
  const contentType = body.contentType || "application/octet-stream";
  const row = { id, userId: user.id, r2Key: key, filename: body.filename, contentType, size: body.size };

  if (body.size <= UPLOAD_LIMITS.multipartThresholdBytes) {
    await db.insert(uploads).values(row);
    const url = await presignPut(key, contentType);
    return c.json({ uploadId: id, mode: "single", url, headers: { "Content-Type": contentType }, expiresAt: Date.now() + 3600_000 } satisfies CreateUploadResponse, 201);
  }

  const multipartId = await createMultipart(key, contentType);
  await db.insert(uploads).values({ ...row, multipartId });
  const partBytes = partBytesFor(body.size);
  const count = Math.ceil(body.size / partBytes);
  const parts = await Promise.all(
    Array.from({ length: count }, async (_, i) => ({ number: i + 1, url: await presignPart(key, multipartId, i + 1, MULTIPART_EXPIRES_SEC) })),
  );
  return c.json({ uploadId: id, mode: "multipart", partBytes, parts, expiresAt: Date.now() + MULTIPART_EXPIRES_SEC * 1000 } satisfies CreateUploadResponse, 201);
});

/** POST /uploads/:id/complete (CompleteUploadRequest): joins a multipart upload's parts. Safe to call again. */
uploadRoutes.post("/uploads/:id/complete", async (c) => {
  const user = c.get("user");
  const [up] = await db.select().from(uploads).where(and(eq(uploads.id, c.req.param("id")), eq(uploads.userId, user.id)));
  if (!up) throw fail(404, "UPLOAD_NOT_FOUND", "That upload wasn't found. Upload the file again.");
  if (!up.multipartId) throw fail(409, "NOT_MULTIPART", "This file was uploaded in one piece, so there's nothing to complete.");
  if (up.completedAt) return c.json({ ok: true });

  const { parts } = z
    .object({ parts: z.array(z.object({ number: z.number().int().min(1).max(10_000), etag: z.string().min(1).max(200) })).min(1).max(10_000) })
    .parse(await c.req.json());
  const sorted = [...parts].sort((a, b) => a.number - b.number);
  const expected = Math.ceil(up.size / partBytesFor(up.size));
  if (sorted.length !== expected || sorted.some((p, i) => p.number !== i + 1))
    throw fail(400, "PARTS_MISMATCH", `Expected ${expected} parts numbered 1 to ${expected}. Upload any missing parts, then try again.`);

  try {
    await completeMultipart(up.r2Key, up.multipartId, sorted);
  } catch (e) {
    // A repeated call after a dropped response finds the upload already joined.
    const done = await env.BUCKET.head(up.r2Key);
    if (!done || done.size !== up.size) {
      console.warn("[uploads] complete failed", up.id, e);
      throw fail(409, "UPLOAD_INCOMPLETE", "Some parts of the file didn't upload correctly. Upload the file again.");
    }
  }
  const head = await env.BUCKET.head(up.r2Key);
  if (!head || head.size !== up.size) {
    await env.BUCKET.delete(up.r2Key);
    throw fail(422, "UPLOAD_SIZE_MISMATCH", "The uploaded file doesn't match the one you picked. Upload it again.");
  }
  await db.update(uploads).set({ completedAt: Date.now() }).where(eq(uploads.id, up.id));
  return c.json({ ok: true });
});

/** The source fields for one of the user's finished uploads (POST /sources with `type: "upload"`). */
export async function sourceFromUpload(userId: string, uploadId: string, recording?: boolean): Promise<{ kind: SourceKind; sourceRef: string; meta: SourceMeta }> {
  const [up] = await db.select().from(uploads).where(and(eq(uploads.id, uploadId), eq(uploads.userId, userId)));
  if (!up) throw fail(404, "UPLOAD_NOT_FOUND", "That upload wasn't found. Upload the file again.");
  if (up.multipartId && !up.completedAt) throw fail(409, "UPLOAD_INCOMPLETE", "The file hasn't finished uploading. Finish the upload, then try again.");
  const head = await env.BUCKET.head(up.r2Key);
  if (!head) throw fail(409, "UPLOAD_INCOMPLETE", "The file didn't finish uploading. Try again.");
  const kind = recording ? "recording" : kindOf(up.contentType, up.filename)!;
  // A presigned PUT doesn't pin the size, so check what actually arrived.
  const media = MEDIA_KINDS.includes(kind);
  if (head.size > (media ? UPLOAD_LIMITS.maxMediaBytes : UPLOAD_LIMITS.maxUploadBytes)) {
    await env.BUCKET.delete(up.r2Key);
    throw tooLarge(media);
  }
  return { kind, sourceRef: up.r2Key, meta: { label: up.filename, mime: up.contentType, filename: up.filename, size: head.size } };
}
