/**
 * Defaults for new notes, kept in this browser (there's no settings endpoint yet). Settings
 * writes them; the add flow reads them.
 */

import type { NoteTypeKey } from "@a2n/shared";

export type Prefs = { noteType: NoteTypeKey | "auto"; language: string };

export const LANGS = ["Same as source", "English", "Hindi", "Spanish", "French", "German", "Portuguese", "Japanese"];

const KEY = "a2n.prefs";
const DEFAULTS: Prefs = { noteType: "auto", language: LANGS[0]! };

export function readPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>) };
  } catch {
    return DEFAULTS;
  }
}

export function writePrefs(patch: Partial<Prefs>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readPrefs(), ...patch }));
  } catch {
    /* storage can be blocked; the choice just won't stick */
  }
}

/** API `language`: "auto" keeps the source's language. */
export const apiLanguage = (label: string) => (label === LANGS[0] ? "auto" : label);
