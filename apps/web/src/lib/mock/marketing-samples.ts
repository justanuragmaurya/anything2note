/**
 * Types for the read-only sample outputs shown on marketing pages
 * (use-case pages, the shared-note demo, the sign-in panel).
 * Everything here is serialisable so it can cross the server/client boundary.
 */

/** Where a line of output came from: a timestamp, a page, or a region of a photo. */
export type Anchor =
  | { kind: "time"; at: number }
  | { kind: "page"; page: number }
  | { kind: "region"; label: string };

export type TaskKind = "homework" | "reading" | "exam" | "project";

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  homework: "Homework",
  reading: "Reading",
  exam: "Exam",
  project: "Project",
};

export type SampleBlock =
  | { type: "fields"; rows: { label: string; value: string }[] }
  | { type: "heading"; text: string; anchor?: Anchor }
  | { type: "paragraph"; text: string; anchor?: Anchor }
  | { type: "bullets"; items: { text: string; anchor?: Anchor }[] }
  | { type: "numbered"; items: { title: string; body: string; anchor?: Anchor }[] }
  /** Tasks & deadlines: `due` is a display date, or NOT_MENTIONED when none was given */
  | { type: "tasks"; items: { task: string; kind: TaskKind; due: string; anchor?: Anchor; done?: boolean }[] }
  | { type: "flashcards"; items: { q: string; a: string; anchor?: Anchor }[] }
  | { type: "qa"; items: { q: string; a: string; speaker?: string; anchor?: Anchor }[] }
  | { type: "chapters"; items: { title: string; summary: string; anchor: Anchor }[] }
  | { type: "quote"; text: string; speaker: string; anchor?: Anchor }
  | { type: "callout"; label: string; text: string }
  | { type: "glossary"; items: { term: string; def: string }[] };

export type SampleDoc = {
  /** Output name shown in the document header, e.g. "Detailed notes" */
  output: string;
  /** Source file or link, shown in mono */
  file: string;
  /** Short mono facts: duration, pages, speakers */
  meta: string[];
  blocks: SampleBlock[];
};

export const NOT_MENTIONED = "Not mentioned";

export function formatAnchor(a: Anchor): string {
  switch (a.kind) {
    case "time": {
      const h = Math.floor(a.at / 3600);
      const m = Math.floor((a.at % 3600) / 60);
      const s = String(Math.floor(a.at % 60)).padStart(2, "0");
      return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
    }
    case "page":
      return `p. ${a.page}`;
    case "region":
      return a.label;
  }
}
