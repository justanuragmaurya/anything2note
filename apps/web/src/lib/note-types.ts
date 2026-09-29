/**
 * Note-type registry from @a2n/shared (plan.md §2.2) plus the web's colours. The shared defs
 * decide which outputs each type makes; `color` is the CSS var for the type's tint.
 */

import { NOTE_TYPE_DEFS, OUTPUT_KEYS, OUTPUT_LABELS, type NoteTypeDef, type NoteTypeKey, type OutputKey } from "@a2n/shared";

export { OUTPUT_KEYS, OUTPUT_LABELS };
export type { NoteTypeKey, OutputKey };

const COLORS: Record<NoteTypeKey, string> = {
  lecture: "var(--nt-lecture)",
  interview: "var(--nt-interview)",
  podcast: "var(--nt-podcast)",
  tutorial: "var(--nt-tutorial)",
  reading: "var(--nt-reading)",
  general: "var(--nt-general)",
};

export type NoteType = NoteTypeDef & { color: string };

export const NOTE_TYPES: NoteType[] = NOTE_TYPE_DEFS.map((d) => ({ ...d, color: COLORS[d.key] }));

export const noteType = (key: NoteTypeKey): NoteType => NOTE_TYPES.find((n) => n.key === key) ?? NOTE_TYPES[NOTE_TYPES.length - 1]!;
