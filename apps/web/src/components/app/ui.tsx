"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AudioLines,
  Check,
  FileText,
  Globe,
  Image as ImageIcon,
  Mic,
  Play,
  Presentation,
  Type,
  Video,
  type LucideProps,
} from "lucide-react";
import type { Anchor, SourceKind } from "@/lib/mock/app-data";
import { fmtTime } from "@/lib/mock/app-data";
import { useWorkspaceNav } from "./workspace/context";

/* ───────────── Icons ───────────── */

/** lucide v1 dropped brand icons; a simple play-in-rounded-rect glyph instead. */
export function YoutubeGlyph({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <rect x="2" y="5" width="20" height="14" rx="4.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 9.2v5.6l4.8-2.8L10 9.2Z" fill="currentColor" />
    </svg>
  );
}

const SOURCE_ICONS: Record<Exclude<SourceKind, "youtube">, (p: LucideProps) => ReactNode> = {
  audio: (p) => <AudioLines {...p} />,
  video: (p) => <Video {...p} />,
  recording: (p) => <Mic {...p} />,
  pdf: (p) => <FileText {...p} />,
  slides: (p) => <Presentation {...p} />,
  image: (p) => <ImageIcon {...p} />,
  text: (p) => <Type {...p} />,
  web: (p) => <Globe {...p} />,
};

export function SourceIcon({ kind, className = "size-4" }: { kind: SourceKind; className?: string }) {
  if (kind === "youtube") return <YoutubeGlyph className={className} />;
  const Icon = SOURCE_ICONS[kind];
  return <Icon className={className} strokeWidth={1.8} aria-hidden />;
}

/* ───────────── Anchor chip ───────────── */

export function anchorLabel(a: Anchor): string {
  return a.kind === "time" ? fmtTime(a.at) : `p. ${a.page}`;
}

const chipCls =
  "inline-flex shrink-0 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-[10px] text-red-700 transition-all duration-200 hover:-translate-y-px hover:border-red-400 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400";

/**
 * Red mono chip. Inside a workspace it seeks the player / jumps to the page;
 * elsewhere it links to the item at that anchor.
 */
export function AnchorChip({ anchor, itemId, className = "" }: { anchor: Anchor; itemId?: string; className?: string }) {
  const nav = useWorkspaceNav();
  const label = anchorLabel(anchor);
  const icon = anchor.kind === "time" ? <Play className="size-2.5 fill-current" aria-hidden /> : <FileText className="size-2.5" aria-hidden />;
  if (nav) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          nav.seek(anchor);
        }}
        className={`${chipCls} ${className}`}
        aria-label={anchor.kind === "time" ? `Seek to ${label}` : `Jump to page ${anchor.page}`}
      >
        {icon}
        {label}
      </button>
    );
  }
  const q = anchor.kind === "time" ? `t=${anchor.at}` : `p=${anchor.page}`;
  return (
    <Link href={`/app/i/${itemId ?? "demo-meeting"}?${q}`} className={`${chipCls} ${className}`} aria-label={`Open at ${label}`}>
      {icon}
      {label}
    </Link>
  );
}

/* ───────────── Form bits ───────────── */

export function Toggle({
  checked,
  onChange,
  label,
  size = "md",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const knob = size === "sm" ? "size-4 data-[on=true]:translate-x-4" : "size-5 data-[on=true]:translate-x-5";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 items-center rounded-full border p-[1px] transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 ${dims} ${
        checked ? "border-[#a51d15] bg-[image:var(--button-red)]" : "border-line-strong bg-panel"
      }`}
    >
      <span
        data-on={checked}
        className={`block rounded-full bg-cream shadow-[0_1px_3px_rgba(60,20,10,0.35)] transition-transform duration-300 ease-[var(--ease-spring)] ${knob}`}
      />
    </button>
  );
}

export function TickBox({
  checked,
  onChange,
  label,
  className = "",
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      aria-label={label}
      className={`grid size-5 shrink-0 place-items-center rounded-md border transition-all duration-200 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 ${
        checked ? "tick-pop border-red-500 bg-red-500 text-cream" : "border-line-strong bg-card hover:border-red-400"
      } ${className}`}
    >
      <Check className={`size-3.5 transition-transform duration-300 ease-[var(--ease-spring)] ${checked ? "scale-100" : "scale-0"}`} strokeWidth={3} />
    </button>
  );
}

export const inputCls =
  "w-full rounded-2xl border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-muted/80 transition-[border-color,box-shadow] duration-200 hover:border-line-strong focus:border-red-400 focus:shadow-[0_0_0_4px_var(--red-50)] focus:outline-none";

/* ───────────── Layout bits ───────────── */

export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-[32px] leading-[1.05] font-normal tracking-[-0.04em] text-balance sm:text-[40px]">{title}</h1>
        {sub && <p className="mt-2 max-w-[60ch] text-sm text-ink-soft">{sub}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Yield Theory nested card: panel shell around a card body. */
export function NestedCard({
  title,
  eyebrow,
  aside,
  children,
  tone = "default",
  className = "",
  id,
}: {
  title: string;
  eyebrow?: string;
  aside?: ReactNode;
  children: ReactNode;
  tone?: "default" | "danger";
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`rounded-[30px] border p-2.5 sm:rounded-[38px] sm:p-3 ${
        tone === "danger" ? "border-red-200 bg-red-50/70" : "border-line-strong bg-panel"
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3 px-3 pt-1.5 pb-3 sm:px-4">
        <div>
          {eyebrow && <p className="eyebrow text-[10px]">{eyebrow}</p>}
          <h2 className={`text-[17px] font-medium tracking-[-0.02em] ${tone === "danger" ? "text-red-700" : ""}`}>{title}</h2>
        </div>
        {aside}
      </div>
      <div className="rounded-[22px] bg-card p-4 shadow-[0_1px_2px_rgba(60,20,10,0.06)] sm:rounded-[28px] sm:p-6">{children}</div>
    </section>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-grid min-w-5 place-items-center rounded-md border border-line-strong bg-card px-1.5 py-0.5 font-mono text-[10px] text-ink-soft shadow-[0_1px_0_var(--line-strong)]">
      {children}
    </kbd>
  );
}

export function ProgressBar({ value, className = "", tone = "red" }: { value: number; className?: string; tone?: "red" | "ink" }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-panel ${className}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out)] ${tone === "red" ? "bg-[image:var(--button-red)]" : "bg-ink"}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
