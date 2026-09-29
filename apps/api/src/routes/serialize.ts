import type { ItemStatus, LibraryItem, NoteTypeKey, OutputKey, SourceKind } from "@a2n/shared";
import type { sources, userSources } from "../db/schema";

type SourceRow = typeof sources.$inferSelect;
type UserSourceRow = typeof userSources.$inferSelect;

export type SourceMeta = { label?: string; mime?: string; filename?: string; size?: number; durationSec?: number; pages?: number };

export function statusOf(src: SourceRow): ItemStatus {
  switch (src.status) {
    case "ready":
      return { state: "ready" };
    case "failed":
      return { state: "failed", error: src.error ?? "Processing failed." };
    case "extracting":
    case "transcribing":
    case "generating":
      return { state: "processing", step: src.status, progress: src.progress };
    default:
      return { state: "queued" };
  }
}

export function toLibraryItem(src: SourceRow, us: UserSourceRow, flashcardsDue = 0): LibraryItem {
  const meta = JSON.parse(src.metaJson ?? "{}") as SourceMeta;
  const noteType = (us.noteType === "auto" ? "general" : us.noteType) as NoteTypeKey;
  return {
    id: src.id,
    title: us.titleOverride ?? src.title ?? meta.label ?? "Untitled",
    noteType,
    source: src.kind as SourceKind,
    sourceLabel: meta.label ?? "",
    sourceUrl: src.kind === "web" && src.sourceRef ? src.sourceRef : undefined,
    durationSec: meta.durationSec || undefined,
    pages: meta.pages || undefined,
    createdAt: us.addedAt,
    folderId: us.folderId,
    outputs: JSON.parse(us.selectedOutputsJson) as OutputKey[],
    status: statusOf(src),
    flashcardsDue,
  };
}

export const parseJson = <T>(s: string | null | undefined): T | undefined => (s ? (JSON.parse(s) as T) : undefined);
