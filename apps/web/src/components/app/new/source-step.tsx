"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { AlertCircle, Check, ClipboardPaste, Globe, Loader2, Mic, Pause, Play, RotateCcw, Square, Trash2, Upload, X } from "lucide-react";
import { UPLOAD_LIMITS, SUPPORTED_UPLOADS, type SourceInput, type SourceKind } from "@a2n/shared";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { api, errorMessage, putUpload } from "@/lib/api";
import { fmtSize, fmtTime } from "@/lib/format";
import { SourceIcon, YoutubeGlyph, inputCls } from "../ui";

export type SourceTab = "link" | "upload" | "record" | "text" | "url";

/** A source that's ready to send: `input` goes straight into `POST /api/sources`. */
export type PickedSource = { kind: SourceKind; label: string; detail: string; input: SourceInput };

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
  if (media && file.size > UPLOAD_LIMITS.maxMediaBytes) return { ok: false, error: `Audio and video files over ${UPLOAD_LIMITS.maxMediaBytes / 1024 / 1024} MB aren’t supported yet.` };
  if (file.size > UPLOAD_LIMITS.maxUploadBytes) return { ok: false, error: `Files can be up to ${UPLOAD_LIMITS.maxUploadBytes / 1024 / 1024} MB.` };
  const contentType = byType ? file.type : EXT[ext]!.type;
  return { ok: true, text: false, kind, contentType };
}

type UploadState = { name: string; size: number; kind: SourceKind; progress: number; state: "uploading" | "done" | "error"; error?: string };

function UploadRow({ up, onRemove, onRetry }: { up: UploadState; onRemove: () => void; onRetry?: () => void }) {
  return (
    <div className="rise flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${up.state === "error" ? "bg-red-50 text-red-600" : "bg-panel text-ink-soft"}`}>
        {up.state === "error" ? <AlertCircle className="size-4" /> : <SourceIcon kind={up.kind} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm">{up.name}</p>
          <span className="shrink-0 font-mono text-[10px] text-muted">
            {up.state === "uploading" ? `${Math.floor(up.progress)}%` : up.state === "done" ? fmtSize(up.size) : "failed"}
          </span>
        </div>
        {up.state === "error" ? (
          <p className="mt-1 text-[12px] text-red-700">{up.error}</p>
        ) : (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-panel" role="progressbar" aria-valuenow={Math.floor(up.progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${up.name}`}>
            <div className={`h-full rounded-full transition-[width] duration-200 ${up.state === "uploading" ? "progress-shimmer" : "bg-green-700/60"}`} style={{ width: `${up.progress}%` }} />
          </div>
        )}
      </div>
      {up.state === "error" && onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-ghost btn-sm !min-h-[30px] shrink-0 !px-3 !py-1 text-[12px]">
          <RotateCcw className="size-3" /> Retry
        </button>
      )}
      <button
        type="button"
        aria-label={up.state === "uploading" ? `Cancel upload of ${up.name}` : `Remove ${up.name}`}
        onClick={onRemove}
        className="grid size-7 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-panel hover:text-ink"
      >
        <X className="size-3.5" />
      </button>
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

/** Browser mic via MediaRecorder; the bars are the live input level from an AnalyserNode. */
function Recorder({ onRecorded, onClear }: { onRecorded: (file: File, secs: number) => void; onClear: () => void }) {
  const [state, setState] = useState<RecState>("idle");
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const live$ = useRef<Live>({ rec: null, stream: null, ctx: null, raf: 0, acc: 0, since: 0, levels: Array.from({ length: BARS }, () => 0) });

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
      if (s >= UPLOAD_LIMITS.maxRecordingSeconds) l.rec?.stop();
    }, 250);
    return () => clearInterval(id);
  }, [state]);

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
      const total = elapsedOf(l);
      l.acc = total;
      l.since = 0;
      teardown(l);
      setSecs(Math.floor(total));
      setState("stopped");
      const blob = new Blob(chunks, { type });
      if (blob.size > UPLOAD_LIMITS.maxMediaBytes) {
        setError(`That recording is over ${UPLOAD_LIMITS.maxMediaBytes / 1024 / 1024} MB, which isn’t supported yet. Record a shorter part.`);
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
    setPreviewUrl(null);
    live$.current.levels = live$.current.levels.map(() => 0);
    paintBars();
    onClear();
  };

  const live = state === "recording" || state === "paused";

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
      <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase">
        {state === "recording" && (
          <>
            <span className="pulse-dot size-1.5 rounded-full bg-red-500" /> <span className="text-red-600">Recording</span>
          </>
        )}
        {state === "paused" && <span className="text-muted">Paused</span>}
        {state === "idle" && <span className="text-muted">Tap to start · up to {UPLOAD_LIMITS.maxRecordingSeconds / 60} min</span>}
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

/* ─────────────────────────── Step ─────────────────────────── */

const isYoutube = (host: string) => /(^|\.)(youtube\.com|youtu\.be)$/i.test(host);

function initialTab(source: PickedSource | null): SourceTab {
  if (!source) return "upload";
  if (source.kind === "recording") return "record";
  if (source.kind === "web") return "url";
  if (source.input.type === "text" && !source.input.title) return "text";
  return "upload";
}

export function SourceStep({ source, onSource }: { source: PickedSource | null; onSource: (s: PickedSource | null) => void }) {
  const [tab, setTab] = useState<SourceTab>(() => initialTab(source));
  const [url, setUrl] = useState(source?.kind === "web" && source.input.type === "url" ? source.input.url : "");
  const [text, setText] = useState(source?.input.type === "text" && !source.input.title ? source.input.text : "");
  const [up, setUp] = useState<UploadState | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastUpload = useRef<{ file: File; kind: SourceKind; contentType: string; recording: boolean } | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const upload = async (file: File, kind: SourceKind, contentType: string, recording: boolean) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    lastUpload.current = { file, kind, contentType, recording };
    onSource(null);
    setUp({ name: file.name, size: file.size, kind, progress: 0, state: "uploading" });
    try {
      const target = await api.createUpload({ filename: file.name, contentType, size: file.size });
      if (ac.signal.aborted) return;
      await putUpload(target, file, (p) => setUp((u) => (u ? { ...u, progress: p } : u)), ac.signal);
      if (ac.signal.aborted) return;
      setUp((u) => (u ? { ...u, progress: 100, state: "done" } : u));
      onSource({
        kind,
        label: file.name,
        detail: recording ? "Browser microphone" : fmtSize(file.size),
        input: { type: "upload", uploadId: target.uploadId, ...(recording && { recording: true }) },
      });
    } catch (e) {
      if (ac.signal.aborted) return;
      setUp((u) => (u ? { ...u, state: "error", error: errorMessage(e) } : u));
    }
  };

  const retryUpload = () => {
    const last = lastUpload.current;
    if (last) void upload(last.file, last.kind, last.contentType, last.recording);
  };

  const removeUpload = () => {
    abortRef.current?.abort();
    setUp(null);
    onSource(null);
  };

  const addFile = async (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    setFileError(null);
    const c = classify(file);
    if (!c.ok) {
      setFileError(c.error);
      return;
    }
    if (c.text) {
      removeUpload();
      const body = (await file.text()).trim();
      if (body.length < 20) {
        setFileError("That file is nearly empty. Paste at least a few sentences.");
        return;
      }
      if (body.length > MAX_TEXT_CHARS) {
        setFileError("That text file is too long. Paste a shorter section instead.");
        return;
      }
      setUp({ name: file.name, size: file.size, kind: "text", progress: 100, state: "done" });
      onSource({ kind: "text", label: file.name, detail: `${body.split(/\s+/).length} words`, input: { type: "text", text: body, title: file.name.replace(/\.[^.]+$/, "") } });
      return;
    }
    void upload(file, c.kind, c.contentType, false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    depth.current = 0;
    setDrag(false);
    setTab("upload");
    void addFile(e.dataTransfer.files);
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
  const urlIsYoutube = !!urlHost && isYoutube(urlHost);
  const recordingUpload = up && up.kind === "recording";
  const fileUpload = up && up.kind !== "recording";

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
              label: (
                <>
                  YouTube <span className="font-mono text-[9px] tracking-[0.1em] uppercase opacity-80">soon</span>
                </>
              ),
              icon: <YoutubeGlyph className="size-4" />,
              disabled: true,
            },
            { value: "upload", label: "Upload", icon: <Upload className="size-4" /> },
            { value: "record", label: "Record", icon: <Mic className="size-4" /> },
            { value: "text", label: "Paste text", icon: <ClipboardPaste className="size-4" /> },
            { value: "url", label: "Web page", icon: <Globe className="size-4" /> },
          ]}
        />
      </div>

      <div key={tab} className="rise mt-6">
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
                    Drag a file here, or <span className="text-red-600 underline decoration-red-300 underline-offset-4">browse</span>
                  </>
                )}
              </p>
              <p className="mt-1.5 max-w-[52ch] text-[13px] text-muted">
                Audio and video up to {UPLOAD_LIMITS.maxMediaBytes / 1024 / 1024} MB. PDF, Word, PowerPoint, images and text up to {UPLOAD_LIMITS.maxUploadBytes / 1024 / 1024} MB. Scanned PDFs and HEIC photos aren’t supported yet.
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
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                void addFile(e.target.files);
                e.target.value = "";
              }}
            />
            {fileError && (
              <p className="mt-4 flex items-start gap-2 text-[13px] text-red-700" role="alert">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> {fileError}
              </p>
            )}
            {fileUpload && (
              <div className="mt-4">
                <UploadRow up={up} onRemove={removeUpload} onRetry={retryUpload} />
              </div>
            )}
          </div>
        )}

        {tab === "record" && (
          <div>
            <Recorder
              onClear={removeUpload}
              onRecorded={(file) => void upload(file, "recording", file.type, true)}
            />
            {recordingUpload && (
              <div className="mx-auto mt-5 max-w-[460px]">
                <UploadRow up={up} onRemove={removeUpload} onRetry={retryUpload} />
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
              onChange={(e) => {
                const v = e.target.value;
                setText(v);
                const body = v.trim();
                const words = body.split(/\s+/).filter(Boolean).length;
                onSource(words >= 5 && body.length >= 20 ? { kind: "text", label: body.slice(0, 48), detail: `${words} words`, input: { type: "text", text: body } } : null);
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
                  const v = e.target.value;
                  setUrl(v);
                  let host = "";
                  let href = "";
                  try {
                    const u = new URL(v.trim());
                    if (u.protocol === "http:" || u.protocol === "https:") {
                      host = u.hostname;
                      href = u.toString();
                    }
                  } catch {
                    host = "";
                  }
                  onSource(host && !isYoutube(host) ? { kind: "web", label: host.replace(/^www\./, ""), detail: "Web page", input: { type: "url", url: href } } : null);
                }}
                placeholder="https://…"
                className={`${inputCls} !rounded-full !py-3.5 pl-11 text-[15px]`}
              />
            </div>
            {url.trim() && !urlHost && <p className="mt-3 text-[13px] text-red-600">That doesn’t look like a web address yet. Start it with https://</p>}
            {urlIsYoutube && (
              <p className="mt-3 flex items-start gap-2 text-[13px] text-red-700" role="alert">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> YouTube links aren’t supported yet. It’s coming soon; for now, upload the audio or paste the transcript.
              </p>
            )}
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

      {source && tab !== "url" && (
        <p className="rise mt-5 flex items-center gap-2 text-[13px] text-ink-soft">
          <Check className="size-4 text-green-700" /> <span className="truncate">{source.label}</span>
          <span className="font-mono text-[10px] text-muted">{source.detail}</span>
        </p>
      )}
      {up?.state === "uploading" && tab !== "upload" && tab !== "record" && (
        <p className="mt-3 flex items-center gap-2 text-[12px] text-muted">
          <Loader2 className="spin size-3.5" /> Still uploading {up.name}…
        </p>
      )}
    </div>
  );
}
