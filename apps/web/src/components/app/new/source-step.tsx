"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { AlertCircle, Check, ClipboardPaste, Clock, Globe, Loader2, Mic, Pause, Play, RotateCcw, Square, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import {
  CHARS_PER_PAGE,
  UPLOAD_LIMITS,
  SUPPORTED_UPLOADS,
  isYoutubeUrl,
  youtubeIdOf,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
  type SourceInput,
  type SourceKind,
} from "@a2n/shared";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { FileUpload, errorMessage } from "@/lib/api";
import { fmtDuration, fmtSize, fmtTime } from "@/lib/format";
import { SourceIcon, YoutubeGlyph, inputCls } from "../ui";

export type SourceTab = "link" | "upload" | "record" | "text" | "url";

/**
 * A source that's ready to send: `input` goes straight into `POST /api/sources`. `credits` is what
 * it will cost when we can tell up front (media length, pasted text); `seconds` is media length.
 */
export type PickedSource = { kind: SourceKind; label: string; detail: string; input: SourceInput; credits?: number; seconds?: number };

type UploadKind = keyof typeof SUPPORTED_UPLOADS;

/* Mirrors the API's extension fallback for files the browser gives no (or an odd) MIME type. */
const EXT: Record<string, { kind: UploadKind; type: string }> = {
  pdf: { kind: "pdf", type: "application/pdf" },
  docx: { kind: "docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  pptx: { kind: "slides", type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
  png: { kind: "image", type: "image/png" },
  jpg: { kind: "image", type: "image/jpeg" },
  jpeg: { kind: "image", type: "image/jpeg" },
  webp: { kind: "image", type: "image/webp" },
  mp3: { kind: "audio", type: "audio/mpeg" },
  m4a: { kind: "audio", type: "audio/mp4" },
  wav: { kind: "audio", type: "audio/wav" },
  ogg: { kind: "audio", type: "audio/ogg" },
  flac: { kind: "audio", type: "audio/flac" },
  aac: { kind: "audio", type: "audio/aac" },
  mp4: { kind: "video", type: "video/mp4" },
  mov: { kind: "video", type: "video/quicktime" },
  webm: { kind: "video", type: "video/webm" },
};
const TEXT_EXT = ["txt", "md", "markdown"];
const MAX_TEXT_CHARS = 400_000;
/** Files added in one go; each becomes its own note. */
export const MAX_FILES = 20;
/** Files uploading at once (each big one also sends a few parts in parallel). */
const PARALLEL_FILES = 2;

const MB = 1024 * 1024;
const fmtLimit = (bytes: number) => (bytes >= 1024 * MB ? `${bytes / (1024 * MB)} GB` : `${bytes / MB} MB`);

/** "2 hours", "90 min" */
export const fmtHours = (s: number) => (s % 3600 === 0 ? `${s / 3600} ${s === 3600 ? "hour" : "hours"}` : `${Math.round(s / 60)} min`);

const textCredits = (chars: number) => Math.max(1, Math.ceil(chars / CHARS_PER_PAGE));
const mediaCredits = (secs: number) => Math.max(1, Math.ceil(secs / 60));

type Classified = { ok: true; text: boolean; kind: SourceKind; contentType: string } | { ok: false; error: string };

/** Block what the API can't process yet, before anything is uploaded. */
function classify(file: File): Classified {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "heic" || ext === "heif" || /heic|heif/.test(file.type))
    return { ok: false, error: "HEIC photos aren’t supported yet. Export it as JPEG or PNG and try again." };
  if (TEXT_EXT.includes(ext) || file.type === "text/plain" || file.type === "text/markdown") {
    if (file.size > MAX_TEXT_CHARS * 4) return { ok: false, error: "That text file is too long. Paste a shorter section instead." };
    return { ok: true, text: true, kind: "text", contentType: "text/plain" };
  }
  const byType = (Object.entries(SUPPORTED_UPLOADS) as [UploadKind, string[]][]).find(([, types]) => types.includes(file.type))?.[0];
  const kind = byType ?? EXT[ext]?.kind;
  if (!kind) {
    const what = ext ? `.${ext} files aren’t` : "That file type isn’t";
    const hint = ext === "doc" || ext === "ppt" ? " Save it as .docx or .pptx and try again." : " Try PDF, Word (.docx), PowerPoint (.pptx), PNG/JPEG/WebP, or audio and video.";
    return { ok: false, error: `${what} supported yet.${hint}` };
  }
  const media = kind === "audio" || kind === "video";
  if (media && file.size > UPLOAD_LIMITS.maxMediaBytes) return { ok: false, error: `Audio and video files can be up to ${fmtLimit(UPLOAD_LIMITS.maxMediaBytes)}.` };
  if (!media && file.size > UPLOAD_LIMITS.maxUploadBytes) return { ok: false, error: `Documents and images can be up to ${fmtLimit(UPLOAD_LIMITS.maxUploadBytes)}.` };
  const contentType = byType ? file.type : EXT[ext]!.type;
  return { ok: true, text: false, kind, contentType };
}

/** Length of an audio/video file from its metadata, or null when the browser can't tell. */
function probeDuration(file: File, video: boolean): Promise<number | null> {
  return new Promise((resolve) => {
    const el = document.createElement(video ? "video" : "audio");
    const url = URL.createObjectURL(file);
    const finish = (v: number | null) => {
      clearTimeout(timer);
      el.removeAttribute("src");
      URL.revokeObjectURL(url);
      resolve(v);
    };
    const timer = setTimeout(() => finish(null), 8000);
    el.preload = "metadata";
    el.onloadedmetadata = () => finish(Number.isFinite(el.duration) && el.duration > 0 ? el.duration : null);
    el.onerror = () => finish(null);
    el.src = url;
  });
}

/* ─────────────────────────── Picker state ─────────────────────────── */

/** One file (or the recording) on its way up. `retryable: false` = it was rejected before uploading. */
export type FileEntry = {
  id: string;
  name: string;
  size: number;
  kind: SourceKind;
  recording: boolean;
  state: "checking" | "queued" | "uploading" | "done" | "error";
  error?: string;
  retryable?: boolean;
  seconds?: number;
  source?: PickedSource;
};

/** What the active tab would add: ready sources, plus uploads still going or failed. */
export type SourceSelection = {
  sources: PickedSource[];
  /** Files still checking, queued or uploading */
  pending: number;
  failed: number;
  /** 0–100 across the pending files, by size */
  progress: number;
  /** Kind of the first file or source, for the note type suggestion */
  firstKind: SourceKind | null;
};

export type PlanLimits = { maxMediaSeconds: number; planName: string | null };

let seq = 0;
const newId = () => `f${++seq}`;

/** Links pasted without a scheme ("youtu.be/…") still count. */
const withScheme = (v: string) => (/^[a-z][a-z\d+.-]*:\/\//i.test(v) ? v : `https://${v}`);

const youtubeSource = (id: string): PickedSource => ({ kind: "youtube", label: `youtu.be/${id}`, detail: "YouTube video", input: { type: "url", url: youtubeWatchUrl(id) } });

function webSource(value: string): PickedSource | null {
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const href = u.toString();
    if (isYoutubeUrl(href)) {
      const id = youtubeIdOf(href);
      return id ? youtubeSource(id) : null;
    }
    return { kind: "web", label: u.hostname.replace(/^www\./, ""), detail: "Web page", input: { type: "url", url: href } };
  } catch {
    return null;
  }
}

function textSource(value: string): PickedSource | null {
  const body = value.trim();
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words < 5 || body.length < 20) return null;
  return { kind: "text", label: body.slice(0, 48), detail: `${words} words`, input: { type: "text", text: body }, credits: textCredits(body.length) };
}

/**
 * Everything the source step picks, kept by the add flow so uploads carry on while the user
 * chooses a note type. Only the active tab's source(s) are sent.
 */
export function useSourcePicker(limits: PlanLimits) {
  const [tab, setTab] = useState<SourceTab>("link");
  const [ytUrl, setYtUrl] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const jobs = useRef(new Map<string, FileUpload>());
  const queue = useRef<string[]>([]);
  const active = useRef(0);
  const live = useRef<Record<string, number>>({});
  const frame = useRef(0);
  const limitsRef = useRef(limits);
  useEffect(() => {
    limitsRef.current = limits;
  }, [limits]);

  useEffect(() => {
    const all = jobs.current;
    return () => {
      all.forEach((j) => j.cancel());
      cancelAnimationFrame(frame.current);
    };
  }, []);

  const patch = (id: string, p: Partial<FileEntry>) => setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...p } : e)));

  /** Progress events arrive fast; paint them at most once a frame. */
  const onProgress = (id: string, pct: number) => {
    live.current[id] = pct;
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      setProgress({ ...live.current });
    });
  };

  const pump = () => {
    while (active.current < PARALLEL_FILES && queue.current.length) {
      const id = queue.current.shift()!;
      const job = jobs.current.get(id);
      if (!job || job.cancelled) continue;
      active.current += 1;
      patch(id, { state: "uploading", error: undefined });
      job
        .run()
        .then((uploadId) => {
          if (job.cancelled) return;
          setEntries((es) =>
            es.map((e) => {
              if (e.id !== id) return e;
              const source: PickedSource = {
                kind: e.kind,
                label: e.name,
                detail: e.recording ? `Browser microphone · ${fmtTime(e.seconds ?? 0)}` : `${fmtSize(e.size)}${e.seconds ? ` · ${fmtDuration(e.seconds)}` : ""}`,
                input: { type: "upload", uploadId, ...(e.recording && { recording: true }) },
                ...(e.seconds && { seconds: e.seconds, credits: mediaCredits(e.seconds) }),
              };
              return { ...e, state: "done", source };
            }),
          );
        })
        .catch((err: unknown) => {
          if (!job.cancelled) patch(id, { state: "error", error: errorMessage(err), retryable: true });
        })
        .finally(() => {
          active.current -= 1;
          pump();
        });
    }
  };

  const enqueue = (id: string, file: File, contentType: string, front = false) => {
    const job = new FileUpload(file, contentType, (pct) => onProgress(id, pct));
    jobs.current.set(id, job);
    live.current[id] = 0;
    if (front) queue.current.unshift(id);
    else queue.current.push(id);
    pump();
  };

  const addOne = async (file: File) => {
    const id = newId();
    const c = classify(file);
    const base = { id, name: file.name, size: file.size, recording: false };
    if (!c.ok) {
      setEntries((es) => [...es, { ...base, kind: "text", state: "error", error: c.error, retryable: false }]);
      return;
    }
    if (c.text) {
      const body = (await file.text()).trim();
      const error = body.length < 20 ? "That file is nearly empty. Paste at least a few sentences." : body.length > MAX_TEXT_CHARS ? "That text file is too long. Paste a shorter section instead." : null;
      if (error) {
        setEntries((es) => [...es, { ...base, kind: "text", state: "error", error, retryable: false }]);
        return;
      }
      const source: PickedSource = {
        kind: "text",
        label: file.name,
        detail: `${body.split(/\s+/).length} words`,
        input: { type: "text", text: body, title: file.name.replace(/\.[^.]+$/, "") },
        credits: textCredits(body.length),
      };
      setEntries((es) => [...es, { ...base, kind: "text", state: "done", source }]);
      return;
    }
    const media = c.kind === "audio" || c.kind === "video";
    setEntries((es) => [...es, { ...base, kind: c.kind, state: media ? "checking" : "queued" }]);
    if (media) {
      const seconds = await probeDuration(file, c.kind === "video");
      const { maxMediaSeconds, planName } = limitsRef.current;
      if (seconds && seconds > maxMediaSeconds) {
        const what = c.kind === "video" ? "video" : "recording";
        patch(id, {
          state: "error",
          seconds,
          retryable: false,
          error: `This ${what} is ${fmtDuration(seconds)}. ${planName ? `Your ${planName} plan takes` : "Plans take"} audio and video up to ${fmtHours(maxMediaSeconds)}. Trim it, or upload it in parts.`,
        });
        return;
      }
      patch(id, { state: "queued", ...(seconds && { seconds }) });
    }
    enqueue(id, file, c.contentType);
  };

  const addFiles = (list: FileList | File[] | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setTab("upload");
    const room = MAX_FILES - entries.filter((e) => !e.recording).length;
    files.slice(0, Math.max(0, room)).forEach((f) => void addOne(f));
    if (files.length > room) {
      setEntries((es) => [
        ...es,
        { id: newId(), name: `${files.length - Math.max(0, room)} more ${files.length - room === 1 ? "file" : "files"}`, size: 0, kind: "text", recording: false, state: "error", retryable: false, error: `You can add up to ${MAX_FILES} files at a time. Add the rest once these are in.` },
      ]);
    }
  };

  const remove = (id: string) => {
    jobs.current.get(id)?.cancel();
    jobs.current.delete(id);
    queue.current = queue.current.filter((q) => q !== id);
    delete live.current[id];
    setEntries((es) => es.filter((e) => e.id !== id));
  };

  const retry = (id: string) => {
    if (!jobs.current.has(id)) return;
    patch(id, { state: "queued", error: undefined });
    queue.current.push(id);
    pump();
  };

  const clearFiles = () => entries.filter((e) => !e.recording).forEach((e) => remove(e.id));

  const addRecording = (file: File, seconds: number) => {
    entries.filter((e) => e.recording).forEach((e) => remove(e.id));
    const id = newId();
    setEntries((es) => [...es, { id, name: file.name, size: file.size, kind: "recording", recording: true, state: "queued", seconds }]);
    enqueue(id, file, file.type, true);
  };

  const clearRecording = () => entries.filter((e) => e.recording).forEach((e) => remove(e.id));

  // What the active tab adds
  const files = entries.filter((e) => !e.recording);
  const recording = entries.find((e) => e.recording) ?? null;
  const tabEntries = tab === "upload" ? files : tab === "record" && recording ? [recording] : [];
  const ytId = youtubeIdOf(withScheme(ytUrl.trim()));
  const single = tab === "link" ? (ytId ? youtubeSource(ytId) : null) : tab === "url" ? webSource(url) : tab === "text" ? textSource(text) : null;
  const pendingEntries = tabEntries.filter((e) => e.state === "checking" || e.state === "queued" || e.state === "uploading");
  const pendingBytes = pendingEntries.reduce((n, e) => n + e.size, 0);
  const selection: SourceSelection = {
    sources: single ? [single] : tabEntries.flatMap((e) => (e.state === "done" && e.source ? [e.source] : [])),
    pending: pendingEntries.length,
    failed: tabEntries.filter((e) => e.state === "error").length,
    progress: pendingBytes ? pendingEntries.reduce((n, e) => n + (progress[e.id] ?? 0) * e.size, 0) / pendingBytes : 0,
    firstKind: single?.kind ?? tabEntries.find((e) => e.state !== "error")?.kind ?? null,
  };

  return {
    tab,
    setTab,
    ytUrl,
    setYtUrl,
    url,
    setUrl,
    text,
    setText,
    files,
    recording,
    progress,
    addFiles,
    remove,
    retry,
    clearFiles,
    addRecording,
    clearRecording,
    selection,
  };
}

export type SourcePicker = ReturnType<typeof useSourcePicker>;

/* ─────────────────────────── Upload rows ─────────────────────────── */

function UploadRow({ up, pct, onRemove, onRetry }: { up: FileEntry; pct: number; onRemove: () => void; onRetry: () => void }) {
  const failed = up.state === "error";
  const busy = up.state === "checking" || up.state === "queued" || up.state === "uploading";
  const shown = up.state === "done" ? 100 : up.state === "uploading" ? pct : 0;
  return (
    <div className="rise flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${failed ? "bg-red-50 text-red-600" : "bg-panel text-ink-soft"}`}>
        {failed ? <AlertCircle className="size-4" /> : <SourceIcon kind={up.kind} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm">{up.name}</p>
          <span className="shrink-0 font-mono text-[10px] text-muted">
            {up.state === "uploading"
              ? `${Math.floor(pct)}%`
              : up.state === "checking"
                ? "checking"
                : up.state === "queued"
                  ? "waiting"
                  : up.state === "done"
                    ? [up.size ? fmtSize(up.size) : "", up.seconds ? fmtDuration(up.seconds) : ""].filter(Boolean).join(" · ")
                    : up.retryable
                      ? "failed"
                      : "not added"}
          </span>
        </div>
        {failed ? (
          <p className="mt-1 text-[12px] text-red-700">{up.error}</p>
        ) : (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-panel" role="progressbar" aria-valuenow={Math.floor(shown)} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${up.name}`}>
            <div className={`h-full rounded-full transition-[width] duration-200 ${busy ? "progress-shimmer" : "bg-green-700/60"}`} style={{ width: `${Math.max(busy ? 2 : 0, shown)}%` }} />
          </div>
        )}
      </div>
      {failed && up.retryable && (
        <button type="button" onClick={onRetry} className="btn btn-ghost btn-sm !min-h-[30px] shrink-0 !px-3 !py-1 text-[12px]">
          <RotateCcw className="size-3" /> Retry
        </button>
      )}
      <button
        type="button"
        aria-label={busy ? `Cancel upload of ${up.name}` : `Remove ${up.name}`}
        onClick={onRemove}
        className="grid size-7 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-panel hover:text-ink"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function FileList({ picker }: { picker: SourcePicker }) {
  const { files, progress, selection } = picker;
  if (!files.length) return null;
  const done = files.filter((f) => f.state === "done").length;
  return (
    <div className="mt-4">
      {files.length > 1 && (
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
            {files.length} files · {done} ready
            {selection.pending > 0 && ` · uploading ${Math.floor(selection.progress)}%`}
            {selection.failed > 0 && <span className="text-red-600"> · {selection.failed} not added</span>}
          </p>
          <button type="button" onClick={picker.clearFiles} className="text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline">
            {selection.pending > 0 ? "Cancel all" : "Remove all"}
          </button>
        </div>
      )}
      <ul className="space-y-2">
        {files.map((f) => (
          <li key={f.id}>
            <UploadRow up={f} pct={progress[f.id] ?? 0} onRemove={() => picker.remove(f.id)} onRetry={() => picker.retry(f.id)} />
          </li>
        ))}
      </ul>
      {files.length > 1 && <p className="mt-2.5 px-1 text-[12px] text-muted">Each file becomes its own note, with the same note type, outputs and language.</p>}
    </div>
  );
}

/* ─────────────────────────── Recorder ─────────────────────────── */

type RecState = "idle" | "recording" | "paused" | "stopped";

const BARS = 44;
const REC_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

type Live = { rec: MediaRecorder | null; stream: MediaStream | null; ctx: AudioContext | null; raf: number; acc: number; since: number; levels: number[] };

const elapsedOf = (l: Live) => l.acc + (l.since ? (performance.now() - l.since) / 1000 : 0);

function teardown(l: Live) {
  cancelAnimationFrame(l.raf);
  l.stream?.getTracks().forEach((t) => t.stop());
  l.stream = null;
  void l.ctx?.close().catch(() => {});
  l.ctx = null;
}

/**
 * Browser mic via MediaRecorder; the bars are the live input level from an AnalyserNode. Stops by
 * itself at the plan's longest recording, and warns once it's longer than the credits left.
 */
function Recorder({
  onRecorded,
  onClear,
  limits,
  creditsLeft,
}: {
  onRecorded: (file: File, secs: number) => void;
  onClear: () => void;
  limits: PlanLimits;
  creditsLeft: number | null;
}) {
  const [state, setState] = useState<RecState>("idle");
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hitLimit, setHitLimit] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const live$ = useRef<Live>({ rec: null, stream: null, ctx: null, raf: 0, acc: 0, since: 0, levels: Array.from({ length: BARS }, () => 0) });
  const maxSecs = limits.maxMediaSeconds;

  useEffect(() => {
    const l = live$.current;
    return () => {
      if (l.rec && l.rec.state !== "inactive") {
        l.rec.onstop = null;
        l.rec.stop();
      }
      teardown(l);
    };
  }, []);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (state !== "recording") return;
    const l = live$.current;
    const id = setInterval(() => {
      const s = elapsedOf(l);
      setSecs(Math.floor(s));
      if (s >= maxSecs && l.rec?.state === "recording") {
        setHitLimit(true);
        l.rec.stop();
      }
    }, 250);
    return () => clearInterval(id);
  }, [state, maxSecs]);

  const paintBars = () => {
    const el = barsRef.current;
    if (!el) return;
    live$.current.levels.forEach((v, i) => {
      const bar = el.children[i] as HTMLElement | undefined;
      if (bar) bar.style.height = `${Math.round(8 + v * 92)}%`;
    });
  };

  const start = async () => {
    setError(null);
    setHitLimit(false);
    onClear();
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser can’t record audio. Try Chrome, Edge, Firefox or Safari.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was blocked. Allow it in your browser’s site settings and try again.");
      return;
    }
    const l = live$.current;
    l.stream = stream;
    const mimeType = REC_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    rec.onstop = () => {
      const type = (rec.mimeType || "audio/webm").split(";")[0]!;
      const total = Math.min(elapsedOf(l), maxSecs);
      l.acc = total;
      l.since = 0;
      teardown(l);
      setSecs(Math.floor(total));
      setState("stopped");
      const blob = new Blob(chunks, { type });
      if (blob.size > UPLOAD_LIMITS.maxMediaBytes) {
        setError(`That recording is over ${fmtLimit(UPLOAD_LIMITS.maxMediaBytes)}, which is more than we can take. Record a shorter part.`);
        return;
      }
      setPreviewUrl(URL.createObjectURL(blob));
      const stamp = new Date().toISOString().slice(0, 16).replace("T", " ").replace(":", ".");
      onRecorded(new File([blob], `Recording ${stamp}.${type === "audio/mp4" ? "m4a" : "webm"}`, { type }), total);
    };
    l.rec = rec;

    const ctx = new AudioContext();
    l.ctx = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    let last = 0;
    const loop = (t: number) => {
      l.raf = requestAnimationFrame(loop);
      if (t - last < 70 || rec.state !== "recording") return;
      last = t;
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      const rms = Math.sqrt(sum / buf.length);
      l.levels = [...l.levels.slice(1), Math.min(1, rms * 5)];
      paintBars();
    };
    l.raf = requestAnimationFrame(loop);

    l.levels = l.levels.map(() => 0);
    paintBars();
    l.acc = 0;
    l.since = performance.now();
    setSecs(0);
    rec.start(1000);
    setState("recording");
  };

  const pause = () => {
    const l = live$.current;
    if (!l.rec) return;
    if (l.rec.state === "recording") {
      l.rec.pause();
      l.acc = elapsedOf(l);
      l.since = 0;
      setState("paused");
    } else if (l.rec.state === "paused") {
      l.rec.resume();
      l.since = performance.now();
      setState("recording");
    }
  };

  const stop = () => live$.current.rec?.stop();

  const discard = () => {
    setState("idle");
    setSecs(0);
    setError(null);
    setHitLimit(false);
    setPreviewUrl(null);
    live$.current.levels = live$.current.levels.map(() => 0);
    paintBars();
    onClear();
  };

  const live = state === "recording" || state === "paused";
  const left = maxSecs - secs;
  const overCredits = creditsLeft !== null && secs > 0 && mediaCredits(secs) > creditsLeft;
  const limitText = `up to ${fmtHours(maxSecs)}${limits.planName ? ` on ${limits.planName}` : ""}`;

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-left" role="note">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-red-500 text-cream">
          <Mic className="size-4" />
        </span>
        <div className="text-[13px]">
          <p className="font-medium text-red-800">Check you’re allowed to record this class.</p>
          <p className="mt-0.5 text-red-800/75">Ask your lecturer first, and follow your institution’s rules. In many places recording without consent is illegal.</p>
        </div>
      </div>

      <div className="relative mt-8 grid place-items-center">
        {state === "recording" && <span className="absolute size-40 animate-ping rounded-full bg-red-400/10" aria-hidden />}
        <button
          type="button"
          onClick={live ? stop : start}
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
      <p className="mt-1 flex items-center gap-1.5 text-center font-mono text-[10px] tracking-[0.14em] uppercase">
        {state === "recording" && (
          <>
            <span className="pulse-dot size-1.5 rounded-full bg-red-500" /> <span className="text-red-600">Recording</span>
            {left <= 300 && <span className="text-muted">· stops in {fmtTime(Math.max(0, left))}</span>}
          </>
        )}
        {state === "paused" && <span className="text-muted">Paused</span>}
        {state === "idle" && <span className="text-muted">Tap to start · {limitText}</span>}
        {state === "stopped" && !error && (
          <span className="flex items-center gap-1 text-green-800">
            <Check className="size-3" /> Recorded
          </span>
        )}
      </p>

      {/* Live input level */}
      <div ref={barsRef} className="mt-6 flex h-16 w-full max-w-[460px] items-center justify-center gap-[3px]" aria-hidden>
        {Array.from({ length: BARS }).map((_, i) => (
          <span
            key={i}
            className={`w-[5px] rounded-full transition-[height,background-color] duration-100 ${state === "recording" ? "bg-red-400" : state === "idle" ? "bg-line-strong" : "bg-ink/25"}`}
            style={{ height: "8%" }}
          />
        ))}
      </div>

      {hitLimit && !error && (
        <p className="mt-4 flex items-start gap-2 text-[13px] text-ink-soft" role="status">
          <Clock className="mt-0.5 size-4 shrink-0 text-red-500" /> Stopped at {fmtHours(maxSecs)}, the longest recording {limits.planName ? `your ${limits.planName} plan takes` : "your plan takes"}.
        </p>
      )}
      {overCredits && (
        <p className="mt-4 flex max-w-[460px] items-start gap-2 text-[13px] text-red-700" role="status">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> This recording needs {mediaCredits(secs)} credits and you have {creditsLeft} left. Only record what you need, or upgrade for more.
        </p>
      )}
      {error && (
        <p className="mt-4 flex items-start gap-2 text-[13px] text-red-700" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}

      {previewUrl && state === "stopped" && <audio controls src={previewUrl} className="mt-5 w-full max-w-[460px]" />}

      <div className="mt-6 flex items-center gap-2">
        {live && (
          <button type="button" onClick={pause} className="btn btn-ghost btn-sm">
            {state === "recording" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {state === "recording" ? "Pause" : "Resume"}
          </button>
        )}
        {live && (
          <button type="button" onClick={stop} className="btn btn-ink btn-sm">
            <Square className="size-3 fill-current" /> Stop
          </button>
        )}
        {state === "stopped" && (
          <button type="button" onClick={discard} className="btn btn-ghost btn-sm">
            <Trash2 className="size-3.5" /> Discard
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── YouTube ─────────────────────────── */

/** Why a YouTube tab entry can't be sent, or null when it's a video (or still empty). */
function youtubeError(value: string): string | null {
  const v = withScheme(value.trim());
  if (!value.trim() || youtubeIdOf(v)) return null;
  if (isYoutubeUrl(v)) return "That’s a channel, playlist or home page link. Open a single video and copy its link.";
  let host = "";
  try {
    host = new URL(v).hostname;
  } catch {
    host = "";
  }
  return host.includes(".") ? "That isn’t a YouTube link. Use the Web page tab for other sites." : "That doesn’t look like a YouTube link yet. It should look like youtube.com/watch?v=… or youtu.be/…";
}

/** The video's thumbnail and what happens next; the title and channel come from the API. */
function YoutubePreview({ id, maxSeconds }: { id: string; maxSeconds: number }) {
  return (
    <div className="rise mt-4 flex flex-col gap-4 rounded-[22px] border border-line bg-card p-3 sm:flex-row sm:items-center">
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-2xl bg-panel sm:w-44">
        <Image src={youtubeThumbnailUrl(id)} alt="Video thumbnail" fill sizes="(min-width: 640px) 176px, 100vw" className="object-cover" />
      </div>
      <div className="min-w-0 px-1 pb-1 sm:p-0">
        <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
          <YoutubeGlyph className="size-3.5 text-red-500" /> youtu.be/{id}
        </p>
        <p className="mt-2 text-[13px] text-ink-soft">We’ll read the video’s captions, or transcribe it if it has none, when you start.</p>
        <p className="mt-1 text-[12px] text-muted">Uses 1 credit per minute of video, up to {fmtHours(maxSeconds)} long. Private, members-only and live videos won’t work.</p>
      </div>
    </div>
  );
}

/* ─────────────────────────── Step ─────────────────────────── */

export function SourceStep({ picker, limits, creditsLeft }: { picker: SourcePicker; limits: PlanLimits; creditsLeft: number | null }) {
  const { tab, setTab, ytUrl, url, text, files, recording, progress, selection } = picker;
  const [drag, setDrag] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const depth = useRef(0);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    depth.current = 0;
    setDrag(false);
    picker.addFiles(e.dataTransfer.files);
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

  let urlHost = "";
  try {
    const u = new URL(url.trim());
    if (u.protocol === "http:" || u.protocol === "https:") urlHost = u.hostname;
  } catch {
    urlHost = "";
  }
  // A YouTube link in the web page tab goes up as a video too; only non-video YouTube links are stopped.
  const urlIsYoutube = !!urlHost && isYoutubeUrl(url);
  const urlYoutubeId = urlIsYoutube ? youtubeIdOf(url) : null;
  const ytId = youtubeIdOf(withScheme(ytUrl.trim()));
  const ytError = youtubeError(ytUrl);
  const source = selection.sources[0] ?? null;
  const otherFiles = tab !== "upload" && files.some((f) => f.state !== "error");

  return (
    <div {...dragHandlers}>
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <SlidingTabs
          value={tab}
          onChange={setTab}
          ariaLabel="Source type"
          items={[
            {
              value: "link",
              label: "YouTube",
              icon: <YoutubeGlyph className="size-4" />,
            },
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
            <label htmlFor="youtube" className="eyebrow text-[10px]">
              YouTube video link
            </label>
            <div className="relative mt-2">
              <YoutubeGlyph className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
              <input
                id="youtube"
                value={ytUrl}
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => picker.setYtUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                className={`${inputCls} !rounded-full !py-3.5 pl-11 text-[15px]`}
              />
            </div>
            {ytError && (
              <p className="mt-3 flex items-start gap-2 text-[13px] text-red-700" role="alert">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> {ytError}
              </p>
            )}
            {ytId && <YoutubePreview id={ytId} maxSeconds={limits.maxMediaSeconds} />}
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
              <p className="mt-1.5 max-w-[54ch] text-[13px] text-muted">
                Audio and video up to {fmtLimit(UPLOAD_LIMITS.maxMediaBytes)} and {fmtHours(limits.maxMediaSeconds)} long. PDF, Word, PowerPoint, images and text up to {fmtLimit(UPLOAD_LIMITS.maxUploadBytes)}. Add up to{" "}
                {MAX_FILES} at once; each becomes its own note. Scanned PDFs (no text layer) and HEIC photos aren’t supported yet.
              </p>
              <span className="mt-4 flex flex-wrap justify-center gap-1.5 font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
                {["mp3", "m4a", "mp4", "pdf", "docx", "pptx", "png", "txt"].map((x) => (
                  <span key={x} className="rounded-full border border-line px-2 py-0.5">
                    {x}
                  </span>
                ))}
              </span>
            </button>
            <input
              ref={fileInput}
              type="file"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                picker.addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <FileList picker={picker} />
          </div>
        )}

        {tab === "record" && (
          <div>
            <Recorder onClear={picker.clearRecording} onRecorded={picker.addRecording} limits={limits} creditsLeft={creditsLeft} />
            {recording && (
              <div className="mx-auto mt-5 max-w-[460px]">
                <UploadRow up={recording} pct={progress[recording.id] ?? 0} onRemove={picker.clearRecording} onRetry={() => picker.retry(recording.id)} />
              </div>
            )}
          </div>
        )}

        {tab === "text" && (
          <div>
            <label htmlFor="paste" className="eyebrow text-[10px]">
              Paste text or markdown
            </label>
            <textarea
              id="paste"
              value={text}
              maxLength={MAX_TEXT_CHARS}
              onChange={(e) => picker.setText(e.target.value)}
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
                onChange={(e) => picker.setUrl(e.target.value)}
                placeholder="https://…"
                className={`${inputCls} !rounded-full !py-3.5 pl-11 text-[15px]`}
              />
            </div>
            {url.trim() && !urlHost && <p className="mt-3 text-[13px] text-red-600">That doesn’t look like a web address yet. Start it with https://</p>}
            {urlIsYoutube && !urlYoutubeId && (
              <p className="mt-3 flex items-start gap-2 text-[13px] text-red-700" role="alert">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> That’s a YouTube channel, playlist or home page link. Open a single video and copy its link.
              </p>
            )}
            {urlYoutubeId && source?.kind === "youtube" && <YoutubePreview id={urlYoutubeId} maxSeconds={limits.maxMediaSeconds} />}
            {source?.kind === "web" && (
              <div className="rise mt-4 rounded-[22px] border border-line bg-card p-4">
                <p className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">{source.label}</p>
                <p className="mt-2 text-[13px] text-ink-soft">We’ll fetch the page and read its main text when you start.</p>
                <p className="mt-1 text-[12px] text-muted">Paywalled or login-only pages won’t work.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {source && (tab === "text" || (tab === "upload" && files.length === 1) || tab === "record") && (
        <p className="rise mt-5 flex items-center gap-2 text-[13px] text-ink-soft">
          <Check className="size-4 shrink-0 text-green-700" /> <span className="truncate">{source.label}</span>
          <span className="shrink-0 font-mono text-[10px] text-muted">{source.detail}</span>
        </p>
      )}
      {otherFiles && (
        <p className="mt-4 flex items-center gap-2 text-[12px] text-muted">
          {files.some((f) => f.state === "uploading" || f.state === "queued") && <Loader2 className="spin size-3.5 shrink-0" />}
          Your {files.length === 1 ? "file stays" : `${files.length} files stay`} on the Upload tab. Only this tab’s source is added.
        </p>
      )}
    </div>
  );
}
