import { useCallback, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useFocusEffect, useIsFocused } from "expo-router";
import { QueryClient, focusManager, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  // Item actions (item screen / Tasks tab)
  EditOutputResponse,
  ItemResponse,
  LibraryItem,
  NoteTypeKey,
  OutputData,
  ShareResponse,
  UpdateTaskRequest,
  // Folders, settings, stats, credits (library / add flow / profile)
  CreditHistoryResponse,
  Folder,
  ReviewRequest,
  SettingsResponse,
  StatsResponse,
  UpdateSourceRequest,
  UserSettings,
} from "@a2n/shared";
import { ApiError, api } from "./api";
import { streamChat } from "./chat-stream";

/** Processing runs in a Cloudflare Workflow; lists and items re-poll at this pace while it does. */
const POLL_MS = 3000;

/** The cache is saved on the device (offline.ts); what's in it stays usable offline for this long. */
export const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    // gcTime matches the saved cache's age, so restored queries aren't garbage-collected straight away.
    queries: { staleTime: 10_000, retry: 1, gcTime: CACHE_MAX_AGE },
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
  settings: ["settings"] as const,
  stats: ["stats"] as const,
  credits: ["billing", "credits"] as const,
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
    // Queued while offline and replayed later (see the offline block at the end of this file).
    mutationKey: mutationKeys.toggleTask,
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
    // Queued while offline and replayed later (see the offline block at the end of this file).
    mutationKey: mutationKeys.rate,
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

/* ───────────── Item actions: outputs, note type, sharing, streamed chat, task edits ─────────────
 * Owned by the item screen and the Tasks tab. Every output action answers `{ item }` and the work
 * runs in the background, so the touched outputs are marked queued in the cache straight away:
 * `useItem` then keeps polling until they're written, exactly as after creating an item. */

type Entry = NonNullable<ItemDetail["outputs"][OutputKey]>;

/** Folds an action's `{ item }` into the cached detail; `pending` outputs show as queued (keeping any old text). */
function applyItem(qc: QueryClient, item: LibraryItem, pending: OutputKey[] = []) {
  qc.setQueryData<ItemDetail>(keys.item(item.id), (old) => {
    if (!old) return old;
    const outputs = { ...old.outputs };
    for (const k of pending) outputs[k] = { ...outputs[k], key: k, status: "queued", error: undefined } satisfies Entry;
    return { ...old, item, outputs };
  });
  void qc.invalidateQueries({ queryKey: keys.item(item.id) });
  void qc.invalidateQueries({ queryKey: keys.library });
}

/** Outputs feed the Tasks tab and the review queue, which change when those outputs do. */
function invalidateDerived(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: keys.tasks });
  void qc.invalidateQueries({ queryKey: keys.due });
}

/** A fresh version of one output for this user (it becomes their own copy), optionally steered. */
export function useRegenerateOutput(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ output, instructions }: { output: OutputKey; instructions?: string }) =>
      api<ItemResponse>("POST", `/sources/${itemId}/outputs/${output}/regenerate`, instructions ? { instructions } : {}),
    onSuccess: ({ item }, { output }) => {
      applyItem(qc, item, [output]);
      invalidateDerived(qc);
    },
  });
}

/** Saves a manual edit as this user's own copy of the output. */
export function useEditOutput(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ output, data }: { output: OutputKey; data: OutputData }) =>
      api<EditOutputResponse>("PATCH", `/sources/${itemId}/outputs/${output}`, { data }),
    onSuccess: ({ output: entry }, { output }) => {
      qc.setQueryData<ItemDetail>(keys.item(itemId), (old) => (old ? { ...old, outputs: { ...old.outputs, [output]: entry } } : old));
      void qc.invalidateQueries({ queryKey: keys.item(itemId) });
      // Edited flashcards restart their schedule, which moves the item's due count.
      void qc.invalidateQueries({ queryKey: keys.library });
      invalidateDerived(qc);
    },
  });
}

/** Drops this user's copy of an output and goes back to the shared one. */
export function useResetOutput(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (output: OutputKey) => api<ItemResponse>("DELETE", `/sources/${itemId}/outputs/${output}/custom`),
    onSuccess: ({ item }) => {
      applyItem(qc, item);
      invalidateDerived(qc);
    },
  });
}

/** Generates outputs the item doesn't have yet (free: credits are per minute/page). */
export function useAddOutputs(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (outputs: OutputKey[]) => api<ItemResponse>("POST", `/sources/${itemId}/outputs`, { outputs }),
    onSuccess: ({ item }, outputs) => {
      applyItem(qc, item, outputs);
      invalidateDerived(qc);
    },
  });
}

/** Switches the note type: the item takes that type's default outputs and the missing ones are written. */
export function useChangeNoteType(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteType: NoteTypeKey) => api<ItemResponse>("PATCH", `/sources/${itemId}`, { noteType }),
    onSuccess: ({ item }) => {
      const have = qc.getQueryData<ItemDetail>(keys.item(itemId))?.outputs ?? {};
      applyItem(
        qc,
        item,
        item.outputs.filter((k) => !have[k]),
      );
      invalidateDerived(qc);
    },
  });
}

/** Creates (or returns the existing) read-only link to the item's outputs. */
export function useShareItem(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<ShareResponse>("POST", `/sources/${itemId}/share`),
    onSuccess: ({ share }) => qc.setQueryData<ItemDetail>(keys.item(itemId), (old) => (old ? { ...old, share } : old)),
  });
}

export function useStopSharing(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>("DELETE", `/sources/${itemId}/share`),
    onSuccess: () => qc.setQueryData<ItemDetail>(keys.item(itemId), (old) => (old ? { ...old, share: null } : old)),
  });
}

/**
 * Chat with the answer streamed in (`onDelta` gets each piece of text). On success both turns
 * go into the cache, as `useSendChat` does.
 */
export function useStreamChat(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ message, onDelta }: { message: string; onDelta: (text: string) => void }) => streamChat(itemId, message, onDelta),
    onSuccess: (message, { message: question }) => {
      const asked = { id: `asked-${message.id}`, role: "user" as const, content: question.trim(), citations: [], createdAt: message.createdAt };
      qc.setQueryData<ItemDetail>(keys.item(itemId), (old) => (old ? { ...old, chat: [...old.chat, asked, message] } : old));
      void qc.invalidateQueries({ queryKey: keys.item(itemId) });
      void qc.invalidateQueries({ queryKey: keys.me });
    },
  });
}

/** Applies a task patch to every tasks output in an item. */
function patchTaskIn(d: ItemDetail, id: string, patch: Partial<Task>): ItemDetail {
  const outputs = { ...d.outputs };
  for (const [k, o] of Object.entries(outputs) as [OutputKey, Entry][]) {
    if (o.data?.type === "tasks") outputs[k] = { ...o, data: { type: "tasks", items: o.data.items.map((t) => (t.id === id ? { ...t, ...patch } : t)) } };
  }
  return { ...d, outputs };
}

/**
 * Edits a task's text, kind and/or due date (`PATCH /tasks/:id`, any subset). Optimistic in the
 * Tasks tab and in the item's tasks output, rolled back if the API refuses. A plain mutation, so it
 * can be wrapped for offline queuing like `useToggleTask`.
 */
export function useEditTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTaskRequest; itemId?: string }) => api<unknown>("PATCH", `/tasks/${id}`, patch),
    onMutate: async ({ id, patch, itemId }) => {
      await qc.cancelQueries({ queryKey: keys.tasks });
      if (itemId) await qc.cancelQueries({ queryKey: keys.item(itemId) });
      const prevTasks = qc.getQueryData<TasksResponse>(keys.tasks);
      qc.setQueryData<TasksResponse>(keys.tasks, (old) => (old ? { tasks: old.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) } : old));
      const prevItem = itemId ? qc.getQueryData<ItemDetail>(keys.item(itemId)) : undefined;
      if (itemId) qc.setQueryData<ItemDetail>(keys.item(itemId), (old) => (old ? patchTaskIn(old, id, patch) : old));
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

/* ───────────── Offline queue, folders, settings, stats & credits (library / add flow / profile) ─────────────
 * Ratings and task ticks made offline wait as paused mutations (saved with the cache, see
 * offline.ts) and are sent in order once the device is back online. Their defaults live here so a
 * queue restored after an app restart still knows how to send them. */

export const mutationKeys = {
  rate: ["reviews", "rate"] as const,
  toggleTask: ["tasks", "toggle"] as const,
};

/** A dropped connection is worth another go (the queue also waits for the network); an API refusal isn't. */
const retryNetwork = (n: number, e: unknown) => n < 3 && e instanceof ApiError && e.status === 0;

queryClient.setMutationDefaults(mutationKeys.rate, {
  mutationFn: ({ cardId, rating }: ReviewRequest) => api<ReviewResponse>("POST", "/reviews", { cardId, rating } satisfies ReviewRequest),
  retry: retryNetwork,
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: keys.me });
    void queryClient.invalidateQueries({ queryKey: keys.library });
    void queryClient.invalidateQueries({ queryKey: keys.stats });
  },
});

queryClient.setMutationDefaults(mutationKeys.toggleTask, {
  mutationFn: ({ id, done }: { id: string; done: boolean }) => api<unknown>("PATCH", `/tasks/${id}`, { done } satisfies UpdateTaskRequest),
  retry: retryNetwork,
  onSettled: () => void queryClient.invalidateQueries({ queryKey: keys.tasks }),
});

/* Folders */

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api<{ folder: Folder }>("POST", "/folders", { name }),
    onSuccess: ({ folder }) => {
      qc.setQueryData<LibraryResponse>(keys.library, (old) => (old ? { ...old, folders: [...old.folders, folder] } : old));
      void qc.invalidateQueries({ queryKey: keys.library });
    },
  });
}

/** Deletes the folder; its items stay in the library, just without a folder. */
export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>("DELETE", `/folders/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: keys.library });
      const prev = qc.getQueryData<LibraryResponse>(keys.library);
      qc.setQueryData<LibraryResponse>(keys.library, (old) =>
        old
          ? { folders: old.folders.filter((f) => f.id !== id), items: old.items.map((i) => (i.folderId === id ? { ...i, folderId: null } : i)) }
          : old,
      );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.library, ctx.prev);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: keys.library }),
  });
}

/** Files an item into a folder (or takes it out with `null`). */
export function useMoveToFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) => api<ItemResponse>("PATCH", `/sources/${id}`, { folderId } satisfies UpdateSourceRequest),
    onMutate: async ({ id, folderId }) => {
      await qc.cancelQueries({ queryKey: keys.library });
      const prev = qc.getQueryData<LibraryResponse>(keys.library);
      qc.setQueryData<LibraryResponse>(keys.library, (old) => (old ? { ...old, items: old.items.map((i) => (i.id === id ? { ...i, folderId } : i)) } : old));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.library, ctx.prev);
    },
    onSettled: (_d, _e, { id }) => {
      void qc.invalidateQueries({ queryKey: keys.library });
      void qc.invalidateQueries({ queryKey: keys.item(id) });
    },
  });
}

/* Settings (synced across devices) */

export function useSettings(enabled = true) {
  return useQuery({
    queryKey: keys.settings,
    queryFn: () => api<SettingsResponse>("GET", "/settings").then((r) => r.settings),
    enabled,
    staleTime: 60_000,
  });
}

/** Saves any subset of the settings, showing the change straight away (rolled back if refused). */
export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<UserSettings>) => api<SettingsResponse>("PATCH", "/settings", patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: keys.settings });
      const prev = qc.getQueryData<UserSettings>(keys.settings);
      if (prev) qc.setQueryData<UserSettings>(keys.settings, { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.settings, ctx.prev);
    },
    onSuccess: ({ settings }) => qc.setQueryData(keys.settings, settings),
  });
}

/* Stats & credits */

export function useStats() {
  const q = useQuery({ queryKey: keys.stats, queryFn: () => api<StatsResponse>("GET", "/stats") });
  useRefreshOnFocus(q.refetch);
  return q;
}

/** Credit history, newest first, 50 entries a page. */
export function useCreditHistory() {
  return useInfiniteQuery({
    queryKey: keys.credits,
    queryFn: ({ pageParam }) => api<CreditHistoryResponse>("GET", `/billing/credits${pageParam ? `?before=${pageParam}` : ""}`),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.next,
  });
}
