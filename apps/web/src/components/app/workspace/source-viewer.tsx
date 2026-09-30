"use client";

import Image from "next/image";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref, type RefObject, type SyntheticEvent } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { youtubeThumbnailUrl, type ContentSegment, type LibraryItem, type NoteSection } from "@a2n/shared";
import { fmtTime } from "@/lib/format";
import { loadYoutubeApi, YT_STATE, type YTPlayer } from "@/lib/youtube-player";
import { SourceIcon } from "../ui";

type Chapter = { title: string; at: number };

/** Chapters for the seek bar: note sections that point at a time. */
export function chaptersFrom(sections: NoteSection[] | undefined): Chapter[] {
  return (sections ?? []).flatMap((s) => (s.anchor?.kind === "time" ? [{ title: s.heading.replace(/^\d+\.\s*/, ""), at: s.anchor.at }] : []));
}

/** Chapter links under a player; the one playing now is highlighted. */
function ChapterList({ chapters, time, playing, onPick }: { chapters: Chapter[]; time: number; playing: boolean; onPick: (at: number) => void }) {
  return (
    <div className="border-t border-night-line px-4 py-3">
      <p className="font-mono text-[10px] tracking-[0.12em] text-night-muted uppercase">Chapters</p>
      <ul className="mt-2 space-y-0.5">
        {chapters.map((c, i) => {
          const next = chapters[i + 1];
          const active = time >= c.at && (!next || time < next.at);
          return (
            <li key={`${c.at}-${c.title}`}>
              <button
                type="button"
                onClick={() => onPick(c.at)}
                className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors ${active ? "bg-night-3 text-night-text" : "text-night-muted hover:bg-night-2 hover:text-night-text"}`}
              >
                <span className={`font-mono text-[10px] ${active ? "text-red-400" : ""}`}>{fmtTime(c.at)}</span>
                <span className="flex-1 truncate">{c.title}</span>
                {active && playing && (
                  <span className="flex h-3 items-end gap-px" aria-hidden>
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="wave-bar w-0.5 rounded-full bg-red-400" style={{ height: "100%", ["--d" as string]: `${d * 150}ms` }} />
                    ))}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const SPEEDS = [1, 1.5, 2] as const;

export type MediaState = { time: number; duration: number; playing: boolean; speed: number; error: boolean };

/**
 * Player around the user's own file (`mediaUrl`). The element lives here; the workspace owns
 * the ref so anchor chips can seek it.
 */
export function MediaPlayer({
  src,
  video,
  title,
  label,
  chapters,
  caption,
  mediaRef,
  state,
  onState,
  onReload,
}: {
  src: string;
  video: boolean;
  title: string;
  label: string;
  chapters: Chapter[];
  caption: ContentSegment | null;
  mediaRef: RefObject<(HTMLVideoElement & HTMLAudioElement) | null>;
  state: MediaState;
  onState: (patch: Partial<MediaState>) => void;
  onReload: () => void;
}) {
  const { time, duration, playing, speed, error } = state;
  const pct = duration ? (time / duration) * 100 : 0;

  const el = () => mediaRef.current;
  const toggle = () => {
    const m = el();
    if (!m) return;
    if (m.paused) void m.play().catch(() => {});
    else m.pause();
  };
  const seekTo = (s: number) => {
    const m = el();
    if (m) m.currentTime = Math.max(0, duration ? Math.min(duration, s) : s);
  };
  const seekFromPointer = (clientX: number, bar: HTMLElement) => {
    const r = bar.getBoundingClientRect();
    if (duration) seekTo(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * duration);
  };

  const events = {
    ref: mediaRef,
    src,
    preload: "metadata" as const,
    onTimeUpdate: (e: SyntheticEvent<HTMLMediaElement>) => onState({ time: e.currentTarget.currentTime }),
    onLoadedMetadata: (e: SyntheticEvent<HTMLMediaElement>) => {
      const d = e.currentTarget.duration;
      e.currentTarget.playbackRate = speed;
      onState({ error: false, ...(Number.isFinite(d) && d > 0 && { duration: d }) });
    },
    onDurationChange: (e: SyntheticEvent<HTMLMediaElement>) => {
      const d = e.currentTarget.duration;
      if (Number.isFinite(d) && d > 0) onState({ duration: d });
    },
    onPlay: () => onState({ playing: true }),
    onPause: () => onState({ playing: false }),
    onEnded: () => onState({ playing: false }),
    onError: () => onState({ error: true, playing: false }),
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-night-line bg-night text-night-text shadow-[0_30px_60px_-40px_rgba(20,10,10,0.9)]">
      <div className="relative aspect-video overflow-hidden">
        {video ? (
          <video {...events} playsInline onClick={toggle} className="absolute inset-0 h-full w-full bg-black object-contain" />
        ) : (
          <>
            <audio {...events} className="hidden" />
            <div className="dots-night absolute inset-0 opacity-70" aria-hidden />
            <div className="absolute inset-x-6 top-5 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] text-night-muted uppercase">
              <SourceIcon kind="audio" className="size-3.5 text-red-400" /> <span className="truncate">{label}</span>
            </div>
          </>
        )}

        {error ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-night/85 p-6 text-center">
            <div>
              <AlertCircle className="mx-auto size-6 text-red-400" />
              <p className="mt-2 text-sm">The original couldn’t be loaded.</p>
              <button type="button" onClick={onReload} className="btn btn-cream btn-sm mt-3">
                <RotateCcw className="size-3.5" /> Reload
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={toggle}
            className={`absolute top-1/2 left-1/2 z-10 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-cream text-ink shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400 ${
              playing ? "opacity-0 hover:opacity-100 focus-visible:opacity-100" : "opacity-100"
            }`}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
          </button>
        )}

        {caption && !error && (
          <p key={caption.id} className="rise pointer-events-none absolute inset-x-6 bottom-4 mx-auto max-w-[46ch] rounded-lg bg-night/80 px-3 py-1.5 text-center text-[12px] leading-snug text-night-text backdrop-blur">
            {caption.text}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-night-line bg-night-2 px-4 pt-3 pb-3.5">
        <div
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={fmtTime(time)}
          onPointerDown={(e) => seekFromPointer(e.clientX, e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") seekTo(time + 10);
            if (e.key === "ArrowLeft") seekTo(time - 10);
          }}
          className="group relative h-4 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-night-text/15 transition-[height] group-hover:h-1.5">
            <div className="h-full rounded-full bg-red-400" style={{ width: `${pct}%` }} />
          </div>
          {duration > 0 &&
            chapters.map((c) => (
              <span key={`${c.at}-${c.title}`} className="absolute top-1/2 h-2 w-0.5 -translate-y-1/2 rounded bg-night-text/50" style={{ left: `${(c.at / duration) * 100}%` }} aria-hidden />
            ))}
          <span
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream opacity-0 shadow transition-opacity group-hover:opacity-100"
            style={{ left: `${pct}%` }}
            aria-hidden
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="grid size-8 place-items-center rounded-full text-night-text transition-colors hover:bg-night-3">
            {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
          </button>
          <button type="button" onClick={() => seekTo(time - 10)} aria-label="Back 10 seconds" className="grid size-8 place-items-center rounded-full text-night-muted transition-colors hover:bg-night-3 hover:text-night-text">
            <RotateCcw className="size-3.5" />
          </button>
          <button type="button" onClick={() => seekTo(time + 10)} aria-label="Forward 10 seconds" className="grid size-8 place-items-center rounded-full text-night-muted transition-colors hover:bg-night-3 hover:text-night-text">
            <RotateCw className="size-3.5" />
          </button>
          <span className="ml-1 font-mono text-[11px] text-night-muted tabular-nums">
            <span className="text-night-text">{fmtTime(time)}</span> / {duration ? fmtTime(duration) : "–:––"}
          </span>
          <button
            type="button"
            onClick={() => {
              const next = SPEEDS[(SPEEDS.indexOf(speed as (typeof SPEEDS)[number]) + 1) % SPEEDS.length]!;
              const m = el();
              if (m) m.playbackRate = next;
              onState({ speed: next });
            }}
            className="ml-auto rounded-full border border-night-line px-2.5 py-1 font-mono text-[10px] text-night-muted transition-colors hover:border-night-muted hover:text-night-text"
            aria-label={`Playback speed ${speed}x`}
          >
            {speed}×
          </button>
        </div>
      </div>

      {chapters.length > 0 && (
        <ChapterList
          chapters={chapters}
          time={time}
          playing={playing}
          onPick={(at) => {
            seekTo(at);
            void el()?.play().catch(() => {});
          }}
        />
      )}
      <span className="sr-only">{title}</span>
    </div>
  );
}

export type YoutubeHandle = { seek: (at: number) => void };

/**
 * YouTube's own embed through the IFrame Player API. Like the file player, the workspace owns
 * `playerRef` so anchor chips can seek it, and gets the playback time back through `onState`
 * (polled while playing, since the API has no time events).
 */
export function YoutubePlayer({
  videoId,
  href,
  label,
  start,
  chapters,
  playerRef,
  state,
  onState,
}: {
  videoId: string;
  href: string;
  label: string;
  /** Seconds to cue the video at, from a `?t=` link */
  start: number;
  chapters: Chapter[];
  playerRef: Ref<YoutubeHandle>;
  state: MediaState;
  onState: (patch: Partial<MediaState>) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  // A seek asked for before the player is ready; applied once it is.
  const pending = useRef<number | null>(null);
  const startAt = useRef(start);
  const report = useRef(onState);
  const [failed, setFailed] = useState<string | null>(null);
  const { time, playing } = state;

  useEffect(() => {
    report.current = onState;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let created: YTPlayer | null = null;
    // The API swaps its target for an iframe, so give it a node React doesn't own.
    const mount = document.createElement("div");
    host.appendChild(mount);
    loadYoutubeApi()
      .then((YT) => {
        if (cancelled) return;
        created = new YT.Player(mount, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: { playsinline: 1, rel: 0, start: Math.floor(startAt.current) },
          events: {
            onReady: ({ target }) => {
              player.current = target;
              const d = target.getDuration();
              report.current({ error: false, ...(d > 0 && { duration: d }) });
              if (pending.current !== null) {
                target.seekTo(pending.current, true);
                target.playVideo();
                pending.current = null;
              }
            },
            onStateChange: ({ target, data }) => {
              const d = target.getDuration();
              report.current({ time: target.getCurrentTime(), playing: data === YT_STATE.playing || data === YT_STATE.buffering, ...(d > 0 && { duration: d }) });
            },
            onError: ({ data }) => {
              report.current({ error: true, playing: false });
              setFailed(data === 101 || data === 150 ? "The owner doesn’t allow this video to play outside YouTube." : "This video can’t be played here right now.");
            },
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        report.current({ error: true, playing: false });
        setFailed("The YouTube player couldn’t be loaded. An ad or content blocker may be stopping it.");
      });
    return () => {
      cancelled = true;
      created?.destroy();
      player.current = null;
      host.replaceChildren();
    };
  }, [videoId]);

  // Follow the video so the transcript and chapters highlight the line being said.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const p = player.current;
      if (p) report.current({ time: p.getCurrentTime() });
    }, 500);
    return () => clearInterval(id);
  }, [playing]);

  const seek = useCallback((at: number) => {
    const p = player.current;
    if (!p) {
      pending.current = at;
      return;
    }
    p.seekTo(at, true);
    p.playVideo();
  }, []);

  useImperativeHandle(playerRef, () => ({ seek }), [seek]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-night-line bg-night text-night-text shadow-[0_30px_60px_-40px_rgba(20,10,10,0.9)]">
      <div className="relative aspect-video overflow-hidden bg-black">
        <Image src={youtubeThumbnailUrl(videoId)} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover opacity-60" />
        <div ref={hostRef} className="absolute inset-0 [&>iframe]:block [&>iframe]:size-full" />
        {failed && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-night/85 p-6 text-center">
            <div>
              <AlertCircle className="mx-auto size-6 text-red-400" />
              <p className="mt-2 text-sm">{failed}</p>
              <a href={href} target="_blank" rel="noreferrer" className="btn btn-cream btn-sm mt-3">
                <ExternalLink className="size-3.5" /> Open on YouTube
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-night-line bg-night-2 px-4 py-2.5">
        <span className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] text-night-muted uppercase">
          <SourceIcon kind="youtube" className="size-3.5 shrink-0 text-red-400" /> <span className="truncate">{label}</span>
        </span>
        <a href={href} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[12px] text-night-muted transition-colors hover:text-night-text">
          <ExternalLink className="size-3.5" /> Open on YouTube
        </a>
      </div>

      {chapters.length > 0 && <ChapterList chapters={chapters} time={time} playing={playing} onPick={seek} />}
    </div>
  );
}

export function ViewerHeader({ label, page, total, onPage, href }: { label: string; page?: number; total?: number; onPage?: (n: number) => void; href?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line bg-paper/70 px-4 py-2.5">
      <span className="truncate font-mono text-[10px] tracking-[0.1em] text-muted uppercase">{label}</span>
      <div className="flex shrink-0 items-center gap-1">
        {page !== undefined && total !== undefined && onPage && total > 1 && (
          <>
            <button type="button" onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1} aria-label="Previous page" className="grid size-7 place-items-center rounded-full text-ink-soft transition-colors hover:bg-card disabled:opacity-40">
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[64px] text-center font-mono text-[11px] text-ink tabular-nums">
              p. {page} / {total}
            </span>
            <button type="button" onClick={() => onPage(Math.min(total, page + 1))} disabled={page >= total} aria-label="Next page" className="grid size-7 place-items-center rounded-full text-ink-soft transition-colors hover:bg-card disabled:opacity-40">
              <ChevronRight className="size-4" />
            </button>
          </>
        )}
        {href && (
          <a href={href} target="_blank" rel="noreferrer" aria-label="Open the original" title="Open the original" className="grid size-7 place-items-center rounded-full text-ink-soft transition-colors hover:bg-card hover:text-ink">
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * The PDF in the browser's own viewer; jumping to a page reloads it at `#page=N`. The fallback
 * when pdf.js can't load the file (see pdf-viewer.tsx).
 */
export function PdfFrame({ src, page, total, label, flash, onPage }: { src: string; page: number; total: number; label: string; flash: number; onPage: (n: number) => void }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-panel">
      <ViewerHeader label={label} page={page} total={total} onPage={onPage} href={src} />
      <iframe key={`${page}-${flash}`} src={`${src}#page=${page}`} title={`${label}, page ${page}`} className="page-flash block h-[min(78vh,720px)] w-full bg-card" />
    </div>
  );
}

/** Slides and other documents the browser can't show: the extracted text, page by page. */
export function PageTextViewer({ segments, page, total, label, flash, onPage, href }: { segments: ContentSegment[]; page: number; total: number; label: string; flash: number; onPage: (n: number) => void; href: string | null }) {
  const seg = segments.find((s) => s.anchor?.kind === "page" && s.anchor.page === page) ?? (total <= 1 ? segments[0] : undefined);
  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-panel">
      <ViewerHeader label={label} page={page} total={total} onPage={onPage} href={href} />
      <div className="p-4 sm:p-6">
        <div key={`${page}-${flash}`} className="page-flash mx-auto max-h-[560px] w-full max-w-[460px] overflow-y-auto rounded-md bg-card p-6 shadow-[0_18px_40px_-20px_rgba(60,20,10,0.4)]">
          {seg ? (
            <>
              {seg.heading && <h3 className="font-serif text-[20px] leading-tight text-ink">{seg.heading}</h3>}
              <p className="mt-3 font-serif text-[14px] leading-[1.6] whitespace-pre-line text-ink-soft">{seg.text}</p>
            </>
          ) : (
            <p className="text-sm text-muted">No text on this page.</p>
          )}
          <p className="mt-5 text-center font-mono text-[9px] text-muted">{page}</p>
        </div>
      </div>
    </div>
  );
}

export function ImageViewer({ src, label }: { src: string; label: string }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-panel">
      <ViewerHeader label={label} href={src} />
      <div className="grid place-items-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL to the user's own upload */}
        <img src={src} alt={label} className="max-h-[70vh] w-auto rounded-md shadow-[0_18px_40px_-20px_rgba(60,20,10,0.4)]" />
      </div>
    </div>
  );
}

/** Pasted text, web pages and Word files: the extracted text itself. */
export function SourceText({ item, segments, href }: { item: LibraryItem; segments: ContentSegment[]; href: string | null }) {
  const words = segments.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0);
  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-paper/70 px-4 py-2.5">
        <span className="flex min-w-0 items-center gap-1.5 truncate font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
          <SourceIcon kind={item.source} className="size-3.5" /> {item.sourceLabel} · {words.toLocaleString("en-US")} words
        </span>
        {href && (
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[12px] text-ink-soft hover:text-ink">
            <Download className="size-3.5" /> Original
          </a>
        )}
      </div>
      <div className="max-h-[min(62vh,560px)] space-y-3 overflow-y-auto p-5 text-[14px] leading-relaxed text-ink-soft">
        {segments.map((s) => (
          <p key={s.id}>{s.text}</p>
        ))}
      </div>
    </div>
  );
}

/** No viewer to show yet (still reading) or the original is gone. */
export function ViewerPlaceholder({ item, message }: { item: LibraryItem; message: string }) {
  return (
    <div className="grid aspect-video place-items-center rounded-[24px] border border-dashed border-line-strong bg-card/60 p-6 text-center">
      <div>
        <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-panel text-ink-soft">
          {item.source === "pdf" ? <FileText className="size-5" /> : <SourceIcon kind={item.source} className="size-5" />}
        </span>
        <p className="mt-3 text-sm text-ink-soft">{message}</p>
        <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-muted uppercase">{item.sourceLabel}</p>
      </div>
    </div>
  );
}
