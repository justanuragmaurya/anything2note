import { useSyncExternalStore } from "react";
import { ALL_ACTIONS } from "./mock/items";
import type { ActionItem } from "./mock/types";

/**
 * Tiny shared store for action-item ticks so the Actions tab and the item screen stay in
 * sync. Mock only; will become an offline-first expo-sqlite table synced to the API.
 */
let state: ActionItem[] = ALL_ACTIONS.map((a) => ({ ...a }));
const listeners = new Set<() => void>();

export const actionsStore = {
  toggle(id: string) {
    state = state.map((a) => (a.id === id ? { ...a, done: !a.done } : a));
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => state,
};

export function useActions(): ActionItem[] {
  return useSyncExternalStore(actionsStore.subscribe, actionsStore.get, actionsStore.get);
}
