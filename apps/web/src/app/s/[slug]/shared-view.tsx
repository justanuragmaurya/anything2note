"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { youtubeWatchUrl, type Anchor, type OutputKey, type SharedItem, type SourceKind } from "@a2n/shared";
import { QueryProvider } from "@/components/app/query-provider";
import { SourceIcon } from "@/components/app/ui";
import { WorkspaceNavContext, type WorkspaceNav } from "@/components/app/workspace/context";
import { Renderer } from "@/components/app/workspace/renderers/renderer";
import type { SharedState } from "@/components/app/workspace/renderers/shared";
import { YoutubePlayer, type MediaState, type YoutubeHandle } from "@/components/app/workspace/source-viewer";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { MEDIA_KINDS } from "@/lib/format";
import { noteType, OUTPUT_LABELS } from "@/lib/note-types";

const contentKindOf = (s: SourceKind): SharedState["contentKind"] =>
  MEDIA_KINDS.includes(s) ? "media" : s === "pdf" || s === "slides" || s === "image" ? "document" : "text";

const noop = () => {};

/**
 * The shared outputs, read-only, with the workspace's own renderers. For a YouTube source the
 * video is embedded and timestamp chips seek it; other sources stay private, so their chips are
 * plain labels.
 */
export function SharedView({ item }: { item: SharedItem }) {
  const nt = noteType(item.noteType);
  const [tab, setTab] = useState<OutputKey | undefined>(item.outputs[0]?.key);
  const current = item.outputs.find((o) => o.key === tab) ?? item.outputs[0];
  const youtubeRef = useRef<YoutubeHandle | null>(null);
  const [media, setMedia] = useState<MediaState>({ time: 0, duration: item.durationSec ?? 0, playing: false, speed: 1, error: false });
  const playerBoxRef = useRef<HTMLDivElement>(null);
  const patchMedia = useCallback((p: Partial<MediaState>) => setMedia((m) => ({ ...m, ...p })), []);

  const seek = useCallback((a: Anchor) => {
    if (a.kind !== "time") return;
    youtubeRef.current?.seek(a.at);
    setMedia((m) => ({ ...m, time: a.at }));
    const el = playerBoxRef.current;
    if (el && window.innerWidth < 1024) {
      const r = el.getBoundingClientRect();
      if (r.top < 60 || r.top > window.innerHeight * 0.5) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);
  const nav = useMemo<WorkspaceNav>(() => ({ time: media.time, page: 1, seek }), [media.time, seek]);

  const state = (outputKey: OutputKey): SharedState => ({
    itemId: "",
    outputKey,
    noteType: item.noteType,
    color: nt.color,
    contentKind: contentKindOf(item.source),
    tasksDone: {},
    toggleTask: noop,
    taskEdits: {},
    editTask: noop,
    flashcardsDue: 0,
    readOnly: true,
  });

  const outputs = (
    <div className="min-w-0 rounded-[28px] border border-line bg-card p-4 shadow-[0_40px_80px_-50px_rgba(60,20,10,0.45)] sm:p-8">
      {item.outputs.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Nothing has been shared from this note yet.</p>
      ) : (
        <>
          {item.outputs.length > 1 && (
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              <SlidingTabs value={current?.key ?? ""} onChange={(k) => setTab(k as OutputKey)} size="sm" ariaLabel="Outputs" items={item.outputs.map((o) => ({ value: o.key, label: OUTPUT_LABELS[o.key] }))} />
            </div>
          )}
          {current && (
            <div role="tabpanel" aria-label={OUTPUT_LABELS[current.key]} key={current.key} className="rise mt-6">
              {item.outputs.length === 1 && <p className="eyebrow mb-4 text-[10px]">{OUTPUT_LABELS[current.key]}</p>}
              <Renderer data={current.data} state={state(current.key)} />
            </div>
          )}
        </>
      )}
    </div>
  );

  const aside = (
    <aside className="space-y-4">
      {item.youtubeId && (
        <div ref={playerBoxRef} className="scroll-mt-20">
          <YoutubePlayer
            videoId={item.youtubeId}
            href={item.sourceUrl ?? youtubeWatchUrl(item.youtubeId)}
            label={item.sourceLabel}
            start={0}
            chapters={[]}
            playerRef={youtubeRef}
            state={media}
            onState={patchMedia}
          />
        </div>
      )}
      {!item.youtubeId && item.source === "web" && item.sourceUrl && (
        <a href={item.sourceUrl} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 rounded-[22px] border border-line bg-card p-4 text-sm text-ink-soft transition-colors hover:border-line-strong hover:text-ink">
          <SourceIcon kind="web" className="size-4 shrink-0 text-muted" />
          <span className="min-w-0 flex-1 truncate">{item.sourceLabel}</span>
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      )}
      <div className="rounded-[22px] border border-line bg-card/60 p-5 text-sm text-ink-soft">
        <p className="eyebrow">About this page</p>
        <p className="mt-2 leading-relaxed">
          {item.youtubeId
            ? "Timestamps jump the video to where each line came from."
            : item.source === "pdf" || item.source === "slides" || item.source === "image"
              ? "Page numbers show where each line came from."
              : MEDIA_KINDS.includes(item.source)
                ? "Timestamps show where each line came from."
                : "Made from the text of the source."}{" "}
          {item.sharedBy} shared these outputs only; {item.youtubeId ? "their chat and library" : "the original file, transcript and chat"} stay private.
        </p>
        {nt.optional.length > 0 && (
          <>
            <p className="mt-4 text-xs text-muted">A {nt.label.toLowerCase()} note can also include:</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {nt.optional.map((o) => (
                <li key={o} className="rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-[11px]">
                  + {OUTPUT_LABELS[o]}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </aside>
  );

  return (
    <QueryProvider>
      <WorkspaceNavContext.Provider value={item.youtubeId ? nav : null}>
        <section className="px-4 py-10 sm:px-5 md:py-16">
          <div className="mx-auto grid max-w-[1160px] grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
            {/* On phones a video comes first, so chips have something to seek; otherwise the outputs do. */}
            <div className={`lg:sticky lg:top-24 lg:order-2 ${item.youtubeId ? "" : "order-2"}`}>{aside}</div>
            <div className="lg:order-1">{outputs}</div>
          </div>
        </section>
      </WorkspaceNavContext.Provider>
    </QueryProvider>
  );
}
