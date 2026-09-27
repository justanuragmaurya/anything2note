"use client";

import { useState } from "react";
import {
  AudioLines,
  FileText,
  Globe,
  Image as ImageIcon,
  Mic,
  Presentation,
  Type,
  Video,
  MonitorPlay,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { NOTE_TYPES, OUTPUT_LABELS, type NoteTypeKey } from "@/lib/mock/note-types";

type Source = { label: string; icon: LucideIcon; suggests: NoteTypeKey };

const SOURCES: Source[] = [
  { label: "YouTube link", icon: MonitorPlay, suggests: "lecture" },
  { label: "Audio file", icon: AudioLines, suggests: "meeting" },
  { label: "Video file", icon: Video, suggests: "podcast" },
  { label: "Live recording", icon: Mic, suggests: "meeting" },
  { label: "PDF", icon: FileText, suggests: "reading" },
  { label: "Slides & docs", icon: Presentation, suggests: "lecture" },
  { label: "Photo / whiteboard", icon: ImageIcon, suggests: "general" },
  { label: "Web article", icon: Globe, suggests: "reading" },
  { label: "Pasted text", icon: Type, suggests: "general" },
];

const W = 1000;
const H = 470;
const CX = 500;
const CY = H / 2;
const OUT_N = 5;
const srcY = (i: number) => 28 + (i * (H - 56)) / (SOURCES.length - 1);
const outY = (i: number) => 60 + (i * (H - 120)) / (OUT_N - 1);

/**
 * "We connect the dots" diagram (Yield Theory) — hover a source to see which
 * note type it suggests and the outputs that come out the other side.
 */
export function SourcesFlow() {
  const [active, setActive] = useState(0);
  const source = SOURCES[active]!;
  const nt = NOTE_TYPES.find((n) => n.key === source.suggests)!;
  const outputs = nt.defaults.slice(0, OUT_N);

  return (
    <div className="relative mx-auto w-full max-w-[1000px]">
      {/* Desktop diagram */}
      <div className="relative hidden md:block" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden>
          {SOURCES.map((_, i) => {
            const y = srcY(i);
            const on = i === active;
            return (
              <path
                key={`s${i}`}
                d={`M 200 ${y} C 340 ${y}, 360 ${CY}, ${CX - 60} ${CY}`}
                fill="none"
                stroke={on ? "var(--red-500)" : "var(--line-strong)"}
                strokeWidth={on ? 1.6 : 1}
                strokeDasharray={on ? "6 6" : undefined}
                style={on ? { animation: "dash-flow 0.8s linear infinite" } : undefined}
                className="transition-[stroke] duration-300"
              />
            );
          })}
          {outputs.map((_, i) => {
            const y = outY(i);
            return (
              <path
                key={`o${active}-${i}`}
                d={`M ${CX + 60} ${CY} C 640 ${CY}, 660 ${y}, 800 ${y}`}
                fill="none"
                stroke="var(--red-500)"
                strokeWidth={1.4}
                strokeDasharray="6 6"
                style={{ animation: "dash-flow 0.8s linear infinite" }}
              />
            );
          })}
          <circle cx={CX - 60} cy={CY} r={3} fill="var(--red-500)" />
          <circle cx={CX + 60} cy={CY} r={3} fill="var(--red-500)" />
        </svg>

        {/* Sources */}
        {SOURCES.map((s, i) => {
          const on = i === active;
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className={`absolute left-0 flex w-[200px] -translate-y-1/2 items-center gap-2.5 rounded-full border px-3.5 py-2 text-left text-[13px] transition-all duration-300 ${
                on
                  ? "border-red-400 bg-card text-ink shadow-[0_8px_24px_-12px_rgba(200,35,26,0.5)]"
                  : "border-line bg-card/60 text-ink-soft hover:border-line-strong"
              }`}
              style={{ top: `${(srcY(i) / H) * 100}%` }}
            >
              <Icon className={`size-4 ${on ? "text-red-500" : "text-muted"}`} strokeWidth={1.6} />
              {s.label}
            </button>
          );
        })}

        {/* Centre node */}
        <div
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-center"
          style={{ left: "50%", top: "50%" }}
        >
          <div className="grid size-[88px] place-items-center rounded-[28px] border border-line bg-card shadow-[0_18px_40px_-20px_rgba(60,20,10,0.45)]">
            <LogoMark className="size-11" />
          </div>
          <span
            key={nt.key}
            className="rise rounded-full px-3 py-1 text-xs font-medium text-ink"
            style={{ background: nt.color }}
          >
            {nt.label}
          </span>
          <span className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">auto-detected</span>
        </div>

        {/* Outputs */}
        {outputs.map((o, i) => (
          <div
            key={`${active}-${o}`}
            className="rise absolute right-0 w-[200px] -translate-y-1/2 rounded-xl border border-line bg-card px-4 py-3 shadow-[0_1px_8px_rgba(60,20,10,0.04)]"
            style={{ top: `${(outY(i) / H) * 100}%`, animationDelay: `${i * 70}ms` }}
          >
            <p className="text-[13px] font-medium text-ink">{OUTPUT_LABELS[o]}</p>
            <p className="mt-0.5 font-mono text-[10px] tracking-wide text-muted uppercase">
              {i === 0 ? "ready first" : "anchored · editable"}
            </p>
          </div>
        ))}
      </div>

      {/* Mobile: simple stacked version */}
      <div className="md:hidden">
        <div className="flex flex-wrap justify-center gap-2">
          {SOURCES.map((s, i) => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => setActive(i)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                  i === active ? "border-red-400 bg-card text-ink" : "border-line text-ink-soft"
                }`}
              >
                <Icon className="size-3.5" strokeWidth={1.6} />
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="mt-6 rounded-3xl border border-line bg-card p-5">
          <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: nt.color }}>
            {nt.label}
          </span>
          <ul className="mt-4 flex flex-col gap-2">
            {outputs.map((o) => (
              <li key={o} className="flex items-center gap-2 text-sm">
                <span className="size-1.5 rounded-full bg-red-500" />
                {OUTPUT_LABELS[o]}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
