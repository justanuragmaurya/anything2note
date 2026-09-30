import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import type { UserSettings } from "@a2n/shared";
import { authClient } from "./auth-client";
import type { NoteTypeKey } from "./note-types";
import { useSettings, useUpdateSettings } from "./queries";

/**
 * App preferences. Whether onboarding was seen is per device (SecureStore). Everything else is
 * the account's `UserSettings` from `GET /api/settings`, synced across devices (and cached offline
 * with the rest of the query cache). Who is signed in comes from Better Auth; the plan and usage
 * from `GET /api/me`.
 */
export type AutoType = NoteTypeKey | "auto";

/** What the API answers for someone who never changed a setting; shown until the real ones load. */
export const DEFAULT_SETTINGS: UserSettings = {
  defaultNoteType: "auto",
  language: "auto",
  deleteOriginals: false,
  emailNotesReady: true,
  emailReminders: true,
};

/** Output languages in the pickers. The API takes any language name; "auto" = same as the source. */
export const LANGUAGES = ["auto", "English", "Hindi", "Spanish", "French", "German", "Japanese"] as const;
export const languageLabel = (language: string) => (language === "auto" ? "Same as source" : language);
/** The pickers' options, keeping a language set elsewhere (e.g. on the web) that isn't in the list. */
export const languageOptions = (current: string) =>
  [...LANGUAGES, ...((LANGUAGES as readonly string[]).includes(current) ? [] : [current])].map((l) => ({ value: l, label: languageLabel(l) }));

type Preferences = {
  onboarded: boolean;
  finishOnboarding: () => void;
  settings: UserSettings;
  /** The settings came from the API (or its cached copy) rather than the defaults */
  settingsLoaded: boolean;
  /** Saves a change for every device; rejects with a user-facing message if the API refuses. */
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
};

const ONBOARDED_KEY = "anything2note_onboarded";
/** Before settings synced, the note defaults lived only on the device, under this key. */
const LEGACY_PREFS_KEY = "anything2note_prefs";

// SecureStore has no web implementation; there these simply reset per load.
function read(key: string): string | null {
  try {
    return SecureStore.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    SecureStore.setItem(key, value);
  } catch {}
}

function legacyPatch(settings: UserSettings): Partial<UserSettings> | null {
  const raw = read(LEGACY_PREFS_KEY);
  if (!raw) return null;
  try {
    const old = JSON.parse(raw) as { defaultNoteType?: AutoType; outputLanguage?: string };
    const patch: Partial<UserSettings> = {};
    if (old.defaultNoteType && old.defaultNoteType !== settings.defaultNoteType) patch.defaultNoteType = old.defaultNoteType;
    const language = old.outputLanguage === "Same as source" ? "auto" : old.outputLanguage;
    if (language && language !== settings.language) patch.language = language;
    return patch;
  } catch {
    return {};
  }
}

const PreferencesContext = createContext<Preferences | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [onboarded, setOnboarded] = useState(() => read(ONBOARDED_KEY) === "1");
  const { data: session } = authClient.useSession();
  const signedIn = !!session;
  const query = useSettings(signedIn);
  const { mutate, mutateAsync } = useUpdateSettings();
  const migrated = useRef(false);

  // One-time move of the old device-only defaults into the account (only values changed here).
  // Tried once per launch against freshly fetched settings; on failure the next launch tries again.
  const fresh = query.isFetchedAfterMount && query.isSuccess;
  useEffect(() => {
    if (!signedIn || !fresh || !query.data || migrated.current) return;
    const patch = legacyPatch(query.data);
    if (!patch) return;
    migrated.current = true;
    const forget = () => void SecureStore.deleteItemAsync(LEGACY_PREFS_KEY).catch(() => {});
    if (Object.keys(patch).length === 0) forget();
    else mutate(patch, { onSuccess: forget });
  }, [signedIn, fresh, query.data, mutate]);

  const value = useMemo<Preferences>(
    () => ({
      onboarded,
      finishOnboarding: () => {
        write(ONBOARDED_KEY, "1");
        setOnboarded(true);
      },
      settings: query.data ?? DEFAULT_SETTINGS,
      settingsLoaded: !!query.data,
      updateSettings: async (patch) => {
        await mutateAsync(patch);
      },
    }),
    [onboarded, query.data, mutateAsync],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Preferences {
  const p = useContext(PreferencesContext);
  if (!p) throw new Error("usePreferences must be used inside <PreferencesProvider>");
  return p;
}
