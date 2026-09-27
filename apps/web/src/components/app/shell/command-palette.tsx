"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CornerDownLeft, Plus, Search } from "lucide-react";
import { LIBRARY } from "@/lib/mock/app-data";
import { noteType } from "@/lib/mock/note-types";
import { Kbd, SourceIcon } from "../ui";
import { NAV } from "./nav-items";

type Entry = { id: string; group: string; label: string; hint?: string; href: string; icon: ReactNode };

const ENTRIES: Entry[] = [
  { id: "new", group: "Actions", label: "New note", hint: "Add a source", href: "/app/new", icon: <Plus className="size-4" /> },
  ...NAV.map((n) => ({ id: n.href, group: "Go to", label: n.label, href: n.href, icon: <n.icon className="size-4" strokeWidth={1.8} /> })),
  ...LIBRARY.filter((i) => i.status.state === "ready").map((i) => ({
    id: i.id,
    group: "Notes",
    label: i.title,
    hint: noteType(i.noteType).label,
    href: `/app/i/${i.id}`,
    icon: <SourceIcon kind={i.source} />,
  })),
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? ENTRIES.filter((e) => `${e.label} ${e.hint ?? ""}`.toLowerCase().includes(s)) : ENTRIES;
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const go = (e: Entry | undefined) => {
    if (!e) return;
    onClose();
    setQ("");
    setIdx(0);
    router.push(e.href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <button type="button" aria-label="Close search" onClick={onClose} className="palette-fade absolute inset-0 cursor-default bg-ink/25 backdrop-blur-[3px]" />
      <div
        className="palette-pop relative w-full max-w-[560px] overflow-hidden rounded-[26px] border border-line-strong bg-card shadow-[0_40px_80px_-30px_rgba(60,20,10,0.55)]"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          else if (e.key === "ArrowDown") {
            e.preventDefault();
            setIdx((i) => Math.min(results.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIdx((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(results[idx]);
          }
        }}
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Search className="size-4 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            placeholder="Search notes, pages, actions…"
            aria-label="Search"
            className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-muted focus:outline-none"
          />
          <Kbd>esc</Kbd>
        </div>
        <ul className="max-h-[52vh] overflow-y-auto p-2" role="listbox" aria-label="Results">
          {results.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">Nothing matches “{q}”.</li>}
          {results.map((e, i) => {
            const header = i === 0 || results[i - 1]!.group !== e.group ? e.group : null;
            const active = i === idx;
            return (
              <li key={e.id} role="option" aria-selected={active}>
                {header && <p className="eyebrow px-3 pt-3 pb-1.5 text-[10px]">{header}</p>}
                <button
                  type="button"
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => go(e)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-panel text-ink" : "text-ink-soft"}`}
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-xl border ${active ? "border-red-200 bg-red-50 text-red-600" : "border-line bg-paper"}`}>{e.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{e.label}</span>
                  {e.hint && <span className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">{e.hint}</span>}
                  {active && <CornerDownLeft className="size-3.5 text-muted" />}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-4 border-t border-line bg-paper/60 px-5 py-2.5 font-mono text-[10px] text-muted">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> move
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd> open
          </span>
        </div>
      </div>
    </div>
  );
}
