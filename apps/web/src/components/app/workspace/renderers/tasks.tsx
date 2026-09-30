"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import type { OutputData, Task } from "@a2n/shared";
import { TASK_KIND_LABELS, fmtDue } from "@/lib/format";
import { EditTaskButton, TaskEditForm } from "../../tasks/task-editor";
import { AnchorChip, TickBox } from "../../ui";
import { fits, type SharedState } from "./shared";

export function NotMentioned() {
  return <span className="text-muted italic">Not mentioned</span>;
}

/** The task with any local (optimistic) tick or edit applied. */
const withLocal = (a: Task, state: SharedState): Task => ({ ...a, ...state.taskEdits[a.id], done: state.tasksDone[a.id] ?? a.done });

export function TaskList({ items, state }: { items: Task[]; state: SharedState }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <ul className="space-y-2">
      {items.map((raw) => {
        const a = withLocal(raw, state);
        const done = a.done;
        if (editing === a.id)
          return (
            <li key={a.id} className="rounded-2xl border border-red-200 bg-card p-3.5">
              <TaskEditForm
                task={a}
                onCancel={() => setEditing(null)}
                onSave={(patch) => {
                  setEditing(null);
                  state.editTask(a.id, patch);
                }}
              />
            </li>
          );
        return (
          <li
            key={a.id}
            className={`group flex items-start gap-3 rounded-2xl border p-3.5 transition-all duration-300 ${done ? "border-line bg-paper/60" : "border-line bg-card hover:border-line-strong"}`}
          >
            {state.readOnly ? (
              <span role="img" className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border ${done ? "border-red-500 bg-red-500" : "border-line-strong bg-card"}`} aria-label={done ? "Done" : "Open"} />
            ) : (
              <TickBox checked={done} onChange={() => state.toggleTask(a.id, !done)} label={done ? `Mark “${a.task}” as open` : `Mark “${a.task}” as done`} className="mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm transition-all duration-300 ${done ? "text-muted line-through decoration-red-400/70" : "text-ink"}`}>{a.task}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-soft">
                <span className="rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] text-ink uppercase" style={{ background: `color-mix(in oklab, ${state.color} 55%, transparent)` }}>
                  {TASK_KIND_LABELS[a.kind]}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-muted" aria-hidden />
                  <span className="sr-only">Due:</span>
                  {a.due ? fmtDue(a.due) : <NotMentioned />}
                </span>
                {fits(state, a.anchor) && <AnchorChip anchor={a.anchor} itemId={state.readOnly ? undefined : state.itemId} />}
              </div>
            </div>
            {!state.readOnly && <EditTaskButton label={`Edit “${a.task}”`} onClick={() => setEditing(a.id)} />}
          </li>
        );
      })}
    </ul>
  );
}

export function TasksRenderer({ data, state }: { data: OutputData; state: SharedState }) {
  if (data.type !== "tasks") return null;
  if (data.items.length === 0) return <p className="text-sm text-muted">No homework, readings, projects or exam dates were mentioned.</p>;
  const open = data.items.filter((a) => !withLocal(a, state).done).length;
  return (
    <div>
      <p className="eyebrow mb-3 text-[10px]">
        {open} open · {data.items.length - open} done
      </p>
      <TaskList items={data.items} state={state} />
    </div>
  );
}
