import { useSyncExternalStore } from "react";
import type { ShareIntent } from "expo-share-intent";
import { youtubeIdOf } from "@a2n/shared";
import { normaliseUrl, sharedFileDraft, type Draft } from "./draft";

/**
 * Something shared into the app from another app's share sheet (expo-share-intent). It's taken
 * off the native module straight away and held here, so it survives signing in first, then the
 * share screen (app/share.tsx) turns it into a draft for the add flow.
 */
export type IncomingShare =
  | { kind: "url"; url: string; title?: string }
  | { kind: "text"; text: string }
  /** The first file only: the share sheet is set up for one file at a time */
  | { kind: "file"; file: { path: string; fileName: string | null; mimeType: string | null; size: number | null } };

let incoming: IncomingShare | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getIncoming = () => incoming;
export function setIncoming(s: IncomingShare | null) {
  incoming = s;
  emit();
}
export const useIncoming = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getIncoming,
    getIncoming,
  );

/** Text that's just a link (maybe with a few words around it, as YouTube and browsers share) counts as the link. */
const MAX_TEXT_AROUND_LINK = 120;
/** Same minimum as pasting text on the Add tab. */
export const MIN_TEXT = 20;

export function fromShareIntent(si: ShareIntent): IncomingShare | null {
  const file = si.files?.find((f) => !!f.path);
  if (file) {
    return { kind: "file", file: { path: file.path, fileName: file.fileName, mimeType: file.mimeType, size: file.size } };
  }
  const text = si.text?.trim() ?? "";
  if (si.webUrl && text.replace(si.webUrl, "").trim().length <= MAX_TEXT_AROUND_LINK) {
    return { kind: "url", url: si.webUrl, title: si.meta?.title || undefined };
  }
  if (text) return { kind: "text", text };
  return null;
}

export type ShareStart = { draft: Draft; label: string };

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

/** The draft and flow title for a share. Throws a user-facing message when it can't be used. */
export async function shareToDraft(s: IncomingShare): Promise<ShareStart> {
  if (s.kind === "file") {
    const draft = await sharedFileDraft(s.file);
    return { draft, label: draft.type === "upload" ? draft.file.name : "Shared file" };
  }
  if (s.kind === "url") {
    const url = normaliseUrl(s.url);
    if (!url) throw new Error("That link doesn't look like a web address.");
    const label = youtubeIdOf(url) ? "YouTube video" : (s.title ?? new URL(url).hostname.replace(/^www\./, ""));
    return { draft: { type: "url", url }, label };
  }
  if (s.text.length < MIN_TEXT) throw new Error("That's too short to make notes from. Share at least a few sentences.");
  return { draft: { type: "text", text: s.text }, label: `Shared text · ${words(s.text)} words` };
}
