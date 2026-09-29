"use client";

/**
 * React Query hooks over `api`. Anything still being processed is polled every 3 s until it
 * settles; everything else refetches on focus.
 */

import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ItemDetail, LibraryItem } from "@a2n/shared";
import { api, ApiError } from "./api";

export const POLL_MS = 3000;

export const keys = {
  me: ["me"] as const,
  stats: ["stats"] as const,
  library: ["library"] as const,
  item: (id: string) => ["item", id] as const,
  tasks: ["tasks"] as const,
  due: ["reviews", "due"] as const,
};

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        // 4xx won't fix itself on a retry; network blips might.
        retry: (count, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && count < 2,
      },
    },
  });
}

export const isWorking = (item: Pick<LibraryItem, "status">) => item.status.state === "queued" || item.status.state === "processing";

/** Item still moving: processing, or some output still queued/running. */
export function detailWorking(d: ItemDetail): boolean {
  return isWorking(d.item) || Object.values(d.outputs).some((o) => o?.status === "queued" || o?.status === "running");
}

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: api.me });
}

export function useStats() {
  return useQuery({ queryKey: keys.stats, queryFn: api.stats });
}

export function useLibrary() {
  return useQuery({
    queryKey: keys.library,
    queryFn: api.library,
    refetchInterval: (q) => (q.state.data?.items.some(isWorking) ? POLL_MS : false),
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: keys.item(id),
    queryFn: () => api.source(id),
    refetchInterval: (q) => (q.state.data && detailWorking(q.state.data) ? POLL_MS : false),
  });
}

export function useTasks() {
  return useQuery({ queryKey: keys.tasks, queryFn: api.tasks });
}

/** Due cards for a review session. Not refetched in the background so the queue doesn't reshuffle mid-session. */
export function useDueCards() {
  return useQuery({ queryKey: keys.due, queryFn: api.dueCards, staleTime: 0, refetchOnWindowFocus: false });
}

/** Cards due now across the library (badges, header). */
export function useDueCount(): number {
  const { data } = useLibrary();
  return data?.items.reduce((n, i) => n + i.flashcardsDue, 0) ?? 0;
}

/** Invalidate everything an item change can touch. */
export function useInvalidate() {
  const qc = useQueryClient();
  return (...ks: (readonly unknown[])[]) => Promise.all(ks.map((k) => qc.invalidateQueries({ queryKey: k })));
}
