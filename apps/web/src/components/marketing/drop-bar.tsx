"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, AudioLines, FileText, Image as ImageIcon, Mic, MonitorPlay, Paperclip, type LucideIcon } from "lucide-react";
import type { SourceIcon } from "@/lib/mock/marketing-use-cases";

const SOURCE_ICONS: Record<SourceIcon, LucideIcon> = {
  mic: Mic,
  monitor: MonitorPlay,
  file: FileText,
  audio: AudioLines,
  image: ImageIcon,
};

function useTypewriter(lines: string[]) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = setTimeout(() => setText(lines[0] ?? ""), 0);
      return () => clearTimeout(id);
    }
    let line = 0;
    let i = 0;
    let deleting = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = lines[line] ?? "";
      if (!deleting) {
        i++;
        setText(full.slice(0, i));
        if (i >= full.length) {
          deleting = true;
          t = setTimeout(tick, 1800);
          return;
        }
        t = setTimeout(tick, 38 + Math.random() * 40);
      } else {
        i--;
        setText(full.slice(0, i));
        if (i <= 0) {
          deleting = false;
          line = (line + 1) % lines.length;
          t = setTimeout(tick, 300);
          return;
        }
        t = setTimeout(tick, 18);
      }
    };
    t = setTimeout(tick, 700);
    return () => clearTimeout(t);
  }, [lines]);
  return text;
}

/** The landing page's drop bar, with per-page placeholder lines and source icon. */
export function DropBar({
  placeholders,
  source,
  sourceLabel,
  href = "/sign-in?next=/app/new",
  cta = "Make notes",
}: {
  placeholders: string[];
  source: SourceIcon;
  sourceLabel: string;
  href?: string;
  cta?: string;
}) {
  const typed = useTypewriter(placeholders);
  const Icon = SOURCE_ICONS[source];

  return (
    <Link
      href={href}
      aria-label={`${cta}: add a ${sourceLabel.toLowerCase()}`}
      className="group flex items-center gap-2 rounded-full border border-line-strong bg-card p-2 pl-5 text-left shadow-[0_18px_40px_-24px_rgba(60,20,10,0.45)] transition-all duration-300 hover:border-red-300 hover:shadow-[0_24px_50px_-24px_rgba(200,35,26,0.45)]"
    >
      <Paperclip className="size-4 shrink-0 text-muted transition-transform duration-300 group-hover:-rotate-12" />
      <span className="caret min-w-0 flex-1 truncate text-[15px] text-muted" aria-hidden>
        {typed}
      </span>
      <span className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs text-ink-soft sm:inline-flex">
        <Icon className="size-3.5 text-red-500" /> {sourceLabel}
      </span>
      <span className="btn btn-red">
        {cta}
        <ArrowUpRight className="btn-arrow size-4" />
      </span>
    </Link>
  );
}
