import type { SourceKind } from "./mock/types";
import type { NoteTypeKey } from "./note-types";

export const SOURCE_KINDS: SourceKind[] = ["recording", "upload", "youtube", "pdf", "photo", "link", "text"];

export function parseSource(v: unknown): SourceKind {
  return typeof v === "string" && (SOURCE_KINDS as string[]).includes(v) ? (v as SourceKind) : "upload";
}

/** Mock of the server-side classifier behind "Auto-detect". */
export function detectType(source: SourceKind): NoteTypeKey {
  switch (source) {
    case "recording":
      return "meeting";
    case "youtube":
    case "upload":
      return "lecture";
    case "link":
      return "podcast";
    case "pdf":
      return "reading";
    default:
      return "general";
  }
}

/** Which demo item the mock pipeline "produces" for a type. */
export function demoItemFor(type: NoteTypeKey): string {
  return type === "meeting" || type === "interview" ? "demo-meeting" : "demo-lecture";
}
