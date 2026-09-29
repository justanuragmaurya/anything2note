"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileDown,
  FileText,
  Folder,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  ScrollText,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Anchor, ItemDetail, OutputData, OutputEntry } from "@a2n/shared";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { api, ApiError, errorMessage } from "@/lib/api";
import { download, fileSafe, flashcardsCsv, toMarkdown } from "@/lib/export";
import { MEDIA_KINDS, relativeDate } from "@/lib/format";
import { noteType, OUTPUT_LABELS, type OutputKey } from "@/lib/note-types";
import { isWorking, keys, useInvalidate, useItem, useLibrary } from "@/lib/queries";
import { ProcessingBar, itemSize } from "../library/item-card";
import { Menu, MenuItem, MenuLabel } from "../menu";
import { NotFoundView } from "../not-found-view";
import { SourceIcon, inputCls } from "../ui";
import { ChatView } from "./chat";
import { WorkspaceNavContext, type WorkspaceNav } from "./context";
import type { SharedState } from "./renderers/shared";
import { StudyRenderer } from "./renderers/study";
import { TasksRenderer } from "./renderers/tasks";
import { TextRenderer } from "./renderers/text";
import { WorkspaceSkeleton } from "./skeleton";
import { chaptersFrom, ImageViewer, MediaPlayer, PageTextViewer, PdfViewer, SourceText, ViewerPlaceholder, type MediaState } from "./source-viewer";
import { TranscriptView } from "./transcript";

type TabKey = OutputKey | "transcript" | "chat";

const SHORT: Partial<Record<OutputKey, string>> = {
  summary: "Summary",
  detailed_notes: "Notes",
  revision_points: "Revision",
  tasks: "Tasks",
  mind_map: "Mind map",
  code_snippets: "Code",
};

/* ─────────────────────────── Loader ─────────────────────────── */

/** Loads the item in the browser (the API session cookie isn't visible to the Next server). */
export function WorkspaceLoader({ id, initial }: { id: string; initial?: Anchor }) {
  const { data, error, refetch, isFetching } = useItem(id);
  if (error instanceof ApiError && error.status === 404) return <NotFoundView />;
  if (!data) {
    if (!error) return <WorkspaceSkeleton />;
    return (
      <div className="rise mx-auto flex max-w-[520px] flex-col items-center py-16 text-center">
        <AlertCircle className="size-7 text-red-500" />
        <p className="mt-4 text-sm text-ink-soft">{errorMessage(error)}</p>
        <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn btn-ink btn-sm mt-5">
          {isFetching ? <Loader2 className="spin size-3.5" /> : <RotateCcw className="size-3.5" />} Try again
        </button>
      </div>
    );
  }
  return (
    <Workspace
      detail={data}
      initial={initial}
      freshMediaUrl={async () => {
        const r = await refetch();
        return r.data?.mediaUrl ?? null;
      }}
    />
  );
}

/* ─────────────────────────── Pieces ─────────────────────────── */

function Renderer({ data, state }: { data: OutputData; state: SharedState }) {
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

function OutputSkeleton({ label, queued }: { label: string; queued: boolean }) {
  return (
    <div aria-busy="true" aria-label={`${queued ? "Waiting to write" : "Writing"} ${label}`}>
      <p className="mb-5 flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-red-600 uppercase">
        <Sparkles className={`size-3 ${queued ? "" : "spin"}`} /> {queued ? `${label} is queued` : `Writing ${label.toLowerCase()}`}
        {!queued && <span className="caret" />}
      </p>
      <div className="space-y-3">
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-4 w-4/5 rounded-full" />
        <div className="skeleton h-4 w-3/5 rounded-full" />
        <div className="skeleton h-16 rounded-2xl" />
        <div className="skeleton h-16 rounded-2xl" />
      </div>
    </div>
  );
}

function Failed({ title, error, canRetry, onRetry }: { title: string; error: string; canRetry: boolean; onRetry: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  return (
    <div className="rounded-[22px] border border-red-200 bg-red-50 p-5" role="alert">
      <p className="font-medium text-red-800">{title}</p>
      <p className="mt-1 flex items-start gap-2 text-sm text-red-800/85">
        <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
      </p>
      {retryError && <p className="mt-2 text-[12px] text-red-700">{retryError}</p>}
      {canRetry && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setRetryError(null);
            try {
              await onRetry();
            } catch (e) {
              setRetryError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
          className="btn btn-red btn-sm mt-4"
        >
          {busy ? <Loader2 className="spin size-3.5" /> : <RotateCcw className="size-3.5" />} Retry
        </button>
      )}
    </div>
  );
}

function TitleEditor({ title, onSave, onCancel }: { title: string; onSave: (t: string) => Promise<void>; onCancel: () => void }) {
  const [draft, setDraft] = useState(title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="mt-2 flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const t = draft.trim();
        if (!t || t === title) return onCancel();
        setBusy(true);
        setError(null);
        try {
          await onSave(t);
        } catch (err) {
          setError(errorMessage(err));
          setBusy(false);
        }
      }}
    >
      <input
        autoFocus
        value={draft}
        maxLength={200}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        aria-label="Title"
        className={`${inputCls} min-w-0 flex-1 !py-2 text-[20px] tracking-[-0.03em]`}
      />
      <button type="submit" disabled={busy} className="btn btn-red btn-sm">
        {busy ? <Loader2 className="spin size-3.5" /> : <Check className="size-3.5" />} Save
      </button>
      <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">
        Cancel
      </button>
      {error && <p className="w-full text-[12px] text-red-600">{error}</p>}
    </form>
  );
}

const iconBtn =
  "grid size-8 place-items-center rounded-full text-ink-soft transition-all duration-200 hover:bg-panel hover:text-ink active:scale-90 focus-visible:outline-2 focus-visible:outline-red-400";

/* ─────────────────────────── Workspace ─────────────────────────── */

function Workspace({ detail, initial, freshMediaUrl }: { detail: ItemDetail; initial?: Anchor; freshMediaUrl: () => Promise<string | null> }) {
  const router = useRouter();
  const invalidate = useInvalidate();
  const { data: library } = useLibrary();
  const { item, content } = detail;
  const nt = noteType(item.noteType);
  const working = isWorking(item);
  const contentKind = content?.kind ?? null;
  const segments = useMemo(() => content?.segments ?? [], [content]);
  const isMedia = MEDIA_KINDS.includes(item.source);

  useEffect(() => {
    document.title = `${item.title} · anything2note`;
  }, [item.title]);

  /* ── source viewer ── */
  // The signed URL changes on every fetch; keep the first one so polling doesn't reload the player.
  const [mediaUrl, setMediaUrl] = useState(detail.mediaUrl);
  const mediaRef = useRef<(HTMLVideoElement & HTMLAudioElement) | null>(null);
  const [media, setMedia] = useState<MediaState>({ time: initial?.kind === "time" ? initial.at : 0, duration: item.durationSec ?? 0, playing: false, speed: 1, error: false });
  const [page, setPage] = useState(initial?.kind === "page" ? initial.page : 1);
  const [flash, setFlash] = useState(0);
  const viewerRef = useRef<HTMLDivElement>(null);
  const startAt = useRef(initial?.kind === "time" ? initial.at : 0);
  const totalPages = item.pages ?? Math.max(1, ...segments.map((s) => (s.anchor?.kind === "page" ? s.anchor.page : 1)));

  const patchMedia = useCallback((p: Partial<MediaState>) => setMedia((m) => ({ ...m, ...p })), []);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    const onMeta = () => {
      if (startAt.current) {
        el.currentTime = startAt.current;
        startAt.current = 0;
      }
    };
    el.addEventListener("loadedmetadata", onMeta);
    return () => el.removeEventListener("loadedmetadata", onMeta);
  }, [mediaUrl]);

  const seek = useCallback((a: Anchor) => {
    if (a.kind === "time") {
      const el = mediaRef.current;
      if (el) {
        el.currentTime = a.at;
        void el.play().catch(() => {});
      }
      setMedia((m) => ({ ...m, time: a.at }));
    } else {
      setPage(a.page);
      setFlash((f) => f + 1);
    }
    const el = viewerRef.current;
    if (el && window.innerWidth < 1024) {
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.top > window.innerHeight * 0.5) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const nav = useMemo<WorkspaceNav>(() => ({ time: media.time, page, seek }), [media.time, page, seek]);

  const reloadMedia = async () => {
    const url = await freshMediaUrl();
    patchMedia({ error: false });
    setMediaUrl(url);
  };

  /* ── outputs ── */
  const showTranscript = isMedia || contentKind === "document" || (contentKind === null && ["pdf", "slides", "image"].includes(item.source));
  const transcriptLabel = isMedia ? "Transcript" : item.source === "image" ? "Text" : "Pages";
  const tabs: TabKey[] = [...item.outputs, ...(showTranscript ? (["transcript"] as const) : []), "chat"];
  const [picked, setPicked] = useState<TabKey | null>(null);
  const tab: TabKey = picked && tabs.includes(picked) ? picked : tabs[0]!;
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [tasksDone, setTasksDone] = useState<Record<string, boolean>>({});
  const bodyRef = useRef<HTMLDivElement>(null);
  const notify = setToast;

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  const tabLabel = (k: TabKey) => (k === "transcript" ? transcriptLabel : k === "chat" ? "Chat" : (SHORT[k] ?? OUTPUT_LABELS[k]));
  const tabIcon = (k: TabKey): ReactNode => {
    if (k === "chat") return <MessageSquare className="size-3.5" />;
    if (k === "transcript") return <ScrollText className="size-3.5" />;
    const s = detail.outputs[k]?.status;
    if (s === "running" || ((!s || s === "queued") && working)) return <Loader2 className="spin size-3.5" aria-label="In progress" />;
    if (s === "failed") return <AlertCircle className="size-3.5 text-red-500" aria-label="Failed" />;
    return undefined;
  };

  const retry = async () => {
    await api.retrySource(item.id);
    await invalidate(keys.item(item.id), keys.library);
  };

  const shared = (outputKey: OutputKey): SharedState => ({
    itemId: item.id,
    outputKey,
    noteType: item.noteType,
    color: nt.color,
    contentKind,
    flashcardsDue: item.flashcardsDue,
    tasksDone,
    toggleTask: (id, done) => {
      setTasksDone((d) => ({ ...d, [id]: done }));
      api
        .updateTask(id, done)
        .then(() => invalidate(keys.tasks))
        .catch((e: unknown) => {
          setTasksDone((d) => ({ ...d, [id]: !done }));
          notify(errorMessage(e));
        });
    },
  });

  const copy = async () => {
    const text = bodyRef.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      notify("Copy was blocked by the browser");
    }
  };

  const rename = async (title: string) => {
    await api.updateSource(item.id, { title });
    await invalidate(keys.item(item.id), keys.library, keys.tasks);
    setRenaming(false);
    notify("Renamed");
  };

  const move = async (folderId: string | null, name: string) => {
    try {
      await api.updateSource(item.id, { folderId });
      await invalidate(keys.item(item.id), keys.library);
      notify(folderId ? `Moved to ${name}` : "Removed from folder");
    } catch (e) {
      notify(errorMessage(e));
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete “${item.title}”? Its notes, flashcards and tasks go too. This can’t be undone.`)) return;
    try {
      await api.deleteSource(item.id);
      router.push("/app");
      void invalidate(keys.library, keys.tasks, keys.due);
    } catch (e) {
      notify(errorMessage(e));
    }
  };

  const entry: OutputEntry | undefined = tab === "transcript" || tab === "chat" ? undefined : detail.outputs[tab];
  const readyData = entry?.status === "ready" ? entry.data : undefined;
  const caption = isMedia ? ([...segments].reverse().find((l) => l.anchor?.kind === "time" && l.anchor.at <= media.time + 0.5) ?? null) : null;
  const notes = detail.outputs.detailed_notes?.data;
  const chapters = chaptersFrom(notes?.type === "notes" ? notes.sections : undefined);
  const folders = library?.folders ?? [];
  const folderName = folders.find((f) => f.id === item.folderId)?.name;

  let body: ReactNode;
  if (tab === "transcript")
    body = content ? (
      <TranscriptView segments={segments} kind={content.kind} />
    ) : (
      <p className="text-sm text-muted">{working ? "The source is still being read. Its text shows up here when it’s done." : "No text was extracted from this source."}</p>
    );
  else if (tab === "chat") body = <ChatView key={item.id} itemId={item.id} itemTitle={item.title} history={detail.chat} contentKind={contentKind} />;
  else if (!entry || entry.status === "queued" || entry.status === "running") {
    if (working || entry) body = <OutputSkeleton label={OUTPUT_LABELS[tab]} queued={!entry || entry.status === "queued"} />;
    else if (item.status.state === "failed") body = <p className="text-sm text-muted">{OUTPUT_LABELS[tab]} wasn’t made because processing stopped first.</p>;
    else body = <Failed title={`${OUTPUT_LABELS[tab]} wasn’t generated`} error="Processing finished before this output was made." canRetry onRetry={retry} />;
  } else if (entry.status === "failed")
    body = <Failed title={`${OUTPUT_LABELS[tab]} failed`} error={entry.error ?? "Something went wrong while writing this."} canRetry={!working} onRetry={retry} />;
  else if (readyData) body = <Renderer data={readyData} state={shared(tab)} />;
  else body = <p className="text-sm text-muted">This output came back empty.</p>;

  let viewer: ReactNode;
  if (isMedia)
    viewer = mediaUrl ? (
      <MediaPlayer
        src={mediaUrl}
        video={item.source === "video" || !!detail.mediaType?.startsWith("video/")}
        title={item.title}
        label={item.sourceLabel}
        chapters={chapters}
        caption={caption}
        mediaRef={mediaRef}
        state={media}
        onState={patchMedia}
        onReload={reloadMedia}
      />
    ) : (
      <ViewerPlaceholder item={item} message="The original recording isn’t available." />
    );
  else if (item.source === "pdf")
    viewer = mediaUrl ? (
      <PdfViewer src={mediaUrl} page={page} total={totalPages} label={item.sourceLabel} flash={flash} onPage={(n) => seek({ kind: "page", page: n })} />
    ) : (
      <ViewerPlaceholder item={item} message="The original PDF isn’t available." />
    );
  else if (item.source === "image")
    viewer = mediaUrl ? <ImageViewer src={mediaUrl} label={item.sourceLabel} /> : <ViewerPlaceholder item={item} message="The original image isn’t available." />;
  else if (item.source === "slides" && contentKind === "document")
    viewer = <PageTextViewer segments={segments} page={page} total={totalPages} label={item.sourceLabel} flash={flash} onPage={(n) => seek({ kind: "page", page: n })} href={mediaUrl} />;
  else
    viewer = segments.length ? (
      <SourceText item={item} segments={segments} href={mediaUrl} />
    ) : (
      <ViewerPlaceholder item={item} message={working ? "Reading the source…" : "No text was extracted from this source."} />
    );

  return (
    <WorkspaceNavContext.Provider value={nav}>
      <div className="mx-auto max-w-[1360px]">
        {/* Header */}
        <header className="rise">
          <Link href="/app" className="group inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink">
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" /> Library
          </Link>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
                <span className="rounded-full px-2 py-0.5 text-ink/80" style={{ background: nt.color }}>
                  {nt.label}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <SourceIcon kind={item.source} className="size-3.5" /> {item.sourceLabel}
                </span>
                {itemSize(item) && <span>· {itemSize(item)}</span>}
                <span>· {relativeDate(item.createdAt)}</span>
                {folderName && (
                  <span className="inline-flex items-center gap-1">
                    · <Folder className="size-3" /> {folderName}
                  </span>
                )}
              </div>
              {renaming ? (
                <TitleEditor title={item.title} onSave={rename} onCancel={() => setRenaming(false)} />
              ) : (
                <h1 className="mt-2 text-[28px] leading-[1.08] tracking-[-0.04em] text-balance sm:text-[36px]">{item.title}</h1>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Menu
                label="Note actions"
                width="w-60"
                triggerClassName="btn btn-ghost btn-sm !px-3"
                trigger={
                  <>
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only sm:not-sr-only">More</span>
                  </>
                }
              >
                {(close) => (
                  <div className="max-h-[360px] overflow-y-auto">
                    <MenuItem
                      onSelect={() => {
                        close();
                        setRenaming(true);
                      }}
                    >
                      <Pencil className="size-3.5" /> Rename
                    </MenuItem>
                    <MenuLabel>Move to folder</MenuLabel>
                    {folders.length === 0 && <p className="px-3 pb-2 text-[12px] text-muted">Create folders from the library.</p>}
                    {folders.map((f) => (
                      <MenuItem
                        key={f.id}
                        hint={f.id === item.folderId ? <Check className="size-3.5 text-red-500" /> : undefined}
                        onSelect={() => {
                          close();
                          if (f.id !== item.folderId) void move(f.id, f.name);
                        }}
                      >
                        <Folder className="size-3.5" /> {f.name}
                      </MenuItem>
                    ))}
                    {item.folderId && (
                      <MenuItem
                        onSelect={() => {
                          close();
                          void move(null, "");
                        }}
                      >
                        <Folder className="size-3.5 text-muted" /> Remove from folder
                      </MenuItem>
                    )}
                    <div className="my-1 h-px bg-line" />
                    <MenuItem
                      onSelect={() => {
                        close();
                        void remove();
                      }}
                    >
                      <Trash2 className="size-3.5 text-red-600" /> <span className="text-red-700">Delete note</span>
                    </MenuItem>
                  </div>
                )}
              </Menu>
              <Link href="/app/new" className="btn btn-ink btn-sm">
                <Plus className="size-3.5" /> New note
              </Link>
            </div>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
          {/* Source viewer */}
          <div ref={viewerRef} className="rise scroll-mt-20 lg:sticky lg:top-6 lg:self-start" style={{ animationDelay: "80ms" }}>
            {viewer}
          </div>

          {/* Outputs */}
          <section className="rise min-w-0 rounded-[28px] border border-line bg-card shadow-[0_30px_60px_-45px_rgba(60,20,10,0.45)]" style={{ animationDelay: "140ms" }} aria-label="Outputs">
            <div className="flex items-center gap-2 border-b border-line p-3 sm:p-4">
              <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto">
                <SlidingTabs size="sm" value={tab} onChange={setPicked} ariaLabel="Outputs" items={tabs.map((k) => ({ value: k, label: tabLabel(k), icon: tabIcon(k) }))} />
              </div>
            </div>

            {/* Toolbar */}
            {readyData && (
              <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2 sm:px-5">
                <p className="flex min-w-0 items-center gap-2 truncate font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
                  <span className="truncate">{OUTPUT_LABELS[tab as OutputKey]}</span>
                  <span className="hidden sm:inline">· {relativeDate(item.createdAt)}</span>
                </p>
                <div className="flex items-center gap-0.5">
                  <button type="button" onClick={copy} className={iconBtn} aria-label={copied ? "Copied" : "Copy"} title="Copy">
                    {copied ? <Check className="tick-pop size-3.5 text-green-700" /> : <Copy className="size-3.5" />}
                  </button>
                  <Menu
                    label="Export"
                    triggerClassName="ml-1 inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1.5 text-[12px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
                    trigger={
                      <>
                        <Download className="size-3.5" /> Export <ChevronDown className="size-3" />
                      </>
                    }
                  >
                    {(close) => {
                      const k = tab as OutputKey;
                      const name = `${fileSafe(item.title)} - ${OUTPUT_LABELS[k]}`;
                      return (
                        <>
                          <MenuItem
                            hint=".md"
                            onSelect={() => {
                              close();
                              download(`${name}.md`, toMarkdown(item.title, OUTPUT_LABELS[k], readyData), "text/markdown;charset=utf-8");
                            }}
                          >
                            <FileText className="size-3.5" /> Markdown
                          </MenuItem>
                          {readyData.type === "flashcards" && (
                            <MenuItem
                              hint=".csv"
                              onSelect={() => {
                                close();
                                download(`${name}.csv`, flashcardsCsv(readyData), "text/csv;charset=utf-8");
                              }}
                            >
                              <FileDown className="size-3.5" /> Anki deck
                            </MenuItem>
                          )}
                        </>
                      );
                    }}
                  </Menu>
                </div>
              </div>
            )}

            {(item.status.state === "processing" || item.status.state === "queued") && (
              <div className="border-b border-line bg-red-50/50 px-5 py-4">
                <ProcessingBar status={item.status} />
                <p className="mt-2 text-[12px] text-ink-soft">Outputs appear here as soon as each one is ready. You can leave this page.</p>
              </div>
            )}
            {item.status.state === "failed" && tab !== "chat" && tab !== "transcript" && entry?.status !== "failed" && (
              <div className="border-b border-line p-4 sm:px-5">
                <Failed title="Processing failed" error={item.status.error} canRetry onRetry={retry} />
              </div>
            )}

            <div key={tab} ref={bodyRef} className="rise p-4 sm:p-6">
              {body}
            </div>
          </section>
        </div>

        {toast && (
          <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8 lg:pl-[264px]">
            <p key={toast} role="status" className="rise flex items-center gap-2 rounded-full bg-night px-4 py-2.5 text-[13px] text-night-text shadow-xl">
              <Check className="size-3.5 text-red-400" /> {toast}
            </p>
          </div>
        )}
      </div>
    </WorkspaceNavContext.Provider>
  );
}
