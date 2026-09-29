/**
 * The note-type / output registry from @a2n/shared (the same one the API generates from),
 * with each type's colour from @a2n/ui-tokens attached for the pickers and cards.
 */

import { NOTE_TYPE_DEFS, OUTPUT_LABELS, type NoteTypeDef, type NoteTypeKey, type OutputKey } from "@a2n/shared";
import { noteTypeColor } from "@a2n/ui-tokens";

export { OUTPUT_LABELS };
export type { NoteTypeKey, OutputKey };

export type NoteType = NoteTypeDef & { color: string };

export const NOTE_TYPES: NoteType[] = NOTE_TYPE_DEFS.map((n) => ({ ...n, color: noteTypeColor[n.key] }));

export const NOTE_TYPE_BY_KEY = Object.fromEntries(NOTE_TYPES.map((n) => [n.key, n])) as Record<NoteTypeKey, NoteType>;

export const noteType = (key: NoteTypeKey): NoteType => NOTE_TYPE_BY_KEY[key] ?? NOTE_TYPE_BY_KEY.general;
