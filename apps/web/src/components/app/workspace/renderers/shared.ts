import type { Anchor, NoteTypeKey, OutputKey } from "@a2n/shared";
import { anchorFits } from "@/lib/format";

export type SharedState = {
  itemId: string;
  outputKey: OutputKey;
  noteType: NoteTypeKey;
  color: string;
  /** What anchors can point into; anchors of another kind are dropped. */
  contentKind: "media" | "document" | "text" | null;
  tasksDone: Record<string, boolean>;
  toggleTask: (id: string, done: boolean) => void;
  flashcardsDue: number;
};

export const fits = (state: SharedState, a: Anchor | undefined): a is Anchor => anchorFits(a, state.contentKind);
