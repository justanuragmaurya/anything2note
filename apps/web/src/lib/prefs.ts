/**
 * Output-language labels, plus the one-time move of the old browser-only defaults to
 * `/api/settings` (UserSettings), which is now where Settings and the add flow read them from.
 */

import type { NoteTypeKey, UserSettings } from "@a2n/shared";
import { NOTE_TYPES } from "./note-types";

export const LANGS = ["Same as source", "English", "Hindi", "Spanish", "French", "German", "Portuguese", "Japanese"];

/** API `language`: "auto" keeps the source's language. */
export const apiLanguage = (label: string) => (label === LANGS[0] ? "auto" : label);

/** The label for an API `language` value. */
export const languageLabel = (lang: string | undefined) => (!lang || lang === "auto" ? LANGS[0]! : lang);

/** LANGS, plus the current value if it was set somewhere else (e.g. the mobile app). */
export const languageOptions = (current: string) => (LANGS.includes(current) ? LANGS : [...LANGS, current]);

const LEGACY_KEY = "a2n.prefs";

export function clearLegacyPrefs() {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* storage can be blocked */
  }
}

/**
 * What the old localStorage prefs should move to the server, or null when there's nothing to move
 * (then the local copy is dropped right away). Only applies while the server still has its
 * defaults, so a choice made on another device wins. Call `clearLegacyPrefs` once the move is saved.
 */
export function legacyPrefs(server: UserSettings): Partial<UserSettings> | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(LEGACY_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  const patch: Partial<UserSettings> = {};
  if (server.defaultNoteType === "auto" && server.language === "auto") {
    try {
      const old = JSON.parse(raw) as { noteType?: unknown; language?: unknown };
      if (typeof old.noteType === "string" && NOTE_TYPES.some((n) => n.key === old.noteType)) patch.defaultNoteType = old.noteType as NoteTypeKey;
      if (typeof old.language === "string" && LANGS.includes(old.language) && old.language !== LANGS[0]) patch.language = old.language;
    } catch {
      /* unreadable: nothing to move */
    }
  }
  if (!Object.keys(patch).length) {
    clearLegacyPrefs();
    return null;
  }
  return patch;
}
