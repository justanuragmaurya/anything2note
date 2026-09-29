"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { ContentSegment } from "@a2n/shared";
import { anchorFits } from "@/lib/format";
import { AnchorChip, inputCls } from "../ui";
import { useWorkspaceNav } from "./context";

const SPEAKER_TINTS = ["var(--nt-interview)", "var(--nt-podcast)", "var(--nt-tutorial)", "var(--nt-lecture)", "var(--nt-reading)"];

/** Transcript lines (media) or pages (documents), following the player / page viewer. */
export function TranscriptView({ segments, kind }: { segments: ContentSegment[]; kind: "media" | "document" | "text" }) {
  const nav = useWorkspaceNav();
  const [q, setQ] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const timed = kind === "media";
  const speakers = [...new Set(segments.map((s) => s.speaker).filter((s): s is string => !!s))];

  const activeId = (() => {
    if (!nav) return null;
    let hit: string | null = null;
    for (const s of segments) {
      const a = s.anchor;
      if (!a) continue;
      if (a.kind === "time" ? a.at <= nav.time + 0.5 : a.page === nav.page) hit = s.id;
      if (a.kind === "time" && a.at > nav.time) break;
    }
    return hit;
  })();

  useEffect(() => {
    const list = listRef.current;
    const el = activeId ? list?.querySelector<HTMLElement>(`[data-line="${activeId}"]`) : null;
    if (!list || !el) return;
    const top = el.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top > list.scrollTop + list.clientHeight - el.offsetHeight) {
      list.scrollTo({ top: top - 24, behavior: "smooth" });
    }
  }, [activeId]);

  const s = q.trim().toLowerCase();
  const shown = s ? segments.filter((l) => `${l.heading ?? ""} ${l.text}`.toLowerCase().includes(s)) : segments;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">{timed ? "Search transcript" : "Search the text"}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={timed ? "Search the transcript" : "Search the text"} className={`${inputCls} !rounded-full !py-2 pl-9`} />
        </label>
        {speakers.length > 0 && <p className="font-mono text-[10px] tracking-[0.08em] text-muted uppercase">{speakers.length} speakers</p>}
      </div>

      <ol ref={listRef} className="relative mt-4 max-h-[62vh] space-y-1 overflow-y-auto pr-1">
        {shown.map((l) => {
          const active = l.id === activeId;
          const tint = SPEAKER_TINTS[Math.max(0, speakers.indexOf(l.speaker ?? "")) % SPEAKER_TINTS.length]!;
          const anchor = anchorFits(l.anchor, kind) ? l.anchor : null;
          return (
            <li key={l.id} data-line={l.id} className={`relative rounded-2xl p-3 transition-colors duration-300 ${active ? "bg-red-50" : "hover:bg-paper"}`}>
              {active && <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-red-500" aria-hidden />}
              {(l.speaker || anchor || l.heading) && (
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  {l.speaker && (
                    <span className="inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2 pl-0.5 text-xs font-medium text-ink">
                      <span className="grid size-5 place-items-center rounded-full text-[10px]" style={{ background: tint }}>
                        {l.speaker[0]}
                      </span>
                      {l.speaker}
                    </span>
                  )}
                  {anchor && <AnchorChip anchor={anchor} />}
                  {l.heading && <span className="text-[13px] font-medium text-ink">{l.heading}</span>}
                  {active && <span className="font-mono text-[9px] tracking-[0.12em] text-red-600 uppercase">{timed ? "Now" : "On screen"}</span>}
                </div>
              )}
              <p className={`text-[14px] leading-relaxed whitespace-pre-line ${active ? "text-ink" : "text-ink-soft"}`}>{l.text}</p>
            </li>
          );
        })}
        {shown.length === 0 && <li className="py-10 text-center text-sm text-muted">{segments.length ? `No lines match “${q}”.` : "No text was found in this source."}</li>}
      </ol>
    </div>
  );
}
