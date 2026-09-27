import type { NoteTypeKey } from "@/lib/mock/note-types";

export type SharedState = {
  itemId: string;
  noteType: NoteTypeKey;
  color: string;
  actionsDone: Record<string, boolean>;
  toggleAction: (id: string) => void;
  speakers: Record<string, string>;
};
