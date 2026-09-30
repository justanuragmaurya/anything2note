import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { sources, uploads } from "../db/schema";
import { db } from "./http";
import { settingsFor } from "./settings";

/*
 * Retention (UserSettings.deleteOriginals): once an item's notes are made, its owner's original
 * upload or pasted text is deleted from R2. The extracted content (content/{id}.json) stays, so
 * notes, chat, exports and new outputs keep working. Shared YouTube sources have no original.
 *
 * `sources.source_ref` is cleared at the same time, so GET /sources/:id returns `mediaUrl: null`
 * for it without any special case (it only signs `uploads/…` refs).
 */
export async function deleteOriginal(userId: string, sourceId: string): Promise<void> {
  const [src] = await db.select().from(sources).where(eq(sources.id, sourceId));
  if (!src || src.visibility !== "private" || src.ownerUserId !== userId) return;
  const ref = src.sourceRef;
  if (!ref || !(ref.startsWith(`uploads/${userId}/`) || ref.startsWith(`text/${userId}/`))) return;
  if (!(await settingsFor(userId)).deleteOriginals) return;
  await env.BUCKET.delete(ref);
  await db.batch([
    db.update(sources).set({ sourceRef: null }).where(eq(sources.id, sourceId)),
    db.delete(uploads).where(and(eq(uploads.userId, userId), eq(uploads.r2Key, ref))),
  ]);
}

/** Shown when a source has to be extracted again but its original was deleted by retention. */
export const ORIGINAL_DELETED = "The original file was deleted after its notes were made (Settings → delete originals), so it can't be processed again. Upload it again.";
