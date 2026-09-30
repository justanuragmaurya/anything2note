import Storage from "expo-sqlite/kv-store";

/**
 * On-device key-value storage (SQLite-backed, so there's no AsyncStorage size cap) for things
 * that aren't secrets: the offline query cache, the draft being added. Secrets stay in SecureStore.
 */
export { Storage };

export function readJson<T>(key: string): T | null {
  try {
    const raw = Storage.getItemSync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    Storage.setItemSync(key, JSON.stringify(value));
  } catch {}
}

export function removeKey(key: string) {
  try {
    Storage.removeItemSync(key);
  } catch {}
}
