import type { Anchor, NoteTypeKey, OutputKey, Task, UpdateTaskRequest } from "@a2n/shared";
import { anchorFits } from "@/lib/format";

export type TaskPatch = Omit<UpdateTaskRequest, "done">;

export type SharedState = {
  itemId: string;
  outputKey: OutputKey;
  noteType: NoteTypeKey;
  color: string;
  /** What anchors can point into; anchors of another kind are dropped. */
  contentKind: "media" | "document" | "text" | null;
  tasksDone: Record<string, boolean>;
  toggleTask: (id: string, done: boolean) => void;
  /** Local task edits not yet reflected in the output data (optimistic). */
  taskEdits: Record<string, Partial<Task>>;
  /** Saves a task edit optimistically; rolls back (and says why) if the API refuses it. */
  editTask: (id: string, patch: TaskPatch) => void;
  flashcardsDue: number;
  /** Public share page: nothing is saved, no ticking or editing, no links into the app. */
  readOnly?: boolean;
};

export const fits = (state: SharedState, a: Anchor | undefined): a is Anchor => anchorFits(a, state.contentKind);
