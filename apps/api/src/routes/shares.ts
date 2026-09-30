import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { NoteTypeKey, ShareResponse, SharedItem } from "@a2n/shared";
import { shares, sources, user, userSources } from "../db/schema";
import { db, fail, type AppEnv } from "../lib/http";
import { ownedSource } from "./library";
import { effectiveGenerations, outputEntries, selectedOutputs, toLibraryItem, toShare } from "./serialize";

/*
 * Read-only links to one user's item: its outputs exactly as that user sees them (their own
 * edits included), ready ones only. The public read needs no session.
 */

export const shareRoutes = new Hono<AppEnv>();
export const publicShares = new Hono();

/** 12 url-safe characters (72 random bits): not guessable, short enough to paste. */
function newSlug() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_");
}

shareRoutes.post("/sources/:id/share", async (c) => {
  const me = c.get("user");
  const { src } = await ownedSource(me.id, c.req.param("id"));
  // One link per user and item: sharing again returns the same one.
  await db.insert(shares).values({ id: newSlug(), userId: me.id, sourceId: src.id }).onConflictDoNothing();
  const [row] = await db.select().from(shares).where(and(eq(shares.userId, me.id), eq(shares.sourceId, src.id)));
  const body: ShareResponse = { share: toShare(row!) };
  return c.json(body);
});

shareRoutes.delete("/sources/:id/share", async (c) => {
  const me = c.get("user");
  const { src } = await ownedSource(me.id, c.req.param("id"));
  await db.delete(shares).where(and(eq(shares.userId, me.id), eq(shares.sourceId, src.id)));
  return c.body(null, 204);
});

publicShares.get("/shares/:slug", async (c) => {
  const [row] = await db
    .select({ src: sources, us: userSources, name: user.name })
    .from(shares)
    // The owner's library entry: gone once they remove the item, and then so is the link.
    .innerJoin(userSources, and(eq(userSources.userId, shares.userId), eq(userSources.sourceId, shares.sourceId)))
    .innerJoin(sources, eq(sources.id, shares.sourceId))
    .innerJoin(user, eq(user.id, shares.userId))
    .where(eq(shares.id, c.req.param("slug")));
  if (!row) throw fail(404, "NOT_FOUND", "This link doesn't exist, or its owner has stopped sharing it.");

  const entries = await outputEntries(row.us, await effectiveGenerations(row.us));
  const item = toLibraryItem(row.src, row.us);
  const body: SharedItem = {
    title: item.title,
    noteType: item.noteType as NoteTypeKey,
    source: item.source,
    sourceLabel: item.sourceLabel,
    sourceUrl: item.sourceUrl,
    youtubeId: item.youtubeId,
    durationSec: item.durationSec,
    pages: item.pages,
    createdAt: item.createdAt,
    sharedBy: row.name.trim().split(/\s+/)[0] || "Someone",
    outputs: selectedOutputs(row.us).flatMap((key) => {
      const e = entries[key];
      return e?.status === "ready" && e.data ? [{ key, data: e.data }] : [];
    }),
  };
  c.header("Cache-Control", "public, max-age=60");
  return c.json(body);
});
