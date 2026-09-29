"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertCircle, Folder, FolderPlus, Layers, LayoutGrid, List, Loader2, RotateCcw, Search, Trash2, X } from "lucide-react";
import type { SourceKind } from "@a2n/shared";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { Art } from "@/components/ui/art";
import { api, errorMessage } from "@/lib/api";
import { useCurrentUser } from "@/lib/auth-client";
import { greeting } from "@/lib/format";
import { NOTE_TYPES, type NoteTypeKey } from "@/lib/note-types";
import { keys, useInvalidate, useLibrary } from "@/lib/queries";
import { PageHeader, SourceIcon, inputCls } from "../ui";
import { ItemCard, ItemRow, type ItemActions } from "./item-card";

type SourceGroup = "all" | "media" | "docs" | "text";
const SOURCE_GROUPS: { value: SourceGroup; label: string; kinds: SourceKind[]; icon: SourceKind }[] = [
  { value: "all", label: "All sources", kinds: [], icon: "text" },
  { value: "media", label: "Media", kinds: ["youtube", "audio", "video", "recording"], icon: "audio" },
  { value: "docs", label: "Documents", kinds: ["pdf", "docx", "slides", "image"], icon: "pdf" },
  { value: "text", label: "Text & web", kinds: ["text", "web"], icon: "web" },
];

function NewFolder({ onCreated }: { onCreated: (id: string) => void }) {
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-2.5 text-[13px] text-muted transition-colors hover:text-ink"
      >
        <FolderPlus className="size-4" strokeWidth={1.7} /> New folder
      </button>
    );

  const create = async () => {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { folder } = await api.createFolder(n);
      await invalidate(keys.library);
      setName("");
      setOpen(false);
      onCreated(folder.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex shrink-0 items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        void create();
      }}
    >
      <input
        autoFocus
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setName("");
            setError(null);
          }
        }}
        placeholder="Folder name"
        aria-label="Folder name"
        className={`${inputCls} !w-44 !rounded-2xl !py-2`}
      />
      <button type="submit" disabled={!name.trim() || busy} className="btn btn-ink btn-sm">
        {busy ? <Loader2 className="spin size-3.5" /> : "Create"}
      </button>
      <button type="button" onClick={() => setOpen(false)} aria-label="Cancel" className="grid size-8 place-items-center rounded-full text-muted hover:bg-panel hover:text-ink">
        <X className="size-3.5" />
      </button>
      {error && <span className="text-[12px] whitespace-nowrap text-red-600">{error}</span>}
    </form>
  );
}

function LibrarySkeleton() {
  return (
    <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading library">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-[22px] border border-line bg-card p-4">
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton mt-4 h-4 w-4/5 rounded-full" />
          <div className="skeleton mt-2 h-3 w-1/2 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function LibraryView() {
  const { firstName } = useCurrentUser();
  const { data, error, isPending, refetch, isFetching } = useLibrary();
  const invalidate = useInvalidate();
  const items = useMemo(() => data?.items ?? [], [data]);
  const folders = data?.folders ?? [];
  const [q, setQ] = useState("");
  const [types, setTypes] = useState<NoteTypeKey[]>([]);
  const [source, setSource] = useState<SourceGroup>("all");
  const [folder, setFolder] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [folderError, setFolderError] = useState<string | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [now] = useState(() => Date.now());

  const actions: ItemActions = {
    onRetry: async (id) => {
      await api.retrySource(id);
      await invalidate(keys.library, keys.item(id));
    },
    onDelete: async (id) => {
      await api.deleteSource(id);
      await invalidate(keys.library, keys.tasks, keys.due);
    },
  };

  const activeFolder = folders.find((f) => f.id === folder);
  const deleteFolder = async () => {
    if (!activeFolder || !window.confirm(`Delete the folder “${activeFolder.name}”? Its notes stay in your library.`)) return;
    setDeletingFolder(true);
    setFolderError(null);
    try {
      await api.deleteFolder(activeFolder.id);
      setFolder("all");
      await invalidate(keys.library);
    } catch (e) {
      setFolderError(errorMessage(e));
    } finally {
      setDeletingFolder(false);
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const kinds = SOURCE_GROUPS.find((g) => g.value === source)!.kinds;
    return items.filter(
      (i) =>
        (!s || `${i.title} ${i.sourceLabel}`.toLowerCase().includes(s)) &&
        (types.length === 0 || types.includes(i.noteType)) &&
        (kinds.length === 0 || kinds.includes(i.source)) &&
        (folder === "all" || i.folderId === folder),
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

  const thisWeek = items.filter((i) => i.createdAt > now - 7 * 86_400_000).length;
  const due = items.reduce((n, i) => n + i.flashcardsDue, 0);

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader
        eyebrow={data ? `Library · ${items.length} ${items.length === 1 ? "item" : "items"}` : "Library"}
        title={
          <>
            {greeting()}
            {firstName && (
              <>
                , <span className="serif-accent text-red-500">{firstName}</span>
              </>
            )}
            .
          </>
        }
        sub={
          !data ? null : items.length === 0 ? (
            "Add a link, a recording or a PDF to make your first notes."
          ) : (
            <>
              {thisWeek} new {thisWeek === 1 ? "note" : "notes"} this week and {due} {due === 1 ? "flashcard" : "flashcards"} waiting for you.
            </>
          )
        }
        actions={
          due > 0 && (
            <Link href="/app/review" className="btn btn-ghost btn-sm">
              <Layers className="size-3.5" />
              Review {due} {due === 1 ? "card" : "cards"}
            </Link>
          )
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
          {[{ id: "all", name: "All items" }, ...folders].map((f) => {
            const on = folder === f.id;
            const count = f.id === "all" ? items.length : items.filter((i) => i.folderId === f.id).length;
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
          {activeFolder && (
            <button
              type="button"
              onClick={deleteFolder}
              disabled={deletingFolder}
              aria-label={`Delete folder ${activeFolder.name}`}
              title="Delete folder"
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-red-50 hover:text-red-600"
            >
              {deletingFolder ? <Loader2 className="spin size-3.5" /> : <Trash2 className="size-3.5" />}
            </button>
          )}
          <NewFolder onCreated={setFolder} />
        </div>
        {folderError && <p className="text-[12px] text-red-600">{folderError}</p>}
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

      {error && !data ? (
        <div className="rise mt-6 flex flex-col items-center rounded-[28px] border border-dashed border-red-200 bg-red-50/60 px-6 py-12 text-center">
          <AlertCircle className="size-6 text-red-500" />
          <p className="mt-3 text-sm text-red-700">{errorMessage(error)}</p>
          <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn btn-ghost btn-sm mt-4">
            {isFetching ? <Loader2 className="spin size-3.5" /> : <RotateCcw className="size-3.5" />} Try again
          </button>
        </div>
      ) : isPending ? (
        <LibrarySkeleton />
      ) : filtered.length === 0 ? (
        <div className="rise mt-6 flex flex-col items-center rounded-[28px] border border-dashed border-line-strong bg-card/60 px-6 py-14 text-center">
          <Art id="empty-library" className="w-full max-w-[280px]" />
          <h2 className="mt-7 text-[26px] tracking-[-0.035em]">
            Nothing here <span className="serif-accent text-red-500">yet</span>.
          </h2>
          <p className="mt-2 max-w-[42ch] text-sm text-ink-soft">
            {hasFilters
              ? folder !== "all" && items.length > 0 && !q && types.length === 0 && source === "all"
                ? "This folder is empty. Move a note here from its ⋯ menu."
                : "No notes match those filters. Try a different type or clear them."
              : "Drop in a link, a recording or a PDF and your first notes appear here."}
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
              <ItemCard item={item} actions={actions} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-4 space-y-2">
          {filtered.map((item, i) => (
            <li key={item.id} className="rise" style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}>
              <ItemRow item={item} actions={actions} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
