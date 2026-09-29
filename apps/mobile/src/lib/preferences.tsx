import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import type { NoteTypeKey } from "./note-types";

/**
 * Device-side app state: whether onboarding was seen, and the note defaults used when adding
 * something (both persisted in SecureStore). Who is signed in comes from Better Auth; the plan
 * and usage come from `GET /api/me`.
 */
export type AutoType = NoteTypeKey | "auto";

type Prefs = {
  defaultNoteType: AutoType;
  /** A language name ("English") or "Same as source", sent as `language` when creating items. */
  outputLanguage: string;
};

type Preferences = {
  onboarded: boolean;
  prefs: Prefs;
  finishOnboarding: () => void;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
};

const ONBOARDED_KEY = "anything2note_onboarded";
const PREFS_KEY = "anything2note_prefs";
const DEFAULTS: Prefs = { defaultNoteType: "auto", outputLanguage: "English" };

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

function readPrefs(): Prefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(read(PREFS_KEY) ?? "{}") as Partial<Prefs>) };
  } catch {
    return DEFAULTS;
  }
}

/** The API's `language` field: "auto" means the source's own language. */
export const apiLanguage = (outputLanguage: string) => (outputLanguage === "Same as source" ? "auto" : outputLanguage);

const PreferencesContext = createContext<Preferences | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [onboarded, setOnboarded] = useState(() => read(ONBOARDED_KEY) === "1");
  const [prefs, setPrefs] = useState<Prefs>(readPrefs);

  const value = useMemo<Preferences>(
    () => ({
      onboarded,
      prefs,
      finishOnboarding: () => {
        write(ONBOARDED_KEY, "1");
        setOnboarded(true);
      },
      setPref: (key, v) =>
        setPrefs((p) => {
          const next = { ...p, [key]: v };
          write(PREFS_KEY, JSON.stringify(next));
          return next;
        }),
    }),
    [onboarded, prefs],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Preferences {
  const p = useContext(PreferencesContext);
  if (!p) throw new Error("usePreferences must be used inside <PreferencesProvider>");
  return p;
}
