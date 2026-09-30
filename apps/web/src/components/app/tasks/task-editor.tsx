"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import type { Task, TaskKind, UpdateTaskRequest } from "@a2n/shared";
import { TASK_KIND_LABELS } from "@/lib/format";
import { inputCls } from "../ui";

export const TASK_KINDS = Object.keys(TASK_KIND_LABELS) as TaskKind[];

const CARET = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' fill='none' stroke='%237d6660' stroke-width='1.5'/></svg>\")";

/** Native select styled like `inputCls`, with the app's caret. */
export const selectCls = `${inputCls} cursor-pointer appearance-none bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9`;
export const selectStyle = { backgroundImage: CARET };

export type TaskEdit = Omit<UpdateTaskRequest, "done">;

/** Only the fields that actually changed, or null when nothing did. */
export function taskDiff(t: Pick<Task, "task" | "kind" | "due">, next: Required<TaskEdit>): TaskEdit | null {
  const patch: TaskEdit = {};
  if (next.task !== t.task) patch.task = next.task;
  if (next.kind !== t.kind) patch.kind = next.kind;
  if (next.due !== t.due) patch.due = next.due;
  return Object.keys(patch).length ? patch : null;
}

export const editBtnCls =
  "grid size-7 shrink-0 place-items-center rounded-full text-muted transition-all hover:bg-panel hover:text-ink focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-red-400 sm:opacity-0 sm:group-hover:opacity-100";

export function EditTaskButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={editBtnCls} aria-label={label} title="Edit">
      <Pencil className="size-3.5" />
    </button>
  );
}

/**
 * Inline editor for one task: text, kind and due date ("Not mentioned" clears it). Calls
 * `onSave` with only the changed fields; the caller saves optimistically.
 */
export function TaskEditForm({ task, onSave, onCancel }: { task: Pick<Task, "task" | "kind" | "due">; onSave: (patch: TaskEdit) => void; onCancel: () => void }) {
  const [text, setText] = useState(task.task);
  const [kind, setKind] = useState<TaskKind>(task.kind);
  const [due, setDue] = useState(task.due ?? "");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="rise w-full space-y-2.5"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim().replace(/\s+/g, " ");
        if (!t) return setError("A task needs some text.");
        if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return setError("That date doesn’t look right.");
        const patch = taskDiff(task, { task: t, kind, due: due || null });
        if (patch) onSave(patch);
        else onCancel();
      }}
    >
      <label className="block">
        <span className="sr-only">Task</span>
        <textarea
          autoFocus
          value={text}
          rows={2}
          maxLength={500}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          className={`${inputCls} !rounded-xl !py-2 resize-y`}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <label className="min-w-[132px] flex-1 sm:flex-none">
          <span className="sr-only">Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as TaskKind)} className={`${selectCls} !rounded-xl !py-1.5 text-[13px]`} style={selectStyle}>
            {TASK_KINDS.map((k) => (
              <option key={k} value={k}>
                {TASK_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[150px] flex-1 sm:flex-none">
          <span className="sr-only">Due date</span>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${inputCls} !rounded-xl !py-1.5 text-[13px]`} />
        </label>
        {due && (
          <button type="button" onClick={() => setDue("")} className="text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline">
            Not mentioned
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button type="submit" className="btn btn-red btn-sm">
            <Check className="size-3.5" /> Save
          </button>
        </div>
      </div>
      {error && (
        <p className="text-[12px] text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
