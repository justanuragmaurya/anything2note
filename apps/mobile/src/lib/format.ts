/** 132 → "2:12"; 3725 → "1:02:05" */
export function fmtTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** Deterministic pseudo-random 0..1 for decorative waveforms. */
export function wave(i: number, seed = 0): number {
  return Math.abs(Math.sin(i * 1.3 + seed) * 0.7 + Math.sin(i * 0.37 + seed * 2) * 0.3);
}
