/**
 * Labels and formatting for the logged-in app. Locale-free so every browser renders the same
 * text; dates follow the API, which counts days in IST.
 */

import type { Anchor, SourceKind, TaskKind } from "@a2n/shared";

export const SOURCE_LABELS: Record<SourceKind, string> = {
  youtube: "YouTube",
  audio: "Audio",
  video: "Video",
  recording: "Recording",
  pdf: "PDF",
  docx: "Word",
  slides: "Slides",
  image: "Image",
  text: "Text",
  web: "Web page",
};

export const MEDIA_KINDS: SourceKind[] = ["youtube", "audio", "video", "recording"];

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  homework: "Homework",
  reading: "Reading",
  exam: "Exam",
  project: "Project",
};

export function fmtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

export function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (!h && !m) return `${Math.max(1, Math.round(s))} sec`;
  return h ? `${h} h ${m} min` : `${m} min`;
}

export const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const IST_OFFSET = 5.5 * 3600_000;

export function fmtDayUTC(d: Date): string {
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  const dt = new Date(ts + IST_OFFSET);
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`;
}

/** "in 10 min", "tomorrow", "in 3 days" for a future Unix ms. */
export function relativeFuture(ts: number): string {
  const min = Math.round((ts - Date.now()) / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `in ${min} min`;
  const h = Math.round(min / 60);
  if (h < 20) return `in ${h} h`;
  const d = Math.round(h / 24);
  return d <= 1 ? "tomorrow" : `in ${d} days`;
}

/** yyyy-mm-dd → "Mon, 5 Oct" */
export function fmtDue(iso: string): string {
  return fmtDayUTC(new Date(`${iso}T00:00:00Z`));
}

/** yyyy-mm-dd → "1 Oct" */
export function fmtShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** A timestamp as "12 Oct", in IST. */
export function fmtTsDate(ts: number): string {
  const d = new Date(ts + IST_OFFSET);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** Today's date (yyyy-mm-dd) in IST. */
export function todayIso(): string {
  return new Date(Date.now() + IST_OFFSET).toISOString().slice(0, 10);
}

export function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** Anchors only make sense for the content they point into: time for media, pages for documents. */
export function anchorFits(a: Anchor | undefined, contentKind: "media" | "document" | "text" | null | undefined): a is Anchor {
  if (!a) return false;
  if (contentKind === "media") return a.kind === "time";
  if (contentKind === "document") return a.kind === "page";
  return false;
}
