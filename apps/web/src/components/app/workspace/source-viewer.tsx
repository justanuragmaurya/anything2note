"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { fmtTime, seeded, type Anchor, type NoteSection, type PdfPage, type TranscriptLine } from "@/lib/mock/app-data";
import { YoutubeGlyph } from "../ui";

type Chapter = { title: string; anchor: Anchor };

export function chaptersFrom(sections: NoteSection[] | undefined): Chapter[] {
  return (sections ?? []).map((s) => ({ title: s.heading.replace(/^\d+\.\s*/, ""), anchor: s.anchor }));
}

const SPEEDS = [1, 1.5, 2] as const;

export function MediaPlayer({
  duration,
  time,
  playing,
  speed,
  video,
  label,
  title,
  chapters,
  caption,
  onToggle,
  onSeek,
  onSpeed,
}: {
  duration: number;
  time: number;
  playing: boolean;
  speed: number;
  video: boolean;
  label: string;
  title: string;
  chapters: Chapter[];
  caption: TranscriptLine | null;
  onToggle: () => void;
  onSeek: (s: number) => void;
  onSpeed: (s: number) => void;
}) {
  const pct = (time / duration) * 100;
  const barRef = useRef<HTMLDivElement>(null);

  const seekFromPointer = (clientX: number) => {
    const r = barRef.current?.getBoundingClientRect();
    if (!r) return;
    onSeek(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * duration);
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-night-line bg-night text-night-text shadow-[0_30px_60px_-40px_rgba(20,10,10,0.9)]">
      <div className="relative aspect-video overflow-hidden">
        <div className="dots-night absolute inset-0 opacity-70" aria-hidden />
        {video ? (
          <div className="absolute inset-0 flex flex-col justify-between p-5" aria-hidden>
            <span className="flex items-center gap-1.5 self-start rounded-full bg-night-2/80 px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] text-night-muted uppercase">
              <YoutubeGlyph className="size-3.5 text-red-400" /> {label}
            </span>
            <div className="mx-auto w-[72%] rounded-lg border border-night-line bg-[#1f2a24]/80 p-4 font-serif text-[clamp(13px,2.4vw,22px)] text-[#dfe9dd] italic shadow-inner">
              <p>(f ∘ g)′(x) = f′(g(x)) · g′(x)</p>
              <p className="mt-1 text-[0.7em] opacity-70">d/dx sin(x²) = 2x · cos(x²)</p>
            </div>
            <span />
          </div>
        ) : (
          <div aria-hidden className="absolute inset-x-6 top-1/2 flex h-[46%] -translate-y-1/2 items-center gap-[3px]">
            {Array.from({ length: 56 }).map((_, i) => {
              const played = i / 56 <= time / duration;
              return (
                <span
                  key={i}
                  className={`flex-1 rounded-full transition-colors duration-200 ${played ? "bg-red-400" : "bg-night-text/20"}`}
                  style={{ height: `${Math.round(14 + Math.abs(Math.sin(i * 1.3)) * 60 + seeded(i) * 26)}%` }}
                />
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={onToggle}
          className={`absolute top-1/2 left-1/2 z-10 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-cream text-ink shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400 ${
            playing ? "opacity-0 hover:opacity-100 focus-visible:opacity-100" : "opacity-100"
          }`}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
        </button>

        {caption && (
          <p key={caption.id} className="rise absolute inset-x-6 bottom-4 mx-auto max-w-[46ch] rounded-lg bg-night/80 px-3 py-1.5 text-center text-[12px] leading-snug text-night-text backdrop-blur">
            {caption.text}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-night-line bg-night-2 px-4 pt-3 pb-3.5">
        <div
          ref={barRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={fmtTime(time)}
          onPointerDown={(e) => seekFromPointer(e.clientX)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") onSeek(Math.min(duration, time + 10));
            if (e.key === "ArrowLeft") onSeek(Math.max(0, time - 10));
          }}
          className="group relative h-4 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-night-text/15 transition-[height] group-hover:h-1.5">
            <div className="h-full rounded-full bg-red-400 transition-[width] duration-200" style={{ width: `${pct}%` }} />
          </div>
          {chapters.map((c) =>
            c.anchor.kind === "time" ? (
              <span key={c.title} className="absolute top-1/2 h-2 w-0.5 -translate-y-1/2 rounded bg-night-text/50" style={{ left: `${(c.anchor.at / duration) * 100}%` }} aria-hidden />
            ) : null,
          )}
          <span
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream opacity-0 shadow transition-opacity group-hover:opacity-100"
            style={{ left: `${pct}%` }}
            aria-hidden
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <button type="button" onClick={onToggle} aria-label={playing ? "Pause" : "Play"} className="grid size-8 place-items-center rounded-full text-night-text transition-colors hover:bg-night-3">
            {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
          </button>
          <button type="button" onClick={() => onSeek(Math.max(0, time - 10))} aria-label="Back 10 seconds" className="grid size-8 place-items-center rounded-full text-night-muted transition-colors hover:bg-night-3 hover:text-night-text">
            <RotateCcw className="size-3.5" />
          </button>
          <button type="button" onClick={() => onSeek(Math.min(duration, time + 10))} aria-label="Forward 10 seconds" className="grid size-8 place-items-center rounded-full text-night-muted transition-colors hover:bg-night-3 hover:text-night-text">
            <RotateCw className="size-3.5" />
          </button>
          <span className="ml-1 font-mono text-[11px] text-night-muted tabular-nums">
            <span className="text-night-text">{fmtTime(time)}</span> / {fmtTime(duration)}
          </span>
          <button
            type="button"
            onClick={() => onSpeed(SPEEDS[(SPEEDS.indexOf(speed as (typeof SPEEDS)[number]) + 1) % SPEEDS.length]!)}
            className="ml-auto rounded-full border border-night-line px-2.5 py-1 font-mono text-[10px] text-night-muted transition-colors hover:border-night-muted hover:text-night-text"
            aria-label={`Playback speed ${speed}x`}
          >
            {speed}×
          </button>
        </div>
      </div>

      {chapters.length > 0 && (
        <div className="border-t border-night-line px-4 py-3">
          <p className="font-mono text-[10px] tracking-[0.12em] text-night-muted uppercase">Chapters</p>
          <ul className="mt-2 space-y-0.5">
            {chapters.map((c) => {
              const at = c.anchor.kind === "time" ? c.anchor.at : 0;
              const next = chapters.find((x) => x.anchor.kind === "time" && x.anchor.at > at);
              const active = time >= at && (!next || (next.anchor.kind === "time" && time < next.anchor.at));
              return (
                <li key={c.title}>
                  <button
                    type="button"
                    onClick={() => onSeek(at)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors ${active ? "bg-night-3 text-night-text" : "text-night-muted hover:bg-night-2 hover:text-night-text"}`}
                  >
                    <span className={`font-mono text-[10px] ${active ? "text-red-400" : ""}`}>{fmtTime(at)}</span>
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
      )}
      <span className="sr-only">{title}</span>
    </div>
  );
}

export function PdfViewer({
  pages,
  total,
  page,
  label,
  flash,
  onPage,
}: {
  pages: PdfPage[];
  total: number;
  page: number;
  label: string;
  /** increments on every jump so the page can flash */
  flash: number;
  onPage: (n: number) => void;
}) {
  const data = pages.find((p) => p.page === page);
  const thumbsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = thumbsRef.current?.querySelector<HTMLElement>(`[data-page="${page}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [page]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-paper/70 px-4 py-2.5">
        <span className="truncate font-mono text-[10px] tracking-[0.1em] text-muted uppercase">{label}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page" className="grid size-7 place-items-center rounded-full text-ink-soft transition-colors hover:bg-card disabled:opacity-40">
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[64px] text-center font-mono text-[11px] text-ink tabular-nums">
            p. {page} / {total}
          </span>
          <button type="button" onClick={() => onPage(Math.min(total, page + 1))} disabled={page === total} aria-label="Next page" className="grid size-7 place-items-center rounded-full text-ink-soft transition-colors hover:bg-card disabled:opacity-40">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row">
        {/* Thumbnails */}
        <div ref={thumbsRef} className="no-scrollbar flex gap-2 overflow-x-auto border-t border-line p-3 sm:max-h-[560px] sm:w-[92px] sm:flex-col sm:overflow-y-auto sm:border-t-0 sm:border-r">
          {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              data-page={n}
              onClick={() => onPage(n)}
              aria-label={`Page ${n}`}
              aria-current={n === page ? "page" : undefined}
              className={`group relative w-[54px] shrink-0 rounded-md border bg-card p-1.5 transition-all duration-200 sm:w-full ${n === page ? "border-red-400 shadow-[0_0_0_3px_var(--red-100)]" : "border-line hover:-translate-y-px hover:border-line-strong"}`}
            >
              <div className="aspect-[8.5/11] space-y-[3px]">
                <div className="h-[3px] w-3/5 rounded-full bg-ink/35" />
                {Array.from({ length: 7 }).map((_, k) => (
                  <div key={k} className="h-[2px] rounded-full bg-ink/12" style={{ width: `${Math.round(60 + seeded(n * 10 + k) * 40)}%` }} />
                ))}
              </div>
              <span className={`mt-1 block text-center font-mono text-[9px] ${n === page ? "text-red-600" : "text-muted"}`}>{n}</span>
            </button>
          ))}
        </div>

        {/* Page */}
        <div className="flex-1 p-4 sm:p-6">
          <div
            key={`${page}-${flash}`}
            className="page-flash mx-auto aspect-[8.5/11] max-h-[520px] w-full max-w-[400px] overflow-hidden rounded-md bg-card p-[8%] shadow-[0_18px_40px_-20px_rgba(60,20,10,0.4)]"
          >
            <p className="font-mono text-[8px] tracking-[0.1em] text-muted uppercase">Vaswani et al. · 2017</p>
            <h3 className="mt-3 font-serif text-[clamp(15px,2.4vw,20px)] leading-tight text-ink">{data?.heading ?? `Section ${page}`}</h3>
            <div className="mt-3 space-y-2.5 font-serif text-[clamp(9px,1.4vw,11.5px)] leading-[1.55] text-ink-soft">
              {(data?.lines ?? []).map((l) => (
                <p key={l} className="rounded-sm bg-red-100/0 transition-colors">
                  {l}
                </p>
              ))}
            </div>
            <div className="mt-4 space-y-[7px]" aria-hidden>
              {Array.from({ length: data ? 9 : 16 }).map((_, k) => (
                <div key={k} className="h-[5px] rounded-full bg-ink/8" style={{ width: `${Math.round(70 + seeded(page * 31 + k) * 30)}%` }} />
              ))}
            </div>
            <p className="mt-5 text-center font-mono text-[8px] text-muted">{page}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
