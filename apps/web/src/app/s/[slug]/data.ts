import { cache } from "react";
import type { SharedItem } from "@a2n/shared";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export type SharedResult = { state: "ok"; item: SharedItem } | { state: "missing" } | { state: "error" };

/**
 * `GET /api/public/shares/:slug` (no session). Not cached, so a link stops working as soon as
 * its owner stops sharing; `cache` dedupes the metadata and page fetches of one request.
 */
export const getShared = cache(async (slug: string): Promise<SharedResult> => {
  if (!/^[\w-]{1,64}$/.test(slug)) return { state: "missing" };
  try {
    const res = await fetch(`${API}/api/public/shares/${encodeURIComponent(slug)}`, { cache: "no-store", headers: { Accept: "application/json" } });
    if (res.status === 404) return { state: "missing" };
    if (!res.ok) return { state: "error" };
    const json = (await res.json()) as SharedItem | { item: SharedItem };
    // The contract says the body is the SharedItem itself; tolerate an `{ item }` wrapper too.
    const item = "item" in json && json.item ? json.item : (json as SharedItem);
    return Array.isArray(item?.outputs) ? { state: "ok", item } : { state: "error" };
  } catch {
    return { state: "error" };
  }
});
