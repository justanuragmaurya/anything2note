"use client";

import type { ReactNode } from "react";
import { ArrowRight, CalendarDays, Check, CircleHelp, Clock, Gavel, UserRound, Users } from "lucide-react";
import { fmtDue, type ActionItem, type Minutes, type OutputData } from "@/lib/mock/app-data";
import { AnchorChip, TickBox } from "../../ui";
import type { SharedState } from "./shared";

export function NotMentioned() {
  return <span className="text-muted italic">Not mentioned</span>;
}

function SectionLabel({ n, children, icon }: { n: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="font-mono text-[10px] tracking-[0.14em] text-red-600">{n}</span>
      <h3 className="flex items-center gap-2 text-[13px] font-medium tracking-[-0.01em] text-ink">
        {icon}
        {children}
      </h3>
      <span className="h-px flex-1 bg-line" aria-hidden />
    </div>
  );
}

export function ActionList({ items, state, compact = false }: { items: ActionItem[]; state: SharedState; compact?: boolean }) {
  return (
    <ul className="space-y-2">
      {items.map((a) => {
        const done = !!state.actionsDone[a.id];
        return (
          <li
            key={a.id}
            className={`group flex items-start gap-3 rounded-2xl border p-3.5 transition-all duration-300 ${done ? "border-line bg-paper/60" : "border-line bg-card hover:border-line-strong"}`}
          >
            <TickBox checked={done} onChange={() => state.toggleAction(a.id)} label={done ? `Mark “${a.task}” as open` : `Mark “${a.task}” as done`} className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className={`text-sm transition-all duration-300 ${done ? "text-muted line-through decoration-red-400/70" : "text-ink"}`}>{a.task}</p>
              <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-soft ${compact ? "mt-1" : "mt-2"}`}>
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="size-3.5 text-muted" aria-hidden />
                  <span className="sr-only">Owner:</span>
                  {a.owner ?? <NotMentioned />}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-muted" aria-hidden />
                  <span className="sr-only">Due:</span>
                  {a.due ? fmtDue(a.due) : <NotMentioned />}
                </span>
                <AnchorChip anchor={a.anchor} itemId={state.itemId} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MinutesView({ m, state }: { m: Minutes; state: SharedState }) {
  return (
    <article className="space-y-8">
      <header className="rounded-[22px] p-5" style={{ background: `color-mix(in oklab, ${state.color} 45%, var(--card))` }}>
        <p className="eyebrow text-[10px] text-ink/60">Minutes of meeting</p>
        <h2 className="mt-1.5 text-[22px] leading-tight tracking-[-0.03em]">{m.title}</h2>
        <dl className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 text-[13px] sm:grid-cols-3">
          <div>
            <dt className="eyebrow text-[10px] text-ink/55">Date</dt>
            <dd className="mt-0.5 flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-ink/50" aria-hidden />
              {m.date}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-[10px] text-ink/55">Duration</dt>
            <dd className="mt-0.5 flex items-center gap-1.5">
              <Clock className="size-3.5 text-ink/50" aria-hidden />
              {m.duration}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-[10px] text-ink/55">Next meeting</dt>
            <dd className="mt-0.5">{m.nextMeeting ?? <NotMentioned />}</dd>
          </div>
        </dl>
        <div className="mt-4 border-t border-ink/10 pt-3">
          <p className="eyebrow flex items-center gap-1.5 text-[10px] text-ink/55">
            <Users className="size-3" aria-hidden /> Attendees · {m.attendees.length}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {m.attendees.map((a) => (
              <li key={a} className="flex items-center gap-1.5 rounded-full bg-cream/70 py-0.5 pr-2.5 pl-0.5 text-[12px]">
                <span className="grid size-5 place-items-center rounded-full bg-ink text-[10px] text-cream">{a[0]}</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      </header>

      <section>
        <SectionLabel n="01">Agenda</SectionLabel>
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-1.5 sm:grid-cols-2">
          {m.agenda.map((a, i) => (
            <li key={a.title} className="flex items-center justify-between gap-2 rounded-xl bg-paper px-3 py-2 text-sm">
              <span>
                <span className="mr-2 font-mono text-[11px] text-muted">{i + 1}.</span>
                {a.title}
              </span>
              <AnchorChip anchor={a.anchor} itemId={state.itemId} />
            </li>
          ))}
        </ol>
      </section>

      <section>
        <SectionLabel n="02">Discussion</SectionLabel>
        <div className="space-y-3">
          {m.agenda.map((a, i) => (
            <div key={a.title} className="rounded-2xl border border-line p-4 transition-colors hover:border-line-strong">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-medium tracking-[-0.01em]">
                  <span className="mr-2 text-muted">{i + 1}.</span>
                  {a.title}
                </h4>
                <AnchorChip anchor={a.anchor} itemId={state.itemId} />
              </div>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-soft">
                {a.discussion.map((d) => (
                  <li key={d} className="flex gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-red-400" aria-hidden />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel n="03" icon={<Gavel className="size-3.5 text-muted" aria-hidden />}>
          Decisions
        </SectionLabel>
        <ul className="space-y-2">
          {m.decisions.map((d) => (
            <li key={d.text} className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm" style={{ background: `color-mix(in oklab, ${state.color} 40%, transparent)` }}>
              <span className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-red-600" aria-hidden /> {d.text}
              </span>
              <AnchorChip anchor={d.anchor} itemId={state.itemId} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionLabel n="04">Action items</SectionLabel>
        <ActionList items={m.actions} state={state} compact />
      </section>

      <section>
        <SectionLabel n="05" icon={<CircleHelp className="size-3.5 text-muted" aria-hidden />}>
          Open questions
        </SectionLabel>
        <ul className="space-y-2">
          {m.openQuestions.map((q) => (
            <li key={q.text} className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-3 text-sm text-ink-soft">
              {q.text}
              <AnchorChip anchor={q.anchor} itemId={state.itemId} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionLabel n="06">Next steps</SectionLabel>
        <ul className="space-y-1.5 text-sm">
          {m.nextSteps.map((s) => (
            <li key={s} className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-red-500" aria-hidden />
              {s}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

export function MeetingRenderer({ data, state }: { data: OutputData; state: SharedState }) {
  if (data.type === "minutes") return <MinutesView m={data.data} state={state} />;
  if (data.type === "actions") {
    const open = data.items.filter((a) => !state.actionsDone[a.id]).length;
    return (
      <div>
        <p className="eyebrow mb-3 text-[10px]">
          {open} open · {data.items.length - open} done
        </p>
        <ActionList items={data.items} state={state} />
      </div>
    );
  }
  if (data.type === "decisions")
    return (
      <ol className="space-y-3">
        {data.items.map((d, i) => (
          <li key={d.text} className="flex gap-4 rounded-2xl border border-line p-4 transition-colors hover:border-line-strong">
            <span className="grid size-8 shrink-0 place-items-center rounded-full font-mono text-[11px]" style={{ background: state.color }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium tracking-[-0.01em]">{d.text}</p>
                <AnchorChip anchor={d.anchor} itemId={state.itemId} />
              </div>
              <p className="mt-1 text-sm text-ink-soft">{d.context}</p>
            </div>
          </li>
        ))}
      </ol>
    );
  return null;
}
