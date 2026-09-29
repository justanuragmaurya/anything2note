"use client";

import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { AlertCircle, ArrowUpRight, Layers, Loader2, RotateCcw, Trash2 } from "lucide-react";
import type { ItemStatus, LibraryItem, ProcessingStep } from "@a2n/shared";
import { NoteTypeShape } from "@/components/site/note-type-shape";
import { errorMessage } from "@/lib/api";
import { fmtDuration, relativeDate, SOURCE_LABELS } from "@/lib/format";
import { noteType, OUTPUT_LABELS } from "@/lib/note-types";
import { SourceIcon } from "../ui";

/** Media is transcribed; everything else is extracted. Both then generate. */
const STEPS: ProcessingStep[][] = [["extracting", "transcribing"], ["generating"]];

export const STEP_LABEL: Record<ProcessingStep, string> = {
  extracting: "Reading the source",
  transcribing: "Transcribing",
  generating: "Generating notes",
};

export type ItemActions = { onRetry: (id: string) => Promise<unknown>; onDelete: (id: string) => Promise<unknown> };

export function itemSize(item: LibraryItem): string {
  if (item.durationSec !== undefined) return fmtDuration(item.durationSec);
  if (item.pages !== undefined) return `${item.pages} ${item.pages === 1 ? "page" : "pages"}`;
  return "";
}

/** Real step and progress from the API; "queued" until the workflow picks the item up. */
export function ProcessingBar({ status }: { status: Extract<ItemStatus, { state: "processing" | "queued" }> }) {
  const progress = status.state === "processing" ? status.progress : 0;
  const current = status.state === "processing" ? STEPS.findIndex((g) => g.includes(status.step)) : -1;
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.1em] uppercase">
        <span className="flex items-center gap-1.5 text-red-600">
          <span className="pulse-dot size-1.5 rounded-full bg-red-500" aria-hidden />
          {status.state === "processing" ? STEP_LABEL[status.step] : "Queued"}…
        </span>
        <span className="text-muted tabular-nums">{Math.round(progress)}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Processing">
        <div className="progress-shimmer h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out)]" style={{ width: `${Math.max(2, progress)}%` }} />
      </div>
      <ol className="mt-2 flex gap-1" aria-label="Steps">
        {STEPS.map((g, i) => (
          <li key={g[0]} className={`h-0.5 flex-1 rounded-full transition-colors duration-500 ${i < current ? "bg-red-500" : i === current ? "bg-red-300" : "bg-line"}`}>
            <span className="sr-only">
              {i === 0 ? "Reading" : "Generating"} {i < current ? "done" : i === current ? "in progress" : "pending"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StatusBadge({ status }: { status: ItemStatus }) {
  if (status.state === "ready")
    return <span className="rounded-full bg-cream/75 px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] text-ink/75 uppercase backdrop-blur">Ready</span>;
  if (status.state === "processing" || status.state === "queued")
    return (
      <span className="flex items-center gap-1 rounded-full bg-cream/80 px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] text-red-700 uppercase">
        <span className="pulse-dot size-1.5 rounded-full bg-red-500" aria-hidden /> {status.state === "queued" ? "Queued" : "Processing"}
      </span>
    );
  return <span className="rounded-full bg-red-500 px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] text-cream uppercase">Failed</span>;
}

function OutputChips({ item, max = 3 }: { item: LibraryItem; max?: number }) {
  const extra = item.outputs.length - max;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Outputs">
      {item.outputs.slice(0, max).map((o) => (
        <li key={o} className="rounded-full border border-line bg-paper px-2 py-0.5 text-[11px] text-ink-soft">
          {OUTPUT_LABELS[o]}
        </li>
      ))}
      {extra > 0 && <li className="rounded-full px-1.5 py-0.5 font-mono text-[10px] text-muted">+{extra}</li>}
    </ul>
  );
}

function Wrapper({ item, className, style, children }: { item: LibraryItem; className: string; style?: CSSProperties; children: ReactNode }) {
  if (item.status.state === "failed")
    return (
      <article className={className} style={style}>
        {children}
      </article>
    );
  return (
    <Link href={`/app/i/${item.id}`} style={style} className={`${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400`}>
      {children}
    </Link>
  );
}

function FailedRow({ item, actions }: { item: LibraryItem; actions: ItemActions }) {
  const [busy, setBusy] = useState<"retry" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (item.status.state !== "failed") return null;
  const run = async (what: "retry" | "delete") => {
    if (what === "delete" && !window.confirm(`Delete “${item.title}”?`)) return;
    setBusy(what);
    setError(null);
    try {
      await (what === "retry" ? actions.onRetry(item.id) : actions.onDelete(item.id));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-[12px] text-red-700" title={item.status.error}>
          <AlertCircle className="size-3.5 shrink-0" />
          <span className="truncate">{item.status.error}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <button type="button" disabled={busy !== null} onClick={() => run("retry")} className="btn btn-ghost btn-sm !min-h-[30px] !px-3 !py-1 text-[12px]">
            {busy === "retry" ? <Loader2 className="spin size-3" /> : <RotateCcw className="size-3" />} Retry
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("delete")}
            aria-label={`Delete ${item.title}`}
            className="grid size-[30px] place-items-center rounded-full text-red-700/70 transition-colors hover:bg-red-100 hover:text-red-700"
          >
            {busy === "delete" ? <Loader2 className="spin size-3" /> : <Trash2 className="size-3.5" />}
          </button>
        </span>
      </div>
      {error && <p className="mt-1 text-[11px] text-red-700">{error}</p>}
    </div>
  );
}

export function ItemCard({ item, actions }: { item: LibraryItem; actions: ItemActions }) {
  const nt = noteType(item.noteType);
  const failed = item.status.state === "failed";
  return (
    <Wrapper
      item={item}
      className={`group lift flex h-full flex-col overflow-hidden rounded-[22px] border bg-card ${failed ? "border-red-200" : "border-line hover:border-line-strong"}`}
    >
      <div className="grain relative h-[92px] px-4 pt-3" style={{ background: nt.color }}>
        <div className={`h-[64px] origin-bottom transition-transform duration-500 ease-[var(--ease-spring)] group-hover:scale-y-[1.1] ${failed ? "opacity-40 grayscale" : "opacity-90"}`}>
          <NoteTypeShape type={item.noteType} />
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {item.flashcardsDue ? (
            <span className="flex items-center gap-1 rounded-full bg-night/85 px-2 py-0.5 font-mono text-[9px] text-night-text">
              <Layers className="size-2.5" /> {item.flashcardsDue} due
            </span>
          ) : null}
          <StatusBadge status={item.status} />
        </div>
        <span className="absolute bottom-2.5 left-4 font-mono text-[10px] tracking-[0.14em] text-ink/70 uppercase">{nt.label}</span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2 text-muted">
          <span className="grid size-6 place-items-center rounded-lg border border-line bg-paper text-ink-soft">
            <SourceIcon kind={item.source} className="size-3.5" />
          </span>
          <span className="min-w-0 truncate font-mono text-[10px] tracking-[0.08em] uppercase">{item.sourceLabel}</span>
        </div>
        <h3 className="text-[16px] leading-snug font-medium tracking-[-0.02em] text-ink">
          {item.title}
          {!failed && <ArrowUpRight className="ml-1 inline size-3.5 -translate-y-px text-muted opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />}
        </h3>

        <div className="mt-auto space-y-3">
          {item.status.state === "processing" || item.status.state === "queued" ? (
            <ProcessingBar status={item.status} />
          ) : failed ? (
            <FailedRow item={item} actions={actions} />
          ) : (
            <OutputChips item={item} />
          )}
          <div className="flex items-center justify-between border-t border-line pt-3 font-mono text-[10px] tracking-[0.08em] text-muted uppercase">
            <span>{itemSize(item)}</span>
            <span>{relativeDate(item.createdAt)}</span>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

export function ItemRow({ item, actions }: { item: LibraryItem; actions: ItemActions }) {
  const nt = noteType(item.noteType);
  return (
    <Wrapper
      item={item}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-line bg-card py-3 pr-4 pl-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_12px_30px_-18px_rgba(60,20,10,0.35)] sm:flex-row sm:items-center sm:gap-4"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 transition-[width] duration-300 group-hover:w-2" style={{ background: nt.color }} />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-paper text-ink-soft">
          <SourceIcon kind={item.source} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium tracking-[-0.015em]">{item.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[10px] tracking-[0.08em] text-muted uppercase">
            <span className="rounded-full px-1.5 py-px text-ink/75" style={{ background: nt.color }}>
              {nt.label}
            </span>
            <span>{SOURCE_LABELS[item.source]}</span>
            {itemSize(item) && <span>· {itemSize(item)}</span>}
          </p>
        </div>
      </div>
      <div className="w-full sm:w-[240px]">
        {item.status.state === "processing" || item.status.state === "queued" ? (
          <ProcessingBar status={item.status} />
        ) : item.status.state === "failed" ? (
          <FailedRow item={item} actions={actions} />
        ) : (
          <OutputChips item={item} max={2} />
        )}
      </div>
      <span className="hidden w-[84px] shrink-0 text-right font-mono text-[10px] tracking-[0.08em] text-muted uppercase sm:block">{relativeDate(item.createdAt)}</span>
    </Wrapper>
  );
}
