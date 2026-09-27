"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileDown,
  FileText,
  Link2,
  Mail,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  ScrollText,
  Share2,
  Sparkles,
} from "lucide-react";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { relativeDate, type Anchor, type OutputData, type Workspace as WorkspaceData } from "@/lib/mock/app-data";
import { noteType, OUTPUT_LABELS, type OutputKey } from "@/lib/mock/note-types";
import { ProcessingBar, itemSize } from "../library/item-card";
import { Menu, MenuItem, MenuLabel } from "../menu";
import { SourceIcon } from "../ui";
import { ChatView } from "./chat";
import { WorkspaceNavContext, type WorkspaceNav } from "./context";
import { MeetingRenderer } from "./renderers/meeting";
import type { SharedState } from "./renderers/shared";
import { StudyRenderer } from "./renderers/study";
import { TextRenderer } from "./renderers/text";
import { chaptersFrom, MediaPlayer, PdfViewer } from "./source-viewer";
import { TranscriptView } from "./transcript";

type TabKey = OutputKey | "transcript" | "chat";

const SHORT: Partial<Record<OutputKey, string>> = {
  minutes: "Minutes",
  summary: "Summary",
  detailed_notes: "Notes",
  revision_points: "Revision",
  action_items: "Action items",
  open_questions: "Open questions",
  follow_up_email: "Follow-up email",
  mind_map: "Mind map",
  code_snippets: "Code",
};

const tabLabel = (k: TabKey) => (k === "transcript" ? "Transcript" : k === "chat" ? "Chat" : (SHORT[k] ?? OUTPUT_LABELS[k]));

/** Generic stand-in for outputs we don't have hand-written mock content for. */
function fallbackOutput(ws: WorkspaceData, key: OutputKey): OutputData {
  return {
    type: "generic",
    intro: `${OUTPUT_LABELS[key]}, generated from the source.`,
    blocks: ws.transcript.slice(0, 4).map((l, i) => ({ title: `${OUTPUT_LABELS[key]} · ${i + 1}`, text: l.text, anchor: l.anchor })),
  };
}

function Renderer({ data, state }: { data: OutputData; state: SharedState }) {
  switch (data.type) {
    case "minutes":
    case "actions":
    case "decisions":
      return <MeetingRenderer data={data} state={state} />;
    case "flashcards":
    case "quiz":
      return <StudyRenderer data={data} state={state} />;
    default:
      return <TextRenderer data={data} state={state} />;
  }
}

function OutputSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={`Generating ${label}`}>
      <p className="mb-5 flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-red-600 uppercase">
        <Sparkles className="spin size-3" /> Writing {label.toLowerCase()}
        <span className="caret" />
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

const iconBtn =
  "grid size-8 place-items-center rounded-full text-ink-soft transition-all duration-200 hover:bg-panel hover:text-ink active:scale-90 focus-visible:outline-2 focus-visible:outline-red-400";

export function Workspace({ ws, initial }: { ws: WorkspaceData; initial?: Anchor }) {
  const { item } = ws;
  const nt = noteType(item.noteType);
  const processing = item.status.state === "processing";

  /* ── player / viewer state ── */
  const [time, setTime] = useState(initial?.kind === "time" ? initial.at : 0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [page, setPage] = useState(initial?.kind === "page" ? initial.page : 1);
  const [flash, setFlash] = useState(0);
  const viewerRef = useRef<HTMLDivElement>(null);
  const duration = ws.viewer.kind === "media" ? ws.viewer.durationSec : 0;

  const timeRef = useRef(time);
  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const next = timeRef.current + 0.25 * speed;
      if (next >= duration) {
        setTime(duration);
        setPlaying(false);
      } else setTime(next);
    }, 250);
    return () => clearInterval(id);
  }, [playing, speed, duration]);

  const seek = useCallback((a: Anchor) => {
    if (a.kind === "time") {
      setTime(a.at);
      setPlaying(true);
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

  const nav = useMemo<WorkspaceNav>(() => ({ time, page, seek }), [time, page, seek]);

  /* ── outputs ── */
  const [outputKeys, setOutputKeys] = useState<OutputKey[]>(item.outputs);
  const [extra, setExtra] = useState<Partial<Record<OutputKey, OutputData>>>({});
  const [tab, setTab] = useState<TabKey>(item.outputs[0] ?? "transcript");
  const [generating, setGenerating] = useState<Partial<Record<TabKey, boolean>>>({});
  const [version, setVersion] = useState<Partial<Record<TabKey, number>>>({});
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [edited, setEdited] = useState<Partial<Record<TabKey, boolean>>>({});
  const [toast, setToast] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [speakers, setSpeakers] = useState(ws.speakers);
  const [actionsDone, setActionsDone] = useState<Record<string, boolean>>(() => {
    const acts = ws.outputs.action_items;
    return acts?.type === "actions" ? Object.fromEntries(acts.items.map((a) => [a.id, a.done])) : {};
  });

  useEffect(() => {
    const ts = timers.current;
    return () => ts.forEach(clearTimeout);
  }, []);

  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  const notify = (msg: string) => {
    setToast(msg);
    later(() => setToast((t) => (t === msg ? null : t)), 2400);
  };

  const shared: SharedState = {
    itemId: item.id,
    noteType: item.noteType,
    color: nt.color,
    actionsDone,
    toggleAction: (id) => setActionsDone((d) => ({ ...d, [id]: !d[id] })),
    speakers,
  };

  const tabs: TabKey[] = [...outputKeys, "transcript", "chat"];
  const addable = {
    suggested: nt.optional.filter((k) => !outputKeys.includes(k)),
    more: (Object.keys(OUTPUT_LABELS) as OutputKey[]).filter((k) => !outputKeys.includes(k) && !nt.optional.includes(k)),
  };

  const changeTab = (k: TabKey) => {
    setEditing(false);
    setTab(k);
  };

  const generate = (k: TabKey, ms = 1500) => {
    setGenerating((g) => ({ ...g, [k]: true }));
    later(() => {
      setGenerating((g) => ({ ...g, [k]: false }));
      setVersion((v) => ({ ...v, [k]: (v[k] ?? 0) + 1 }));
    }, ms);
  };

  const addOutput = (k: OutputKey) => {
    setOutputKeys((ks) => [...ks, k]);
    setExtra((e) => ({ ...e, [k]: ws.outputs[k] ?? fallbackOutput(ws, k) }));
    changeTab(k);
    generate(k, 2200);
    notify(`Generating ${OUTPUT_LABELS[k].toLowerCase()}…`);
  };

  const copy = async () => {
    const text = bodyRef.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard can be blocked; still show feedback in the mock */
    }
    setCopied(true);
    later(() => setCopied(false), 1500);
  };

  const outputData: OutputData | null = tab === "transcript" || tab === "chat" ? null : (ws.outputs[tab] ?? extra[tab] ?? fallbackOutput(ws, tab));
  const isOutput = outputData !== null;
  const caption = ws.viewer.kind === "media" ? ([...ws.transcript].reverse().find((l) => l.anchor.kind === "time" && l.anchor.at <= time + 0.5) ?? null) : null;
  const chapters = chaptersFrom(ws.outputs.detailed_notes?.type === "notes" ? ws.outputs.detailed_notes.sections : undefined);

  let body: ReactNode;
  if (processing) body = <OutputSkeleton label={tabLabel(tab)} />;
  else if (generating[tab]) body = <OutputSkeleton label={tabLabel(tab)} />;
  else if (tab === "transcript")
    body = <TranscriptView lines={ws.transcript} speakers={speakers} onRename={(id, name) => setSpeakers((s) => ({ ...s, [id]: name }))} />;
  else if (tab === "chat") body = <ChatView chat={ws.chat} itemTitle={item.title} />;
  else if (outputData) body = <Renderer data={outputData} state={shared} />;

  return (
    <WorkspaceNavContext.Provider value={nav}>
      <div className="mx-auto max-w-[1360px]">
        {/* Header */}
        <header className="rise">
          <Link href="/app" className="group inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink">
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" /> Library
          </Link>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
                <span className="rounded-full px-2 py-0.5 text-ink/80" style={{ background: nt.color }}>
                  {nt.label}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <SourceIcon kind={item.source} className="size-3.5" /> {item.sourceLabel}
                </span>
                <span>· {itemSize(item)}</span>
                <span>· {relativeDate(item.createdAt)}</span>
              </div>
              <h1 className="mt-2 text-[28px] leading-[1.08] tracking-[-0.04em] text-balance sm:text-[36px]">{item.title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => notify("Read-only link copied")} className="btn btn-ghost btn-sm">
                <Share2 className="size-3.5" /> Share
              </button>
              <Link href="/app/new" className="btn btn-ink btn-sm">
                <Plus className="size-3.5" /> New note
              </Link>
            </div>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
          {/* Source viewer */}
          <div ref={viewerRef} className="rise scroll-mt-20 lg:sticky lg:top-6 lg:self-start" style={{ animationDelay: "80ms" }}>
            {ws.viewer.kind === "media" ? (
              <MediaPlayer
                duration={ws.viewer.durationSec}
                time={time}
                playing={playing}
                speed={speed}
                video={ws.viewer.video}
                label={ws.viewer.label}
                title={item.title}
                chapters={chapters}
                caption={caption}
                onToggle={() => setPlaying((p) => !p)}
                onSeek={(s) => setTime(s)}
                onSpeed={setSpeed}
              />
            ) : (
              <PdfViewer pages={ws.viewer.pages} total={item.pages ?? ws.viewer.pages.length} page={page} label={ws.viewer.label} flash={flash} onPage={(n) => seek({ kind: "page", page: n })} />
            )}
          </div>

          {/* Outputs */}
          <section className="rise min-w-0 rounded-[28px] border border-line bg-card shadow-[0_30px_60px_-45px_rgba(60,20,10,0.45)]" style={{ animationDelay: "140ms" }} aria-label="Outputs">
            <div className="flex items-center gap-2 border-b border-line p-3 sm:p-4">
              <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto">
                <SlidingTabs
                  size="sm"
                  value={tab}
                  onChange={changeTab}
                  ariaLabel="Outputs"
                  items={tabs.map((k) => ({
                    value: k,
                    label: tabLabel(k),
                    icon: k === "chat" ? <MessageSquare className="size-3.5" /> : k === "transcript" ? <ScrollText className="size-3.5" /> : undefined,
                  }))}
                />
              </div>
              <Menu
                label="Add output"
                width="w-64"
                triggerClassName="btn btn-ghost btn-sm shrink-0 !px-3"
                trigger={
                  <>
                    <Plus className="size-3.5" />
                    <span className="hidden sm:inline">Add output</span>
                  </>
                }
              >
                {(close) => (
                  <div className="max-h-[360px] overflow-y-auto">
                    {addable.suggested.length > 0 && <MenuLabel>Suggested for {nt.label.toLowerCase()}</MenuLabel>}
                    {addable.suggested.map((k) => (
                      <MenuItem
                        key={k}
                        onSelect={() => {
                          close();
                          addOutput(k);
                        }}
                      >
                        <Sparkles className="size-3.5 text-red-500" /> {OUTPUT_LABELS[k]}
                      </MenuItem>
                    ))}
                    <MenuLabel>More outputs</MenuLabel>
                    {addable.more.map((k) => (
                      <MenuItem
                        key={k}
                        onSelect={() => {
                          close();
                          addOutput(k);
                        }}
                      >
                        <Plus className="size-3.5 text-muted" /> {OUTPUT_LABELS[k]}
                      </MenuItem>
                    ))}
                  </div>
                )}
              </Menu>
            </div>

            {/* Toolbar */}
            {isOutput && !processing && (
              <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2 sm:px-5">
                <p className="flex min-w-0 items-center gap-2 truncate font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
                  <span className="truncate">{OUTPUT_LABELS[tab as OutputKey]}</span>
                  <span className="hidden sm:inline">· {version[tab] ? "just now" : relativeDate(item.createdAt)}</span>
                  {edited[tab] && <span className="rounded-full bg-panel px-1.5 py-px text-ink-soft">edited</span>}
                </p>
                <div className="flex items-center gap-0.5">
                  {editing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false);
                          setVersion((v) => ({ ...v, [tab]: (v[tab] ?? 0) + 1 }));
                        }}
                        className="btn btn-ghost btn-sm !min-h-[30px] !py-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false);
                          setEdited((e) => ({ ...e, [tab]: true }));
                          notify("Edits saved");
                        }}
                        className="btn btn-red btn-sm !min-h-[30px] !py-1"
                      >
                        <Check className="size-3.5" /> Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => generate(tab)} className={iconBtn} aria-label="Regenerate" title="Regenerate">
                        <RefreshCw className={`size-3.5 ${generating[tab] ? "spin" : ""}`} />
                      </button>
                      <button type="button" onClick={() => setEditing(true)} className={iconBtn} aria-label="Edit" title="Edit">
                        <Pencil className="size-3.5" />
                      </button>
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
                          const pick = (what: string) => {
                            close();
                            notify(`${what} ready`);
                          };
                          return (
                            <>
                              <MenuItem onSelect={() => pick("Markdown")} hint=".md">
                                <FileText className="size-3.5" /> Markdown
                              </MenuItem>
                              <MenuItem onSelect={() => pick("PDF")} hint=".pdf">
                                <FileDown className="size-3.5" /> PDF
                              </MenuItem>
                              <MenuItem onSelect={() => pick("DOCX")} hint=".docx">
                                <FileDown className="size-3.5" /> Word document
                              </MenuItem>
                              {outputData?.type === "flashcards" && (
                                <MenuItem onSelect={() => pick("Anki CSV")} hint=".csv">
                                  <FileDown className="size-3.5" /> Anki deck
                                </MenuItem>
                              )}
                              {item.noteType === "meeting" && (
                                <MenuItem onSelect={() => pick("Email draft")}>
                                  <Mail className="size-3.5" /> Copy as email
                                </MenuItem>
                              )}
                              <MenuItem onSelect={() => pick("Share link")}>
                                <Link2 className="size-3.5" /> Share read-only link
                              </MenuItem>
                            </>
                          );
                        }}
                      </Menu>
                    </>
                  )}
                </div>
              </div>
            )}

            {processing && item.status.state === "processing" && (
              <div className="border-b border-line bg-red-50/50 px-5 py-4">
                <ProcessingBar status={item.status} />
                <p className="mt-2 text-[12px] text-ink-soft">Outputs appear here as soon as each one is ready. You can leave this page.</p>
              </div>
            )}

            <div
              key={`${tab}-${version[tab] ?? 0}`}
              ref={bodyRef}
              contentEditable={editing && isOutput}
              suppressContentEditableWarning
              className={`rise p-4 outline-none sm:p-6 ${editing ? "m-2 rounded-2xl bg-paper/60 shadow-[inset_0_0_0_1.5px_var(--red-300)]" : ""}`}
            >
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
