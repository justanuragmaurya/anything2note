import type { Anchor } from "@a2n/shared";

/** 132 → "2:12"; 3725 → "1:02:05" */
export function fmtTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** Time anchor → "2:12", page anchor → "p. 3". */
export const fmtAnchor = (a: Anchor): string => (a.kind === "time" ? fmtTime(a.at) : `p. ${a.page}`);

/** Unix ms → "Today", "Yesterday", "28 Sep" (with the year once it isn't this one). */
export function fmtDay(ms: number, now = new Date()): string {
  const d = new Date(ms);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(d.getFullYear() !== now.getFullYear() && { year: "numeric" }) });
}

/** ISO date (yyyy-mm-dd) from a task → "Mon 5 Oct". Parsed as a local date, not UTC midnight. */
export function fmtDue(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", ...(y !== new Date().getFullYear() && { year: "numeric" }) });
}

/** Unix ms in the future → "in 10 min", "in 3 h", "tomorrow", "in 4 days". */
export function fmtUntil(ms: number, now = Date.now()): string {
  const min = Math.max(1, Math.round((ms - now) / 60_000));
  if (min < 60) return `in ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `in ${h} h`;
  const days = Math.round(h / 24);
  return days === 1 ? "tomorrow" : `in ${days} days`;
}
