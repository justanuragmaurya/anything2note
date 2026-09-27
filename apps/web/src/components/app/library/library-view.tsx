"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Folder, FolderPlus, Layers, LayoutGrid, List, Search, X } from "lucide-react";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { Art } from "@/components/ui/art";
import { DUE_CARDS, FOLDERS, LIBRARY, USER, type LibraryItem, type ProcessingStep, type SourceKind } from "@/lib/mock/app-data";
import { NOTE_TYPES, type NoteTypeKey } from "@/lib/mock/note-types";
import { PageHeader, SourceIcon, inputCls } from "../ui";
import { ItemCard, ItemRow } from "./item-card";

type SourceGroup = "all" | "media" | "docs" | "text";
const SOURCE_GROUPS: { value: SourceGroup; label: string; kinds: SourceKind[]; icon: SourceKind }[] = [
  { value: "all", label: "All sources", kinds: [], icon: "text" },
  { value: "media", label: "Media", kinds: ["youtube", "audio", "video", "recording"], icon: "audio" },
  { value: "docs", label: "Documents", kinds: ["pdf", "slides", "image"], icon: "pdf" },
  { value: "text", label: "Text & web", kinds: ["text", "web"], icon: "web" },
];

/** Advance processing items through extracting → transcribing → generating. */
function nextStatus(item: LibraryItem): LibraryItem {
  if (item.status.state !== "processing") return item;
  const progress = Math.min(100, item.status.progress + 2 + (item.id.length % 3));
  if (progress >= 100) return { ...item, status: { state: "ready" } };
  const step: ProcessingStep = progress < 30 ? "extracting" : progress < 70 ? "transcribing" : "generating";
  return { ...item, status: { state: "processing", step, progress } };
}

function greeting(): string {
  return "Good morning";
}

export function LibraryView() {
  const [items, setItems] = useState<LibraryItem[]>(LIBRARY);
  const [q, setQ] = useState("");
  const [types, setTypes] = useState<NoteTypeKey[]>([]);
  const [source, setSource] = useState<SourceGroup>("all");
  const [folder, setFolder] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const anyProcessing = items.some((i) => i.status.state === "processing");
  useEffect(() => {
    if (!anyProcessing) return;
    const id = setInterval(() => setItems((xs) => xs.map(nextStatus)), 900);
    return () => clearInterval(id);
  }, [anyProcessing]);

  const retry = (id: string) =>
    setItems((xs) => xs.map((i) => (i.id === id ? { ...i, status: { state: "processing", step: "extracting", progress: 3 } } : i)));

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const kinds = SOURCE_GROUPS.find((g) => g.value === source)!.kinds;
    return items.filter(
      (i) =>
        (!s || `${i.title} ${i.sourceLabel}`.toLowerCase().includes(s)) &&
        (types.length === 0 || types.includes(i.noteType)) &&
        (kinds.length === 0 || kinds.includes(i.source)) &&
        (folder === "all" || i.folder === folder),
    );
  }, [items, q, types, source, folder]);

  const hasFilters = q !== "" || types.length > 0 || source !== "all" || folder !== "all";
  const clear = () => {
    setQ("");
    setTypes([]);
    setSource("all");
    setFolder("all");
  };
  const toggleType = (k: NoteTypeKey) => setTypes((ts) => (ts.includes(k) ? ts.filter((x) => x !== k) : [...ts, k]));

  const thisWeek = items.filter((i) => i.createdAt > Date.parse("2026-09-21")).length;

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader
        eyebrow={`Library · ${items.length} items`}
        title={
          <>
            {greeting()}, <span className="serif-accent text-red-500">{USER.name}</span>.
          </>
        }
        sub={
          <>
            {thisWeek} new notes this week and {DUE_CARDS.length} flashcards waiting for you.
          </>
        }
        actions={
          <Link href="/app/review" className="btn btn-ghost btn-sm">
            <Layers className="size-3.5" />
            Review {DUE_CARDS.length} cards
          </Link>
        }
      />

      {/* Search + view */}
      <div className="rise mt-7 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ animationDelay: "80ms" }}>
        <label className="relative flex-1">
          <span className="sr-only">Search library</span>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles, files, channels…" className={`${inputCls} !rounded-full pl-11`} />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="absolute top-1/2 right-3 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-panel hover:text-ink">
              <X className="size-3.5" />
            </button>
          )}
        </label>
        <SlidingTabs
          tone="ink"
          size="sm"
          value={view}
          onChange={setView}
          ariaLabel="Layout"
          className="self-start sm:self-auto"
          items={[
            { value: "grid", label: "Grid", icon: <LayoutGrid className="size-3.5" /> },
            { value: "list", label: "List", icon: <List className="size-3.5" /> },
          ]}
        />
      </div>

      {/* Filters */}
      <div className="rise mt-4 space-y-3" style={{ animationDelay: "140ms" }}>
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by note type">
          {NOTE_TYPES.map((nt) => {
            const on = types.includes(nt.key);
            return (
              <button
                key={nt.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleType(nt.key)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-all duration-200 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-red-400 ${
                  on ? "border-ink/70 text-ink shadow-[inset_0_0_0_1px_var(--ink)]" : "border-line bg-card text-ink-soft hover:border-line-strong"
                }`}
                style={on ? { background: nt.color } : undefined}
              >
                <span className="size-2.5 rounded-full ring-1 ring-ink/15" style={{ background: nt.color }} aria-hidden />
                {nt.label}
              </button>
            );
          })}
          <span className="mx-1 hidden w-px self-stretch bg-line sm:block" aria-hidden />
          {SOURCE_GROUPS.map((g) => {
            const on = source === g.value;
            return (
              <button
                key={g.value}
                type="button"
                aria-pressed={on}
                onClick={() => setSource(g.value)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-all duration-200 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-red-400 ${
                  on ? "border-ink bg-ink text-cream" : "border-line bg-card text-ink-soft hover:border-line-strong"
                }`}
              >
                {g.value !== "all" && <SourceIcon kind={g.icon} className="size-3.5" />}
                {g.label}
              </button>
            );
          })}
        </div>

        {/* Folders */}
        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {FOLDERS.map((f) => {
            const on = folder === f.id;
            const count = f.id === "all" ? items.length : items.filter((i) => i.folder === f.id).length;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => setFolder(f.id)}
                className={`group inline-flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-[13px] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-red-400 ${
                  on ? "border-line-strong bg-panel text-ink" : "border-dashed border-line text-ink-soft hover:border-line-strong hover:bg-card"
                }`}
              >
                <Folder className={`size-4 transition-transform duration-300 group-hover:-rotate-6 ${on ? "fill-red-100 text-red-500" : ""}`} strokeWidth={1.7} />
                {f.name}
                <span className="font-mono text-[10px] text-muted tabular-nums">{count}</span>
              </button>
            );
          })}
          <button type="button" className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-2.5 text-[13px] text-muted transition-colors hover:text-ink" aria-label="New folder">
            <FolderPlus className="size-4" strokeWidth={1.7} /> New folder
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="mt-6 flex items-center justify-between">
        <p className="eyebrow text-[10px]">
          {filtered.length} {filtered.length === 1 ? "note" : "notes"}
          {hasFilters && " · filtered"}
        </p>
        {hasFilters && (
          <button type="button" onClick={clear} className="link-arrow text-[13px] text-red-600">
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rise mt-6 flex flex-col items-center rounded-[28px] border border-dashed border-line-strong bg-card/60 px-6 py-14 text-center">
          <Art id="empty-library" className="w-full max-w-[280px]" />
          <h2 className="mt-7 text-[26px] tracking-[-0.035em]">
            Nothing here <span className="serif-accent text-red-500">yet</span>.
          </h2>
          <p className="mt-2 max-w-[42ch] text-sm text-ink-soft">
            {hasFilters ? "No notes match those filters. Try a different type or clear them." : "Drop in a link, a recording or a PDF and your first notes appear here."}
          </p>
          <div className="mt-6 flex gap-2">
            {hasFilters && (
              <button type="button" onClick={clear} className="btn btn-ghost btn-sm">
                Clear filters
              </button>
            )}
            <Link href="/app/new" className="btn btn-red btn-sm">
              New note
            </Link>
          </div>
        </div>
      ) : view === "grid" ? (
        <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item, i) => (
            <li key={item.id} className="rise" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
              <ItemCard item={item} onRetry={retry} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-4 space-y-2">
          {filtered.map((item, i) => (
            <li key={item.id} className="rise" style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}>
              <ItemRow item={item} onRetry={retry} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
