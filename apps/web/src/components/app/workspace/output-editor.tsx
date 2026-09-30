"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, ArrowDown, ArrowUp, Check, Loader2, Plus, Trash2 } from "lucide-react";
import type { Anchor, Flashcard, OutputData, QuizQuestion, Task, TaskKind } from "@a2n/shared";
import { errorMessage } from "@/lib/api";
import { TASK_KIND_LABELS } from "@/lib/format";
import { selectCls, selectStyle, TASK_KINDS } from "../tasks/task-editor";
import { AnchorChip, inputCls } from "../ui";

/*
 * Manual editing of one output, whatever its shape. The draft keeps every entry's `anchor` (and
 * ids) attached as entries are edited, reordered or removed, so citations stay pointing at the
 * right place. Text supports Markdown and $maths$, like the rendered output.
 */

/* ───────────── Draft shapes ───────────── */

type Keyed = { key: string };
type NotesRow = Keyed & { heading: string; anchor?: Anchor; body: string; bullets: string };
type PointRow = Keyed & { text: string; anchor?: Anchor };
type BlockRow = Keyed & { title: string; text: string; anchor?: Anchor };

type Draft =
  | { type: "notes"; sections: NotesRow[] }
  | { type: "summary"; tldr: string; points: PointRow[] }
  | { type: "flashcards"; cards: (Flashcard & Keyed)[] }
  | { type: "quiz"; questions: (QuizQuestion & Keyed)[] }
  | { type: "tasks"; items: (Task & Keyed)[] }
  | { type: "generic"; intro: string; blocks: BlockRow[] };

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

function toDraft(data: OutputData): Draft {
  switch (data.type) {
    case "notes":
      return { type: "notes", sections: data.sections.map((s) => ({ key: newId(), heading: s.heading, anchor: s.anchor, body: s.body.join("\n\n"), bullets: (s.bullets ?? []).join("\n") })) };
    case "summary":
      return { type: "summary", tldr: data.tldr, points: data.points.map((p) => ({ key: newId(), text: p.text, anchor: p.anchor })) };
    case "flashcards":
      return { type: "flashcards", cards: data.cards.map((c) => ({ ...c, key: c.id || newId() })) };
    case "quiz":
      return { type: "quiz", questions: data.questions.map((q) => ({ ...q, options: [...q.options], key: q.id || newId() })) };
    case "tasks":
      return { type: "tasks", items: data.items.map((t) => ({ ...t, key: t.id || newId() })) };
    case "generic":
      return { type: "generic", intro: data.intro ?? "", blocks: data.blocks.map((b) => ({ key: newId(), title: b.title ?? "", text: b.text, anchor: b.anchor })) };
  }
}

const withAnchor = <T extends object>(o: T, anchor: Anchor | undefined): T & { anchor?: Anchor } => (anchor ? { ...o, anchor } : o);
const lines = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim().replace(/^[-*•]\s+/, ""))
    .filter(Boolean);
const paragraphs = (s: string) =>
  s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** The row without its React key. */
function unkey<T extends Keyed>(row: T): Omit<T, "key"> {
  const copy: Partial<T> = { ...row };
  delete copy.key;
  return copy as Omit<T, "key">;
}

function fromDraft(d: Draft): OutputData {
  switch (d.type) {
    case "notes":
      return {
        type: "notes",
        sections: d.sections.map((s) => {
          const bullets = lines(s.bullets);
          return withAnchor({ heading: s.heading.trim(), body: paragraphs(s.body), ...(bullets.length > 0 && { bullets }) }, s.anchor);
        }),
      };
    case "summary":
      return { type: "summary", tldr: d.tldr.trim(), points: d.points.map((p) => withAnchor({ text: p.text.trim() }, p.anchor)) };
    case "flashcards":
      return { type: "flashcards", cards: d.cards.map((row) => ({ ...unkey(row), front: row.front.trim(), back: row.back.trim(), topic: row.topic.trim() || "General" })) };
    case "quiz":
      return {
        type: "quiz",
        questions: d.questions.map((row) => ({ ...unkey(row), q: row.q.trim(), options: row.options.map((o) => o.trim()), explanation: row.explanation.trim(), topic: row.topic.trim() || "General" })),
      };
    case "tasks":
      return { type: "tasks", items: d.items.map((row) => ({ ...unkey(row), task: row.task.trim().replace(/\s+/g, " ") })) };
    case "generic": {
      const intro = d.intro.trim();
      return {
        type: "generic",
        ...(intro && { intro }),
        blocks: d.blocks.map((b) => {
          const title = b.title.trim();
          return withAnchor({ ...(title && { title }), text: b.text.trim() }, b.anchor);
        }),
      };
    }
  }
}

/** First problem with the edited output, in words, or null when it can be saved. */
export function validateOutput(data: OutputData): string | null {
  switch (data.type) {
    case "notes":
      if (data.sections.length === 0) return "Keep at least one section.";
      for (const [i, s] of data.sections.entries()) {
        if (!s.heading) return `Section ${i + 1} needs a heading.`;
        if (s.body.length === 0 && !s.bullets?.length) return `Section ${i + 1} (“${s.heading}”) needs some text or bullets.`;
      }
      return null;
    case "summary":
      if (!data.tldr) return "The TL;DR can’t be empty.";
      for (const [i, p] of data.points.entries()) if (!p.text) return `Key point ${i + 1} is empty. Write something or remove it.`;
      return null;
    case "flashcards":
      for (const [i, c] of data.cards.entries()) {
        if (!c.front) return `Card ${i + 1} needs a question.`;
        if (!c.back) return `Card ${i + 1} needs an answer.`;
      }
      return null;
    case "quiz":
      for (const [i, q] of data.questions.entries()) {
        if (!q.q) return `Question ${i + 1} needs a question.`;
        if (q.options.length < 2) return `Question ${i + 1} needs at least two options.`;
        if (q.options.some((o) => !o)) return `Question ${i + 1} has an empty option.`;
        if (!(q.correct >= 0 && q.correct < q.options.length)) return `Pick the right answer for question ${i + 1}.`;
      }
      return null;
    case "tasks":
      for (const [i, t] of data.items.entries()) {
        if (!t.task) return `Task ${i + 1} needs some text.`;
        if (t.due !== null && !/^\d{4}-\d{2}-\d{2}$/.test(t.due)) return `Task ${i + 1} has a date that doesn’t look right.`;
      }
      return null;
    case "generic":
      for (const [i, b] of data.blocks.entries()) if (!b.text) return `Item ${i + 1}${b.title ? ` (“${b.title}”)` : ""} needs some text.`;
      return null;
  }
}

/* ───────────── List helpers ───────────── */

const updateAt = <T,>(xs: T[], i: number, patch: Partial<T>): T[] => xs.map((x, k) => (k === i ? { ...x, ...patch } : x));
const removeAt = <T,>(xs: T[], i: number): T[] => xs.filter((_, k) => k !== i);
const moveAt = <T,>(xs: T[], i: number, by: -1 | 1): T[] => {
  const j = i + by;
  if (j < 0 || j >= xs.length) return xs;
  const next = [...xs];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
};

/* ───────────── Pieces ───────────── */

const fieldCls = `${inputCls} !rounded-xl !py-2`;
const areaCls = `${fieldCls} resize-y leading-relaxed`;
const smallBtn =
  "grid size-7 place-items-center rounded-full text-muted transition-colors hover:bg-panel hover:text-ink disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-red-400";

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block font-mono text-[9px] tracking-[0.12em] text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}

/** One entry: number, its anchor, reorder and remove controls, then its fields. */
function Row({
  n,
  noun,
  anchor,
  count,
  onMove,
  onRemove,
  children,
}: {
  n: number;
  noun: string;
  anchor?: Anchor;
  count: number;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <li className="rounded-2xl border border-line bg-paper/50 p-3 sm:p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
          {noun} {n}
        </span>
        {anchor && <AnchorChip anchor={anchor} />}
        <div className="ml-auto flex items-center">
          <button type="button" className={smallBtn} onClick={() => onMove(-1)} disabled={n === 1} aria-label={`Move ${noun.toLowerCase()} ${n} up`}>
            <ArrowUp className="size-3.5" />
          </button>
          <button type="button" className={smallBtn} onClick={() => onMove(1)} disabled={n === count} aria-label={`Move ${noun.toLowerCase()} ${n} down`}>
            <ArrowDown className="size-3.5" />
          </button>
          <button type="button" className={`${smallBtn} hover:!text-red-600`} onClick={onRemove} aria-label={`Remove ${noun.toLowerCase()} ${n}`}>
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="space-y-2.5">{children}</div>
    </li>
  );
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line-strong py-2.5 text-[13px] text-ink-soft transition-colors hover:border-red-400 hover:text-red-700"
    >
      <Plus className="size-3.5" /> {label}
    </button>
  );
}

/* ───────────── Per-shape editors ───────────── */

function DraftFields({ draft, set }: { draft: Draft; set: (d: Draft) => void }) {
  switch (draft.type) {
    case "notes": {
      const rows = draft.sections;
      const put = (sections: NotesRow[]) => set({ ...draft, sections });
      return (
        <ol className="space-y-3">
          {rows.map((s, i) => (
            <Row key={s.key} n={i + 1} noun="Section" anchor={s.anchor} count={rows.length} onMove={(by) => put(moveAt(rows, i, by))} onRemove={() => put(removeAt(rows, i))}>
              <Field label="Heading">
                <input value={s.heading} maxLength={200} onChange={(e) => put(updateAt(rows, i, { heading: e.target.value }))} className={fieldCls} />
              </Field>
              <Field label="Text · blank line between paragraphs">
                <textarea value={s.body} rows={Math.min(12, Math.max(3, s.body.split("\n").length + 1))} onChange={(e) => put(updateAt(rows, i, { body: e.target.value }))} className={areaCls} />
              </Field>
              <Field label="Bullets · one per line">
                <textarea value={s.bullets} rows={Math.min(10, Math.max(2, s.bullets.split("\n").length + 1))} onChange={(e) => put(updateAt(rows, i, { bullets: e.target.value }))} className={areaCls} />
              </Field>
            </Row>
          ))}
          <AddRow label="Add section" onClick={() => put([...rows, { key: newId(), heading: "", body: "", bullets: "" }])} />
        </ol>
      );
    }
    case "summary": {
      const rows = draft.points;
      const put = (points: PointRow[]) => set({ ...draft, points });
      return (
        <div className="space-y-4">
          <Field label="TL;DR">
            <textarea value={draft.tldr} rows={3} onChange={(e) => set({ ...draft, tldr: e.target.value })} className={areaCls} />
          </Field>
          <ol className="space-y-3">
            {rows.map((p, i) => (
              <Row key={p.key} n={i + 1} noun="Point" anchor={p.anchor} count={rows.length} onMove={(by) => put(moveAt(rows, i, by))} onRemove={() => put(removeAt(rows, i))}>
                <textarea aria-label={`Point ${i + 1}`} value={p.text} rows={2} onChange={(e) => put(updateAt(rows, i, { text: e.target.value }))} className={areaCls} />
              </Row>
            ))}
            <AddRow label="Add key point" onClick={() => put([...rows, { key: newId(), text: "" }])} />
          </ol>
        </div>
      );
    }
    case "flashcards": {
      const rows = draft.cards;
      const put = (cards: Extract<Draft, { type: "flashcards" }>["cards"]) => set({ ...draft, cards });
      return (
        <ol className="space-y-3">
          {rows.map((c, i) => (
            <Row key={c.key} n={i + 1} noun="Card" anchor={c.anchor} count={rows.length} onMove={(by) => put(moveAt(rows, i, by))} onRemove={() => put(removeAt(rows, i))}>
              <Field label="Question">
                <textarea value={c.front} rows={2} onChange={(e) => put(updateAt(rows, i, { front: e.target.value }))} className={areaCls} />
              </Field>
              <Field label="Answer">
                <textarea value={c.back} rows={2} onChange={(e) => put(updateAt(rows, i, { back: e.target.value }))} className={areaCls} />
              </Field>
              <Field label="Topic">
                <input value={c.topic} maxLength={80} onChange={(e) => put(updateAt(rows, i, { topic: e.target.value }))} className={fieldCls} />
              </Field>
            </Row>
          ))}
          <AddRow label="Add card" onClick={() => put([...rows, { key: newId(), id: newId(), front: "", back: "", topic: rows.at(-1)?.topic ?? "" }])} />
        </ol>
      );
    }
    case "quiz": {
      const rows = draft.questions;
      const put = (questions: Extract<Draft, { type: "quiz" }>["questions"]) => set({ ...draft, questions });
      return (
        <ol className="space-y-3">
          {rows.map((q, i) => (
            <Row key={q.key} n={i + 1} noun="Question" anchor={q.anchor} count={rows.length} onMove={(by) => put(moveAt(rows, i, by))} onRemove={() => put(removeAt(rows, i))}>
              <Field label="Question">
                <textarea value={q.q} rows={2} onChange={(e) => put(updateAt(rows, i, { q: e.target.value }))} className={areaCls} />
              </Field>
              <fieldset>
                <legend className="mb-1 font-mono text-[9px] tracking-[0.12em] text-muted uppercase">Options · pick the right one</legend>
                <ul className="space-y-1.5">
                  {q.options.map((o, n) => (
                    <li key={n} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${q.key}`}
                        checked={q.correct === n}
                        onChange={() => put(updateAt(rows, i, { correct: n }))}
                        aria-label={`Option ${String.fromCharCode(65 + n)} is correct`}
                        className="size-4 shrink-0 accent-red-500"
                      />
                      <span className="w-3 shrink-0 font-mono text-xs text-muted">{String.fromCharCode(65 + n)}</span>
                      <input
                        value={o}
                        aria-label={`Option ${String.fromCharCode(65 + n)}`}
                        onChange={(e) => put(updateAt(rows, i, { options: q.options.map((x, k) => (k === n ? e.target.value : x)) }))}
                        className={`${fieldCls} !py-1.5`}
                      />
                      <button
                        type="button"
                        className={smallBtn}
                        disabled={q.options.length <= 2}
                        aria-label={`Remove option ${String.fromCharCode(65 + n)}`}
                        onClick={() =>
                          put(updateAt(rows, i, { options: removeAt(q.options, n), correct: q.correct === n ? 0 : q.correct > n ? q.correct - 1 : q.correct }))
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                {q.options.length < 6 && (
                  <button type="button" onClick={() => put(updateAt(rows, i, { options: [...q.options, ""] }))} className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-ink-soft hover:text-ink">
                    <Plus className="size-3" /> Add option
                  </button>
                )}
              </fieldset>
              <Field label="Explanation">
                <textarea value={q.explanation} rows={2} onChange={(e) => put(updateAt(rows, i, { explanation: e.target.value }))} className={areaCls} />
              </Field>
              <Field label="Topic">
                <input value={q.topic} maxLength={80} onChange={(e) => put(updateAt(rows, i, { topic: e.target.value }))} className={fieldCls} />
              </Field>
            </Row>
          ))}
          <AddRow
            label="Add question"
            onClick={() => put([...rows, { key: newId(), id: newId(), q: "", options: ["", "", "", ""], correct: 0, explanation: "", topic: rows.at(-1)?.topic ?? "" }])}
          />
        </ol>
      );
    }
    case "tasks": {
      const rows = draft.items;
      const put = (items: Extract<Draft, { type: "tasks" }>["items"]) => set({ ...draft, items });
      return (
        <ol className="space-y-3">
          {rows.map((t, i) => (
            <Row key={t.key} n={i + 1} noun="Task" anchor={t.anchor} count={rows.length} onMove={(by) => put(moveAt(rows, i, by))} onRemove={() => put(removeAt(rows, i))}>
              <textarea aria-label={`Task ${i + 1}`} value={t.task} rows={2} maxLength={500} onChange={(e) => put(updateAt(rows, i, { task: e.target.value }))} className={areaCls} />
              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="Type" value={t.kind} onChange={(e) => put(updateAt(rows, i, { kind: e.target.value as TaskKind }))} className={`${selectCls} !w-auto !rounded-xl !py-1.5 text-[13px]`} style={selectStyle}>
                  {TASK_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {TASK_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  aria-label="Due date"
                  value={t.due ?? ""}
                  onChange={(e) => put(updateAt(rows, i, { due: e.target.value || null }))}
                  className={`${fieldCls} !w-auto !py-1.5 text-[13px]`}
                />
                {t.due ? (
                  <button type="button" onClick={() => put(updateAt(rows, i, { due: null }))} className="text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline">
                    Not mentioned
                  </button>
                ) : (
                  <span className="text-[12px] text-muted italic">Not mentioned</span>
                )}
              </div>
            </Row>
          ))}
          <AddRow label="Add task" onClick={() => put([...rows, { key: newId(), id: newId(), task: "", kind: "homework", due: null, done: false }])} />
        </ol>
      );
    }
    case "generic": {
      const rows = draft.blocks;
      const put = (blocks: BlockRow[]) => set({ ...draft, blocks });
      return (
        <div className="space-y-4">
          <Field label="Intro · optional">
            <textarea value={draft.intro} rows={2} onChange={(e) => set({ ...draft, intro: e.target.value })} className={areaCls} />
          </Field>
          <ol className="space-y-3">
            {rows.map((b, i) => (
              <Row key={b.key} n={i + 1} noun="Item" anchor={b.anchor} count={rows.length} onMove={(by) => put(moveAt(rows, i, by))} onRemove={() => put(removeAt(rows, i))}>
                <Field label="Title · optional">
                  <input value={b.title} maxLength={200} onChange={(e) => put(updateAt(rows, i, { title: e.target.value }))} className={fieldCls} />
                </Field>
                <Field label="Text">
                  <textarea value={b.text} rows={Math.min(12, Math.max(3, b.text.split("\n").length + 1))} onChange={(e) => put(updateAt(rows, i, { text: e.target.value }))} className={areaCls} />
                </Field>
              </Row>
            ))}
            <AddRow label="Add item" onClick={() => put([...rows, { key: newId(), title: "", text: "" }])} />
          </ol>
        </div>
      );
    }
  }
}

/* ───────────── Editor ───────────── */

export function OutputEditor({
  data,
  label,
  onSave,
  onCancel,
  onDirty,
}: {
  data: OutputData;
  label: string;
  onSave: (data: OutputData) => Promise<void>;
  onCancel: () => void;
  /** Told whenever the draft starts or stops differing from what was loaded */
  onDirty?: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(data));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const initial = useMemo(() => JSON.stringify(fromDraft(toDraft(data))), [data]);
  const dirty = useMemo(() => JSON.stringify(fromDraft(draft)) !== initial, [draft, initial]);

  useEffect(() => {
    onDirty?.(dirty);
  }, [dirty, onDirty]);

  const save = async () => {
    const out = fromDraft(draft);
    const problem = validateOutput(out);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      await onSave(out);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const hint =
    draft.type === "flashcards"
      ? "Saving resets these cards’ review schedule."
      : draft.type === "tasks"
        ? "Ticks stay on tasks whose text you don’t change."
        : "Markdown and $maths$ work here.";

  return (
    <form
      className="rise"
      aria-label={`Edit ${label}`}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          void save();
        }
      }}
    >
      <p className="mb-4 text-[12px] text-muted">
        Your edit is saved as your own version; anyone else with this source keeps theirs. {hint}
      </p>
      <fieldset disabled={busy} className="min-w-0">
        <DraftFields
          draft={draft}
          set={(d) => {
            setDraft(d);
            setError(null);
          }}
        />
      </fieldset>
      <div className="sticky bottom-0 z-10 -mx-4 mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-card/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        {error && (
          <p className="mr-auto flex min-w-0 items-start gap-1.5 text-[12px] text-red-700" role="alert">
            <AlertCircle className="mt-px size-3.5 shrink-0" /> {error}
          </p>
        )}
        <button type="button" onClick={onCancel} disabled={busy} className="btn btn-ghost btn-sm">
          Cancel
        </button>
        <button type="submit" disabled={busy || !dirty} className="btn btn-red btn-sm">
          {busy ? <Loader2 className="spin size-3.5" /> : <Check className="size-3.5" />} Save changes
        </button>
      </div>
    </form>
  );
}
