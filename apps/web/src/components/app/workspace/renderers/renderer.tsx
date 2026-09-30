"use client";

import type { OutputData } from "@a2n/shared";
import type { SharedState } from "./shared";
import { StudyRenderer } from "./study";
import { TasksRenderer } from "./tasks";
import { TextRenderer } from "./text";

/** Any output, by its data shape. Used by the workspace and the public share page. */
export function Renderer({ data, state }: { data: OutputData; state: SharedState }) {
  switch (data.type) {
    case "tasks":
      return <TasksRenderer data={data} state={state} />;
    case "flashcards":
    case "quiz":
      return <StudyRenderer data={data} state={state} />;
    default:
      return <TextRenderer data={data} state={state} />;
  }
}
