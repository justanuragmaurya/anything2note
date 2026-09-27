"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, Download, UserRound } from "lucide-react";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { Art } from "@/components/ui/art";
import { ALL_ACTIONS, LIBRARY, TODAY_ISO, fmtDue, relativeDate, type TrackedAction } from "@/lib/mock/app-data";
import { noteType } from "@/lib/mock/note-types";
import { AnchorChip, PageHeader, TickBox } from "../ui";

type Group = "meeting" | "due";
type Filter = "open" | "done" | "all";

const dayDiff = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${TODAY_ISO}T00:00:00Z`)) / 86_400_000);

function dueBucket(a: TrackedAction): { key: string; label: string; order: number } {
  if (!a.due) return { key: "none", label: "No due date", order: 4 };
  const d = dayDiff(a.due);
  if (d < 0) return { key: "overdue", label: "Overdue", order: 0 };
  if (d === 0) return { key: "today", label: "Today", order: 1 };
  if (d <= 7) return { key: "week", label: "This week", order: 2 };
  return { key: "later", label: "Later", order: 3 };
}

function OwnerField({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  if (editing)
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onChange(draft.trim() || null);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder="Owner"
        aria-label="Owner"
        className="w-28 rounded-full border border-red-300 bg-card px-2.5 py-0.5 text-xs focus:shadow-[0_0_0_3px_var(--red-50)] focus:outline-none"
      />
    );
  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value ?? "");
        setEditing(true);
      }}
      className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 transition-colors hover:bg-panel"
      aria-label={`Owner: ${value ?? "not mentioned"}. Edit`}
    >
      <UserRound className="size-3.5 text-muted" aria-hidden />
      {value ?? <span className="text-muted italic">Not mentioned</span>}
    </button>
  );
}

function DueField({ value, done, onChange }: { value: string | null; done: boolean; onChange: (v: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const overdue = !done && value !== null && dayDiff(value) < 0;
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => {
          const el = ref.current;
          if (!el) return;
          if (typeof el.showPicker === "function") el.showPicker();
          else el.focus();
        }}
        className={`inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 transition-colors hover:bg-panel ${overdue ? "text-red-600" : ""}`}
        aria-label={`Due: ${value ? fmtDue(value) : "not mentioned"}. Edit`}
      >
        <CalendarDays className={`size-3.5 ${overdue ? "text-red-500" : "text-muted"}`} aria-hidden />
        {value ? fmtDue(value) : <span className="text-muted italic">Not mentioned</span>}
        {overdue && <span className="font-mono text-[9px] tracking-[0.1em] uppercase">overdue</span>}
      </button>
      <input
        ref={ref}
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0"
      />
    </span>
  );
}

export function ActionsView() {
  const [items, setItems] = useState<TrackedAction[]>(ALL_ACTIONS);
  const [group, setGroup] = useState<Group>("meeting");
  const [filter, setFilter] = useState<Filter>("open");
  const [leaving, setLeaving] = useState<Record<string, boolean>>({});

  const update = (id: string, patch: Partial<TrackedAction>) => setItems((xs) => xs.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const toggle = (a: TrackedAction) => {
    update(a.id, { done: !a.done });
    if (filter !== "all") {
      setLeaving((l) => ({ ...l, [a.id]: true }));
      setTimeout(() => setLeaving((l) => ({ ...l, [a.id]: false })), 900);
    }
  };

  const visible = (a: TrackedAction) => leaving[a.id] || filter === "all" || (filter === "open" ? !a.done : a.done);
  const openCount = items.filter((a) => !a.done).length;
  const doneCount = items.length - openCount;
  const shownCount = items.filter(visible).length;

  const groups: { key: string; label: string; sub?: string; href?: string; color?: string; items: TrackedAction[] }[] = [];
  if (group === "meeting") {
    for (const a of items) {
      let g = groups.find((x) => x.key === a.meetingId);
      if (!g) {
        const lib = LIBRARY.find((i) => i.id === a.meetingId);
        g = {
          key: a.meetingId,
          label: a.meetingTitle,
          sub: relativeDate(a.meetingDate),
          href: `/app/i/${a.meetingId}`,
          color: lib ? noteType(lib.noteType).color : undefined,
          items: [],
        };
        groups.push(g);
      }
      g.items.push(a);
    }
  } else {
    const sorted = [...items].sort((x, y) => dueBucket(x).order - dueBucket(y).order || (x.due ?? "").localeCompare(y.due ?? ""));
    for (const a of sorted) {
      const b = dueBucket(a);
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
        eyebrow={`Action items · ${openCount} open`}
        title={
          <>
            Everything you <span className="serif-accent text-red-500">promised</span>.
          </>
        }
        sub="Pulled from every meeting. We only fill in owners and dates that were actually said."
        actions={
          <button type="button" className="btn btn-ghost btn-sm">
            <Download className="size-3.5" /> Export CSV
          </button>
        }
      />

      <div className="rise mt-7 flex flex-wrap items-center justify-between gap-3" style={{ animationDelay: "80ms" }}>
        <SlidingTabs
          value={group}
          onChange={setGroup}
          size="sm"
          ariaLabel="Group by"
          items={[
            { value: "meeting", label: "By meeting" },
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

      {shownCount === 0 ? (
        <div className="rise mt-8 flex flex-col items-center rounded-[28px] border border-dashed border-line-strong bg-card/60 px-6 py-14 text-center">
          <Art id="empty-actions" className="w-full max-w-[260px]" />
          <h2 className="mt-7 text-[26px] tracking-[-0.035em]">
            Nothing on your <span className="serif-accent text-red-500">plate</span>.
          </h2>
          <p className="mt-2 max-w-[40ch] text-sm text-ink-soft">
            {filter === "done" ? "Tick something off and it lands here." : "Every action item is done. Enjoy it while it lasts."}
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
                        <li key={a.id} className="accordion-body" data-open={show}>
                          <div>
                            <div className={`flex items-start gap-3 border-b border-line px-4 py-3.5 transition-all duration-500 ${leaving[a.id] ? "bg-paper/70" : "hover:bg-paper/50"}`}>
                              <TickBox checked={a.done} onChange={() => toggle(a)} label={a.done ? `Reopen “${a.task}”` : `Complete “${a.task}”`} className="mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className={`text-[14px] transition-all duration-300 ${a.done ? "text-muted line-through decoration-red-400/70" : "text-ink"}`}>{a.task}</p>
                                <div className="mt-1.5 -ml-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                                  <OwnerField value={a.owner} onChange={(owner) => update(a.id, { owner })} />
                                  <DueField value={a.due} done={a.done} onChange={(due) => update(a.id, { due })} />
                                  <AnchorChip anchor={a.anchor} itemId={a.meetingId} />
                                  {group === "due" && (
                                    <Link href={`/app/i/${a.meetingId}`} className="truncate text-muted hover:text-ink">
                                      · {a.meetingTitle}
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
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
