"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Search } from "lucide-react";
import type { TranscriptLine } from "@/lib/mock/app-data";
import { AnchorChip, inputCls } from "../ui";
import { useWorkspaceNav } from "./context";

const SPEAKER_TINTS = ["var(--nt-meeting)", "var(--nt-interview)", "var(--nt-podcast)", "var(--nt-tutorial)", "var(--nt-lecture)"];

function SpeakerLabel({
  id,
  name,
  tint,
  onRename,
}: {
  id: string;
  name: string;
  tint: string;
  onRename: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const renamed = name !== id;

  if (editing)
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          onRename(id, draft.trim() || id);
          setEditing(false);
        }}
      >
        <span className="font-mono text-[10px] text-muted">{id} →</span>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            onRename(id, draft.trim() || id);
            setEditing(false);
          }}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          aria-label={`Rename speaker ${id}`}
          className="w-24 rounded-full border border-red-300 bg-card px-2 py-0.5 text-xs focus:shadow-[0_0_0_3px_var(--red-50)] focus:outline-none"
        />
        <button type="submit" aria-label="Save name" className="grid size-5 place-items-center rounded-full bg-red-500 text-cream">
          <Check className="size-3" strokeWidth={3} />
        </button>
      </form>
    );

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(renamed ? name : "");
        setEditing(true);
      }}
      className="group/sp inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2 pl-0.5 text-xs font-medium text-ink transition-colors hover:bg-panel"
      aria-label={`Rename ${name}`}
    >
      <span className="grid size-5 place-items-center rounded-full text-[10px]" style={{ background: tint }}>
        {name[0]}
      </span>
      {name}
      {renamed && <span className="font-mono text-[9px] font-normal text-muted">({id})</span>}
      <Pencil className="size-3 text-muted opacity-0 transition-opacity group-hover/sp:opacity-100" aria-hidden />
    </button>
  );
}

export function TranscriptView({
  lines,
  speakers,
  onRename,
}: {
  lines: TranscriptLine[];
  speakers: Record<string, string>;
  onRename: (id: string, name: string) => void;
}) {
  const nav = useWorkspaceNav();
  const [q, setQ] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const timed = lines[0]?.anchor.kind === "time";
  const ids = Object.keys(speakers);

  const activeId = (() => {
    if (!nav) return null;
    let hit: string | null = null;
    for (const l of lines) {
      if (l.anchor.kind === "time" ? l.anchor.at <= nav.time + 0.5 : l.anchor.page === nav.page) hit = l.id;
      if (l.anchor.kind === "time" && l.anchor.at > nav.time) break;
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
  const shown = s ? lines.filter((l) => l.text.toLowerCase().includes(s)) : lines;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search transcript</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={timed ? "Search the transcript" : "Search the text"} className={`${inputCls} !rounded-full !py-2 pl-9`} />
        </label>
        {ids.length > 0 && (
          <p className="font-mono text-[10px] tracking-[0.08em] text-muted uppercase">
            {ids.length} speakers · click a name to rename
          </p>
        )}
      </div>

      <ol ref={listRef} className="relative mt-4 max-h-[62vh] space-y-1 overflow-y-auto pr-1">
        {shown.map((l) => {
          const active = l.id === activeId;
          const tint = SPEAKER_TINTS[Math.max(0, ids.indexOf(l.speaker)) % SPEAKER_TINTS.length]!;
          return (
            <li
              key={l.id}
              data-line={l.id}
              className={`relative rounded-2xl p-3 transition-colors duration-300 ${active ? "bg-red-50" : "hover:bg-paper"}`}
            >
              {active && <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-red-500" aria-hidden />}
              <div className="mb-1 flex flex-wrap items-center gap-2">
                {l.speaker && <SpeakerLabel id={l.speaker} name={speakers[l.speaker] ?? l.speaker} tint={tint} onRename={onRename} />}
                <AnchorChip anchor={l.anchor} />
                {active && <span className="font-mono text-[9px] tracking-[0.12em] text-red-600 uppercase">{timed ? "Now" : "On screen"}</span>}
              </div>
              <p className={`text-[14px] leading-relaxed ${active ? "text-ink" : "text-ink-soft"}`}>{l.text}</p>
            </li>
          );
        })}
        {shown.length === 0 && <li className="py-10 text-center text-sm text-muted">No lines match “{q}”.</li>}
      </ol>
    </div>
  );
}
