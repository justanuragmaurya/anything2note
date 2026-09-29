import { useCallback, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useFocusEffect, useIsFocused } from "expo-router";
import { QueryClient, focusManager, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChatResponse,
  DueCardsResponse,
  ItemDetail,
  ItemStatus,
  LibraryResponse,
  MeResponse,
  OutputKey,
  QuizAttemptResponse,
  Rating,
  ReviewResponse,
  Task,
  TasksResponse,
} from "@a2n/shared";
import { ApiError, api } from "./api";

/** Processing runs in a Cloudflare Workflow; lists and items re-poll at this pace while it does. */
const POLL_MS = 3000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 1 },
  },
});

// React Query refetches on "window focus"; on native that means the app coming back to the foreground.
if (Platform.OS !== "web") {
  focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener("change", (s) => setFocused(s === "active"));
    return () => sub.remove();
  });
}

export const keys = {
  library: ["library"] as const,
  item: (id: string) => ["item", id] as const,
  tasks: ["tasks"] as const,
  due: ["reviews", "due"] as const,
  me: ["me"] as const,
};

export const isWorking = (s: ItemStatus) => s.state === "queued" || s.state === "processing";

/** Refetch when a screen comes back into focus (tabs stay mounted), skipping the first focus. */
export function useRefreshOnFocus(refetch: () => unknown) {
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      void refetch();
    }, [refetch]),
  );
}

/* ───────────── Library & items ───────────── */

export function useLibrary() {
  const focused = useIsFocused();
  const q = useQuery({
    queryKey: keys.library,
    queryFn: () => api<LibraryResponse>("GET", "/library"),
    refetchInterval: (query) => (query.state.data?.items.some((i) => isWorking(i.status)) ? POLL_MS : false),
    subscribed: focused,
  });
  useRefreshOnFocus(q.refetch);
  return q;
}

/** Still being made: the item itself, or any of its outputs. */
export const itemBusy = (d: ItemDetail) =>
  isWorking(d.item.status) || Object.values(d.outputs).some((o) => o?.status === "queued" || o?.status === "running");

export function useItem(id: string | undefined) {
  const focused = useIsFocused();
  return useQuery({
    queryKey: keys.item(id ?? ""),
    queryFn: () => api<ItemDetail>("GET", `/sources/${id}`),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data && itemBusy(query.state.data) ? POLL_MS : false),
    subscribed: focused,
    // A 404 is an answer (deleted / not yours), not a blip worth retrying.
    retry: (n, e) => n < 1 && !(e instanceof ApiError && e.status === 404),
  });
}

export function useRetryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<unknown>("POST", `/sources/${id}/retry`),
    onSettled: (_d, _e, id) => {
      void qc.invalidateQueries({ queryKey: keys.item(id) });
      void qc.invalidateQueries({ queryKey: keys.library });
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>("DELETE", `/sources/${id}`),
    onSuccess: (_d, id) => {
      qc.setQueryData<LibraryResponse>(keys.library, (old) => (old ? { ...old, items: old.items.filter((i) => i.id !== id) } : old));
      void qc.invalidateQueries({ queryKey: keys.library });
      void qc.invalidateQueries({ queryKey: keys.tasks });
      void qc.invalidateQueries({ queryKey: keys.due });
    },
  });
}

export function useRenameItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => api<unknown>("PATCH", `/sources/${id}`, { title }),
    onSettled: (_d, _e, { id }) => {
      void qc.invalidateQueries({ queryKey: keys.item(id) });
      void qc.invalidateQueries({ queryKey: keys.library });
      void qc.invalidateQueries({ queryKey: keys.tasks });
    },
  });
}

/* ───────────── Chat ───────────── */

export function useSendChat(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => api<ChatResponse>("POST", `/sources/${itemId}/chat`, { message }),
    onSuccess: ({ message }, question) => {
      // Show both turns straight away; the refetch then swaps in the server's copy of the question.
      const asked = { id: `asked-${message.id}`, role: "user" as const, content: question.trim(), citations: [], createdAt: message.createdAt };
      qc.setQueryData<ItemDetail>(keys.item(itemId), (old) => (old ? { ...old, chat: [...old.chat, asked, message] } : old));
      void qc.invalidateQueries({ queryKey: keys.item(itemId) });
      void qc.invalidateQueries({ queryKey: keys.me });
    },
  });
}

/* ───────────── Tasks ───────────── */

export function useTasks() {
  const q = useQuery({ queryKey: keys.tasks, queryFn: () => api<TasksResponse>("GET", "/tasks") });
  useRefreshOnFocus(q.refetch);
  return q;
}

/** Tick a task everywhere it shows (Tasks tab + its item's tasks output), then confirm with the API. */
export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean; itemId?: string }) => api<unknown>("PATCH", `/tasks/${id}`, { done }),
    onMutate: async ({ id, done, itemId }) => {
      await qc.cancelQueries({ queryKey: keys.tasks });
      const prevTasks = qc.getQueryData<TasksResponse>(keys.tasks);
      qc.setQueryData<TasksResponse>(keys.tasks, (old) => (old ? { tasks: old.tasks.map((t) => (t.id === id ? { ...t, done } : t)) } : old));
      const prevItem = itemId ? qc.getQueryData<ItemDetail>(keys.item(itemId)) : undefined;
      if (itemId) qc.setQueryData<ItemDetail>(keys.item(itemId), (old) => (old ? withTask(old, id, done) : old));
      return { prevTasks, prevItem };
    },
    onError: (_e, { itemId }, ctx) => {
      if (ctx?.prevTasks) qc.setQueryData(keys.tasks, ctx.prevTasks);
      if (itemId && ctx?.prevItem) qc.setQueryData(keys.item(itemId), ctx.prevItem);
    },
    onSettled: (_d, _e, { itemId }) => {
      void qc.invalidateQueries({ queryKey: keys.tasks });
      if (itemId) void qc.invalidateQueries({ queryKey: keys.item(itemId) });
    },
  });
}

function withTask(d: ItemDetail, id: string, done: boolean): ItemDetail {
  const outputs = { ...d.outputs };
  for (const [k, o] of Object.entries(outputs) as [OutputKey, NonNullable<ItemDetail["outputs"][OutputKey]>][]) {
    if (o.data?.type === "tasks") outputs[k] = { ...o, data: { type: "tasks", items: o.data.items.map((t: Task) => (t.id === id ? { ...t, done } : t)) } };
  }
  return { ...d, outputs };
}

/* ───────────── Review & quiz ───────────── */

export function useDueCards() {
  const q = useQuery({ queryKey: keys.due, queryFn: () => api<DueCardsResponse>("GET", "/reviews/due") });
  useRefreshOnFocus(q.refetch);
  return q;
}

export function useRateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, rating }: { cardId: string; rating: Rating }) => api<ReviewResponse>("POST", "/reviews", { cardId, rating }),
    onSuccess: () => {
      // Streak and per-item due counts move with every review.
      void qc.invalidateQueries({ queryKey: keys.me });
      void qc.invalidateQueries({ queryKey: keys.library });
    },
  });
}

export function useQuizAttempt() {
  return useMutation({
    mutationFn: (body: { itemId: string; output: OutputKey; answers: number[] }) => api<QuizAttemptResponse>("POST", "/quiz-attempts", body),
  });
}

/* ───────────── Account ───────────── */

export function useMe() {
  const q = useQuery({ queryKey: keys.me, queryFn: () => api<MeResponse>("GET", "/me") });
  useRefreshOnFocus(q.refetch);
  return q;
}
