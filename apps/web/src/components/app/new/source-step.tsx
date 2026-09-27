"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Check, ClipboardPaste, Globe, Link2, Mic, Pause, Play, Square, Trash2, Upload, UsersRound, X } from "lucide-react";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { fmtTime, seeded, type SourceKind } from "@/lib/mock/app-data";
import { SourceIcon, YoutubeGlyph, inputCls } from "../ui";

export type SourceTab = "link" | "upload" | "record" | "text" | "url";

export type PickedSource = { kind: SourceKind; label: string; detail: string };

type UploadFile = { name: string; size: number; kind: SourceKind; progress: number };

const YT_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i;

function kindFromName(name: string): SourceKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["mp3", "m4a", "wav", "ogg", "opus", "flac", "aac"].includes(ext)) return "audio";
  if (["mp4", "mov", "mkv", "webm", "avi"].includes(ext)) return "video";
  if (["ppt", "pptx", "odp", "doc", "docx", "odt", "rtf"].includes(ext)) return "slides";
  if (["jpg", "jpeg", "png", "webp", "heic"].includes(ext)) return "image";
  return "text";
}

const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

/* ─────────────────────────── Recorder ─────────────────────────── */

type RecState = "idle" | "recording" | "paused" | "stopped";

function Recorder({ onDone, onClear }: { onDone: (secs: number) => void; onClear: () => void }) {
  const [state, setState] = useState<RecState>("idle");
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (state !== "recording") return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  const live = state === "recording" || state === "paused";

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-left" role="note">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-red-500 text-cream">
          <UsersRound className="size-4" />
        </span>
        <div className="text-[13px]">
          <p className="font-medium text-red-800">Let everyone know you’re recording.</p>
          <p className="mt-0.5 text-red-800/75">Say it out loud at the start. In many places recording without consent is illegal.</p>
        </div>
      </div>

      <div className="relative mt-8 grid place-items-center">
        {state === "recording" && <span className="absolute size-40 animate-ping rounded-full bg-red-400/10" aria-hidden />}
        <button
          type="button"
          onClick={() => {
            if (live) {
              setState("stopped");
              onDone(secs);
            } else {
              setSecs(0);
              setState("recording");
              onClear();
            }
          }}
          aria-label={live ? "Stop recording" : "Start recording"}
          className={`relative grid size-28 place-items-center rounded-full border-4 border-cream bg-[image:var(--button-red)] text-cream shadow-[0_18px_40px_-14px_rgba(200,35,26,0.7)] transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400 ${
            state === "recording" ? "rec-pulse" : ""
          }`}
        >
          {live ? <Square className="size-8 fill-current" /> : <Mic className="size-9" strokeWidth={1.8} />}
        </button>
      </div>

      <p className="mt-5 font-mono text-[32px] tracking-[-0.02em] text-ink tabular-nums" aria-live="polite">
        {fmtTime(secs).padStart(5, "0")}
      </p>
      <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase">
        {state === "recording" && (
          <>
            <span className="pulse-dot size-1.5 rounded-full bg-red-500" /> <span className="text-red-600">Recording</span>
          </>
        )}
        {state === "paused" && <span className="text-muted">Paused</span>}
        {state === "idle" && <span className="text-muted">Tap to start</span>}
        {state === "stopped" && (
          <span className="flex items-center gap-1 text-green-800">
            <Check className="size-3" /> Saved · ready to transcribe
          </span>
        )}
      </p>

      {/* Waveform */}
      <div className="mt-6 flex h-16 w-full max-w-[460px] items-center justify-center gap-[3px]" aria-hidden>
        {Array.from({ length: 44 }).map((_, i) => {
          const h = Math.round(20 + seeded(i + 1) * 80);
          return (
            <span
              key={i}
              data-paused={state !== "recording"}
              className={`wave-bar w-[5px] rounded-full transition-colors duration-300 ${state === "recording" ? "bg-red-400" : state === "idle" ? "bg-line-strong" : "bg-ink/25"}`}
              style={{ height: `${h}%`, ["--d" as string]: `${Math.round(seeded(i * 3) * 900)}ms`, animationDuration: `${Math.round(700 + seeded(i * 7) * 600)}ms` }}
            />
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-2">
        {live && (
          <button type="button" onClick={() => setState(state === "recording" ? "paused" : "recording")} className="btn btn-ghost btn-sm">
            {state === "recording" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {state === "recording" ? "Pause" : "Resume"}
          </button>
        )}
        {live && (
          <button
            type="button"
            onClick={() => {
              setState("stopped");
              onDone(secs);
            }}
            className="btn btn-ink btn-sm"
          >
            <Square className="size-3 fill-current" /> Stop
          </button>
        )}
        {state === "stopped" && (
          <button
            type="button"
            onClick={() => {
              setState("idle");
              setSecs(0);
              onClear();
            }}
            className="btn btn-ghost btn-sm"
          >
            <Trash2 className="size-3.5" /> Discard
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Previews ─────────────────────────── */

function YoutubePreview({ id }: { id: string }) {
  return (
    <div className="rise mt-4 flex flex-col gap-4 overflow-hidden rounded-[22px] border border-line bg-card p-3 sm:flex-row sm:items-center">
      <div className="relative grid aspect-video w-full shrink-0 place-items-center overflow-hidden rounded-2xl bg-night sm:w-[220px]">
        <div className="dots-night absolute inset-0 opacity-70" aria-hidden />
        <span className="relative font-serif text-[15px] text-[#dfe9dd] italic">(f∘g)′ = f′(g)·g′</span>
        <span className="absolute grid size-10 place-items-center rounded-full bg-red-500 text-cream shadow-lg">
          <Play className="ml-0.5 size-4 fill-current" />
        </span>
        <span className="absolute right-2 bottom-2 rounded bg-night/80 px-1.5 py-0.5 font-mono text-[10px] text-night-text">48:30</span>
      </div>
      <div className="min-w-0 px-1 pb-1 sm:px-0">
        <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
          <YoutubeGlyph className="size-3.5 text-red-500" /> YouTube · captions found
        </p>
        <p className="mt-1.5 text-[16px] leading-snug font-medium tracking-[-0.02em]">Calculus 07: The chain rule, properly</p>
        <p className="mt-1 text-sm text-ink-soft">MIT OpenCourseWare · 1.2M views</p>
        <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 font-mono text-[10px] text-ink-soft">
          <Check className="size-3 text-green-700" /> 48 of your 120 media minutes · id {id.slice(0, 11)}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────── Step ─────────────────────────── */

export function SourceStep({ source, onSource }: { source: PickedSource | null; onSource: (s: PickedSource | null) => void }) {
  const [tab, setTab] = useState<SourceTab>("link");
  const [link, setLink] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [drag, setDrag] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const depth = useRef(0);

  const ytId = link.match(YT_RE)?.[1] ?? null;

  // fake presigned-upload progress
  const uploading = files.some((f) => f.progress < 100);
  useEffect(() => {
    if (!uploading) return;
    const id = setInterval(() => setFiles((fs) => fs.map((f) => ({ ...f, progress: Math.min(100, f.progress + 6 + (f.size % 9)) }))), 120);
    return () => clearInterval(id);
  }, [uploading]);

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const next = Array.from(list).map((f) => ({ name: f.name, size: f.size, kind: kindFromName(f.name), progress: 0 }));
    setFiles((fs) => [...fs, ...next]);
    const first = next[0]!;
    onSource({ kind: first.kind, label: first.name, detail: next.length > 1 ? `${next.length} files` : fmtSize(first.size) });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    depth.current = 0;
    setDrag(false);
    setTab("upload");
    addFiles(e.dataTransfer.files);
  };

  const dragHandlers = {
    onDragEnter: (e: DragEvent) => {
      e.preventDefault();
      depth.current += 1;
      setDrag(true);
    },
    onDragOver: (e: DragEvent) => e.preventDefault(),
    onDragLeave: () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDrag(false);
    },
    onDrop,
  };

  const addDemoFile = () => {
    const demo = { name: "weekly-sync.m4a", size: 48_200_000, kind: "audio" as const, progress: 0 };
    setFiles((fs) => [...fs, demo]);
    onSource({ kind: "audio", label: demo.name, detail: fmtSize(demo.size) });
  };

  return (
    <div {...dragHandlers}>
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <SlidingTabs
          value={tab}
          onChange={setTab}
          ariaLabel="Source type"
          items={[
            { value: "link", label: "YouTube", icon: <YoutubeGlyph className="size-4" /> },
            { value: "upload", label: "Upload", icon: <Upload className="size-4" /> },
            { value: "record", label: "Record", icon: <Mic className="size-4" /> },
            { value: "text", label: "Paste text", icon: <ClipboardPaste className="size-4" /> },
            { value: "url", label: "Web page", icon: <Globe className="size-4" /> },
          ]}
        />
      </div>

      <div key={tab} className="rise mt-6">
        {tab === "link" && (
          <div>
            <label htmlFor="yt" className="eyebrow text-[10px]">
              YouTube link
            </label>
            <div className="relative mt-2">
              <Link2 className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
              <input
                id="yt"
                value={link}
                autoFocus
                onChange={(e) => {
                  const v = e.target.value;
                  setLink(v);
                  const id = v.match(YT_RE)?.[1];
                  onSource(id ? { kind: "youtube", label: "Calculus 07: The chain rule, properly", detail: "48:30 · captions" } : null);
                }}
                placeholder="https://youtube.com/watch?v=…"
                className={`${inputCls} !rounded-full !py-3.5 pl-11 text-[15px]`}
              />
            </div>
            {!ytId && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                <span>Try:</span>
                <button type="button" onClick={() => { setLink("https://youtu.be/dQw4w9WgXcQ"); onSource({ kind: "youtube", label: "Calculus 07: The chain rule, properly", detail: "48:30 · captions" }); }} className="rounded-full border border-dashed border-line-strong px-2.5 py-0.5 font-mono text-[11px] text-ink-soft transition-colors hover:border-red-400 hover:text-red-700">
                  youtu.be/dQw4w9WgXcQ
                </button>
                {link && <span className="text-red-600">That doesn’t look like a YouTube link yet.</span>}
              </div>
            )}
            {ytId && <YoutubePreview id={ytId} />}
          </div>
        )}

        {tab === "upload" && (
          <div>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className={`group flex w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed px-6 py-14 text-center transition-all duration-300 ease-[var(--ease-spring)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400 ${
                drag ? "scale-[1.015] border-red-500 bg-red-50 shadow-[0_0_0_6px_var(--red-50)]" : "border-line-strong bg-card hover:border-ink/40 hover:bg-paper-glow"
              }`}
            >
              <span className={`grid size-14 place-items-center rounded-2xl transition-all duration-300 ${drag ? "-translate-y-1 rotate-[-6deg] bg-red-500 text-cream" : "bg-panel text-ink-soft group-hover:-translate-y-0.5"}`}>
                <Upload className="size-6" />
              </span>
              <p className="mt-4 text-[18px] tracking-[-0.02em]">
                {drag ? (
                  <>
                    Drop to <span className="serif-accent text-red-500">upload</span>
                  </>
                ) : (
                  <>
                    Drag files here, or <span className="text-red-600 underline decoration-red-300 underline-offset-4">browse</span>
                  </>
                )}
              </p>
              <p className="mt-1.5 max-w-[48ch] text-[13px] text-muted">Audio, video, PDF, Word, PowerPoint, images or text. Up to 200 MB on Free.</p>
              <span className="mt-4 flex flex-wrap justify-center gap-1.5 font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
                {["mp3", "m4a", "mp4", "pdf", "docx", "pptx", "png", "txt"].map((x) => (
                  <span key={x} className="rounded-full border border-line px-2 py-0.5">
                    {x}
                  </span>
                ))}
              </span>
            </button>
            <input ref={fileInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => addFiles(e.target.files)} />
            {files.length === 0 && (
              <button type="button" onClick={addDemoFile} className="link-arrow mt-3 text-[13px] text-ink-soft">
                No file handy? Use a sample meeting recording
              </button>
            )}
            {files.length > 0 && (
              <ul className="mt-4 space-y-2">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="rise flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-panel text-ink-soft">
                      <SourceIcon kind={f.kind} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm">{f.name}</p>
                        <span className="shrink-0 font-mono text-[10px] text-muted">{f.progress < 100 ? `${f.progress}%` : fmtSize(f.size)}</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-panel">
                        <div className={`h-full rounded-full transition-[width] duration-200 ${f.progress < 100 ? "progress-shimmer" : "bg-green-700/60"}`} style={{ width: `${f.progress}%` }} />
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${f.name}`}
                      onClick={() => {
                        const rest = files.filter((_, k) => k !== i);
                        setFiles(rest);
                        if (rest.length === 0) onSource(null);
                      }}
                      className="grid size-7 place-items-center rounded-full text-muted transition-colors hover:bg-panel hover:text-ink"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "record" && (
          <Recorder
            onClear={() => onSource(null)}
            onDone={(secs) => onSource({ kind: "recording", label: `Recording · ${fmtTime(secs)}`, detail: "Browser microphone" })}
          />
        )}

        {tab === "text" && (
          <div>
            <label htmlFor="paste" className="eyebrow text-[10px]">
              Paste text or markdown
            </label>
            <textarea
              id="paste"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                const words = e.target.value.trim().split(/\s+/).filter(Boolean).length;
                onSource(words >= 5 ? { kind: "text", label: e.target.value.trim().slice(0, 48), detail: `${words} words` } : null);
              }}
              rows={9}
              placeholder="Paste lecture notes, an article, a transcript…"
              className={`${inputCls} mt-2 resize-y leading-relaxed`}
            />
            <p className="mt-1.5 text-right font-mono text-[10px] text-muted">{text.trim() ? text.trim().split(/\s+/).length : 0} words</p>
          </div>
        )}

        {tab === "url" && (
          <div>
            <label htmlFor="url" className="eyebrow text-[10px]">
              Article or web page
            </label>
            <div className="relative mt-2">
              <Globe className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
              <input
                id="url"
                value={url}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setUrl(e.target.value);
                  let host = "";
                  try {
                    host = new URL(v).hostname;
                  } catch {
                    host = "";
                  }
                  onSource(host ? { kind: "web", label: host.replace(/^www\./, ""), detail: "~12 min read" } : null);
                }}
                placeholder="https://…"
                className={`${inputCls} !rounded-full !py-3.5 pl-11 text-[15px]`}
              />
            </div>
            {source?.kind === "web" && (
              <div className="rise mt-4 rounded-[22px] border border-line bg-card p-4">
                <p className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">{source.label} · readable</p>
                <div className="mt-3 space-y-2" aria-hidden>
                  <div className="h-3 w-3/4 rounded-full bg-ink/15" />
                  <div className="h-2 w-full rounded-full bg-ink/8" />
                  <div className="h-2 w-5/6 rounded-full bg-ink/8" />
                </div>
                <p className="mt-3 text-[12px] text-muted">Paywalled or login-only pages won’t work.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {source && tab !== "link" && tab !== "url" && (
        <p className="rise mt-5 flex items-center gap-2 text-[13px] text-ink-soft">
          <Check className="size-4 text-green-700" /> <span className="truncate">{source.label}</span>
          <span className="font-mono text-[10px] text-muted">{source.detail}</span>
        </p>
      )}
    </div>
  );
}
