import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Network from "expo-network";
import { onlineManager, useIsMutating } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { clearDraft } from "./draft";
import { CACHE_MAX_AGE, queryClient } from "./queries";
import { Storage } from "./storage";

/*
 * Light offline support: the query cache is saved on the device, so the library, items, tasks
 * and due cards open without a connection, and ratings / task ticks made offline wait as paused
 * mutations (saved with it) until the network is back. Signing out wipes all of it.
 */

const reachable = (s: Network.NetworkState) => s.isConnected !== false && s.isInternetReachable !== false;

// React Query assumes it's always online on native; expo-network tells it when it isn't.
if (Platform.OS !== "web") {
  onlineManager.setEventListener((setOnline) => {
    Network.getNetworkStateAsync()
      .then((s) => setOnline(reachable(s)))
      .catch(() => {});
    const sub = Network.addNetworkStateListener((s) => setOnline(reachable(s)));
    return () => sub.remove();
  });
}

/** Query roots worth opening offline. Others (credit history…) are fetched fresh. */
const SAVED = new Set(["library", "item", "tasks", "reviews", "me", "settings", "stats"]);

const persister = createAsyncStoragePersister({
  storage: Storage,
  key: "anything2note_query_cache",
  throttleTime: 1000,
  // Signed media URLs are short-lived and grant access to the file: never written to disk.
  serialize: (client) => JSON.stringify(client, (key, value: unknown) => (key === "mediaUrl" ? null : value)),
});

export const persistOptions: Parameters<typeof PersistQueryClientProvider>[0]["persistOptions"] = {
  persister,
  maxAge: CACHE_MAX_AGE,
  // A new app version may read data differently; start its cache fresh.
  buster: Constants.expoConfig?.version ?? "1",
  dehydrateOptions: {
    shouldDehydrateQuery: (q) => q.state.status === "success" && SAVED.has(String(q.queryKey[0])),
    // Mutations: only paused ones (React Query's default), which is exactly the offline queue.
  },
};

/** Once the saved cache is back, send whatever was queued before the app last closed. */
export const onCacheRestored = () => void queryClient.resumePausedMutations();

/** Everything this account left on the device: cached data, the offline queue and the draft. */
export async function clearLocalData() {
  queryClient.getMutationCache().clear();
  queryClient.clear();
  clearDraft();
  try {
    await persister.removeClient();
  } catch {}
}

const getOnline = () => onlineManager.isOnline();

export const useOnline = () => useSyncExternalStore((cb) => onlineManager.subscribe(cb), getOnline, getOnline);

/** Changes waiting for the network (ratings, task ticks). */
export const useQueuedChanges = () => useIsMutating({ predicate: (m) => m.state.isPaused });
