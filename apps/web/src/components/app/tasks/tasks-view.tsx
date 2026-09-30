"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, ArrowUpRight, CalendarDays, Download, Loader2, RotateCcw } from "lucide-react";
import type { TrackedTask } from "@a2n/shared";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { Art } from "@/components/ui/art";
import { api, errorMessage, workspaceApi } from "@/lib/api";
import { download, tasksCsv } from "@/lib/export";
import { TASK_KIND_LABELS, fmtDue, relativeDate, todayIso } from "@/lib/format";
import { noteType } from "@/lib/note-types";
import { keys, useInvalidate, useTasks } from "@/lib/queries";
import { AnchorChip, PageHeader, TickBox } from "../ui";
import { EditTaskButton, TaskEditForm, type TaskEdit } from "./task-editor";

type Group = "lecture" | "due";
type Filter = "open" | "done" | "all";

const dayDiff = (iso: string, today: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);

function dueBucket(a: TrackedTask, today: string): { key: string; label: string; order: number } {
  if (!a.due) return { key: "none", label: "No due date", order: 4 };
  const d = dayDiff(a.due, today);
  if (d < 0) return { key: "overdue", label: "Overdue", order: 0 };
  if (d === 0) return { key: "today", label: "Today", order: 1 };
  if (d <= 7) return { key: "week", label: "This week", order: 2 };
  return { key: "later", label: "Later", order: 3 };
}

function DueLabel({ value, done, today }: { value: string | null; done: boolean; today: string }) {
  const overdue = !done && value !== null && dayDiff(value, today) < 0;
  return (
    <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 ${overdue ? "text-red-600" : ""}`}>
      <CalendarDays className={`size-3.5 ${overdue ? "text-red-500" : "text-muted"}`} aria-hidden />
      <span className="sr-only">Due:</span>
      {value ? fmtDue(value) : <span className="text-muted italic">Not mentioned</span>}
      {overdue && <span className="font-mono text-[9px] tracking-[0.1em] uppercase">overdue</span>}
    </span>
  );
}

export function TasksView() {
  const { data, error, isPending, refetch, isFetching } = useTasks();
  const invalidate = useInvalidate();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [edits, setEdits] = useState<Record<string, TaskEdit>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [group, setGroup] = useState<Group>("lecture");
  const [filter, setFilter] = useState<Filter>("open");
  const [leaving, setLeaving] = useState<Record<string, boolean>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const today = todayIso();
  const items: TrackedTask[] = (data?.tasks ?? []).map((a) => ({ ...a, ...edits[a.id], ...(a.id in overrides && { done: overrides[a.id]! }) }));

  /** Optimistic: show the edit now, put the old values back if the API refuses it. */
  const edit = (a: TrackedTask, patch: TaskEdit) => {
    setSaveError(null);
    const prev = edits[a.id];
    setEdits((e) => ({ ...e, [a.id]: { ...e[a.id], ...patch } }));
    workspaceApi
      .editTask(a.id, patch)
      .then(async () => {
        await invalidate(keys.tasks, keys.item(a.itemId));
        // The refetched list has the new values now.
        setEdits((cur) => {
          const next = { ...cur };
          delete next[a.id];
          return next;
        });
      })
      .catch((e: unknown) => {
        setEdits((cur) => {
          const next = { ...cur };
          if (prev) next[a.id] = prev;
          else delete next[a.id];
          return next;
        });
        setSaveError(errorMessage(e));
      });
  };

  const toggle = (a: TrackedTask) => {
    const done = !a.done;
    setSaveError(null);
    setOverrides((o) => ({ ...o, [a.id]: done }));
    if (filter !== "all") {
      setLeaving((l) => ({ ...l, [a.id]: true }));
      setTimeout(() => setLeaving((l) => ({ ...l, [a.id]: false })), 900);
    }
    api
      .updateTask(a.id, done)
      .then(() => invalidate(keys.tasks, keys.item(a.itemId)))
      .catch((e: unknown) => {
        setOverrides((o) => ({ ...o, [a.id]: !done }));
        setSaveError(errorMessage(e));
      });
  };

  const visible = (a: TrackedTask) => leaving[a.id] || filter === "all" || (filter === "open" ? !a.done : a.done);
  const openCount = items.filter((a) => !a.done).length;
  const doneCount = items.length - openCount;
  const shownCount = items.filter(visible).length;

  const groups: { key: string; label: string; sub?: string; href?: string; color?: string; items: TrackedTask[] }[] = [];
  if (group === "lecture") {
    for (const a of items) {
      let g = groups.find((x) => x.key === a.itemId);
      if (!g) {
        g = {
          key: a.itemId,
          label: a.itemTitle,
          sub: relativeDate(a.itemDate),
          href: `/app/i/${a.itemId}`,
          color: noteType(a.noteType).color,
          items: [],
        };
        groups.push(g);
      }
      g.items.push(a);
    }
  } else {
    const sorted = [...items].sort((x, y) => dueBucket(x, today).order - dueBucket(y, today).order || (x.due ?? "").localeCompare(y.due ?? ""));
    for (const a of sorted) {
      const b = dueBucket(a, today);
      let g = groups.find((x) => x.key === b.key);
      if (!g) {
        g = { key: b.key, label: b.label, items: [] };
        groups.push(g);
      }
      g.items.push(a);
    }
  }

  return (
    <div className="mx-auto max-w-[920px]">
      <PageHeader
        eyebrow={`Tasks · ${openCount} open`}
        title={
          <>
            Everything that&rsquo;s <span className="serif-accent text-red-500">due</span>.
          </>
        }
        sub="Homework, readings, projects and exam dates pulled from every lecture. We only fill in dates your lecturer actually said."
        actions={
          items.length > 0 && (
            <button type="button" onClick={() => download(`tasks-${today}.csv`, tasksCsv(items), "text/csv;charset=utf-8")} className="btn btn-ghost btn-sm">
              <Download className="size-3.5" /> Export CSV
            </button>
          )
        }
      />

      <div className="rise mt-7 flex flex-wrap items-center justify-between gap-3" style={{ animationDelay: "80ms" }}>
        <SlidingTabs
          value={group}
          onChange={setGroup}
          size="sm"
          ariaLabel="Group by"
          items={[
            { value: "lecture", label: "By lecture" },
            { value: "due", label: "By due date" },
          ]}
        />
        <SlidingTabs
          value={filter}
          onChange={setFilter}
          size="sm"
          tone="ink"
          ariaLabel="Status"
          items={[
            { value: "open", label: <>Open <span className="font-mono text-[10px] opacity-70">{openCount}</span></> },
            { value: "done", label: <>Done <span className="font-mono text-[10px] opacity-70">{doneCount}</span></> },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      {saveError && (
        <p className="rise mt-4 flex items-center gap-2 text-[13px] text-red-700" role="alert">
          <AlertCircle className="size-4" /> Couldn’t save that: {saveError}
        </p>
      )}

      {error && !data ? (
        <div className="rise mt-8 flex flex-col items-center rounded-[28px] border border-dashed border-red-200 bg-red-50/60 px-6 py-12 text-center">
          <AlertCircle className="size-6 text-red-500" />
          <p className="mt-3 text-sm text-red-700">{errorMessage(error)}</p>
          <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn btn-ghost btn-sm mt-4">
            {isFetching ? <Loader2 className="spin size-3.5" /> : <RotateCcw className="size-3.5" />} Try again
          </button>
        </div>
      ) : isPending ? (
        <div className="mt-6 space-y-3" aria-busy="true" aria-label="Loading tasks">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-[22px]" />
          ))}
        </div>
      ) : shownCount === 0 ? (
        <div className="rise mt-8 flex flex-col items-center rounded-[28px] border border-dashed border-line-strong bg-card/60 px-6 py-14 text-center">
          <Art id="empty-actions" className="w-full max-w-[260px]" />
          <h2 className="mt-7 text-[26px] tracking-[-0.035em]">
            Nothing on your <span className="serif-accent text-red-500">plate</span>.
          </h2>
          <p className="mt-2 max-w-[40ch] text-sm text-ink-soft">
            {items.length === 0
              ? "Homework, readings and exam dates from your lectures will show up here."
              : filter === "done"
                ? "Tick something off and it lands here."
                : "Every task is done. Enjoy it while it lasts."}
          </p>
        </div>
      ) : (
        <div key={`${group}`} className="mt-6 space-y-6">
          {groups.map((g, gi) => {
            const n = g.items.filter(visible).length;
            return (
              <section key={g.key} className="accordion-body rise" data-open={n > 0} style={{ animationDelay: `${gi * 60}ms` }} aria-label={g.label}>
                <div>
                  <header className="mb-2.5 flex items-center justify-between gap-3 px-1">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {g.color ? (
                        <span className="size-2.5 shrink-0 rounded-full ring-1 ring-ink/15" style={{ background: g.color }} aria-hidden />
                      ) : (
                        <span className={`size-2 shrink-0 rounded-full ${g.key === "overdue" ? "bg-red-500" : "bg-line-strong"}`} aria-hidden />
                      )}
                      {g.href ? (
                        <Link href={g.href} className="group inline-flex min-w-0 items-center gap-1 text-[15px] font-medium tracking-[-0.015em] hover:text-red-700">
                          <span className="truncate">{g.label}</span>
                          <ArrowUpRight className="size-3.5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </Link>
                      ) : (
                        <h2 className={`text-[15px] font-medium tracking-[-0.015em] ${g.key === "overdue" ? "text-red-700" : ""}`}>{g.label}</h2>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
                      {g.sub ? `${g.sub} · ` : ""}
                      {n}
                    </span>
                  </header>
                  <div className="overflow-hidden rounded-[22px] border border-line bg-card">
                  <ul className="-mb-px">
                    {g.items.map((a) => {
                      const show = visible(a);
                      return (
                        <li key={a.id} className="accordion-body" data-open={show || editing === a.id}>
                          <div>
                            {editing === a.id ? (
                              <div className="border-b border-line bg-paper/50 px-4 py-3.5">
                                <TaskEditForm
                                  task={a}
                                  onCancel={() => setEditing(null)}
                                  onSave={(patch) => {
                                    setEditing(null);
                                    edit(a, patch);
                                  }}
                                />
                              </div>
                            ) : (
                            <div className={`group flex items-start gap-3 border-b border-line px-4 py-3.5 transition-all duration-500 ${leaving[a.id] ? "bg-paper/70" : "hover:bg-paper/50"}`}>
                              <TickBox checked={a.done} onChange={() => toggle(a)} label={a.done ? `Reopen “${a.task}”` : `Complete “${a.task}”`} className="mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className={`text-[14px] transition-all duration-300 ${a.done ? "text-muted line-through decoration-red-400/70" : "text-ink"}`}>{a.task}</p>
                                <div className="mt-1.5 -ml-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                                  <span className="rounded-full bg-panel px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] text-ink uppercase">{TASK_KIND_LABELS[a.kind]}</span>
                                  <DueLabel value={a.due} done={a.done} today={today} />
                                  {a.anchor && <AnchorChip anchor={a.anchor} itemId={a.itemId} />}
                                  {group === "due" && (
                                    <Link href={`/app/i/${a.itemId}`} className="truncate text-muted hover:text-ink">
                                      · {a.itemTitle}
                                    </Link>
                                  )}
                                </div>
                              </div>
                              <EditTaskButton label={`Edit “${a.task}”`} onClick={() => setEditing(a.id)} />
                            </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
