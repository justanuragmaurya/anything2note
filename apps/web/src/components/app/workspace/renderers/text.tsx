"use client";

import { Hash } from "lucide-react";
import type { OutputData } from "@/lib/mock/app-data";
import { AnchorChip } from "../../ui";
import type { SharedState } from "./shared";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function TextRenderer({ data, state }: { data: OutputData; state: SharedState }) {
  if (data.type === "notes")
    return (
      <article>
        <nav aria-label="Sections" className="no-scrollbar -mx-1 mb-6 flex gap-1.5 overflow-x-auto px-1">
          {data.sections.map((s) => (
            <a
              key={s.heading}
              href={`#${slug(s.heading)}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-1 text-[12px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              <Hash className="size-3 text-muted" aria-hidden />
              {s.heading.replace(/^\d+\.\s*/, "")}
            </a>
          ))}
        </nav>
        <div className="space-y-7">
          {data.sections.map((s) => (
            <section key={s.heading} id={slug(s.heading)} className="group scroll-mt-24">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-[18px] font-medium tracking-[-0.025em]">{s.heading}</h3>
                <AnchorChip anchor={s.anchor} itemId={state.itemId} />
                <a href={`#${slug(s.heading)}`} className="text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-label={`Link to ${s.heading}`}>
                  <Hash className="size-3.5" />
                </a>
              </div>
              {s.body.map((b) => (
                <p key={b} className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                  {b}
                </p>
              ))}
              {s.bullets && (
                <ul className="mt-3 space-y-1.5 border-l-2 pl-4 text-sm text-ink-soft" style={{ borderColor: state.color }}>
                  {s.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </article>
    );

  if (data.type === "summary")
    return (
      <article>
        <div className="relative overflow-hidden rounded-[22px] p-5 sm:p-6" style={{ background: `color-mix(in oklab, ${state.color} 50%, var(--card))` }}>
          <p className="eyebrow text-[10px] text-ink/60">TL;DR</p>
          <p className="mt-2 text-[19px] leading-[1.45] tracking-[-0.02em] text-ink sm:text-[21px]">{data.tldr}</p>
        </div>
        <p className="eyebrow mt-7 mb-3 text-[10px]">Key points</p>
        <ol className="space-y-2">
          {data.points.map((pt, i) => (
            <li key={pt.text} className="flex items-start gap-3 rounded-2xl border border-line p-3.5 text-sm transition-colors hover:border-line-strong">
              <span className="mt-px font-mono text-[11px] text-red-600">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-ink-soft">{pt.text}</span>
              <AnchorChip anchor={pt.anchor} itemId={state.itemId} />
            </li>
          ))}
        </ol>
      </article>
    );

  if (data.type === "generic")
    return (
      <article>
        {data.intro && <p className="mb-4 text-sm text-muted">{data.intro}</p>}
        <ul className="space-y-2.5">
          {data.blocks.map((b, i) => (
            <li key={`${b.title ?? ""}-${i}`} className="rounded-2xl border border-line p-4 transition-colors hover:border-line-strong">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {b.title && <p className="mb-1 font-medium tracking-[-0.01em]">{b.title}</p>}
                  <p className="text-sm leading-relaxed text-ink-soft">{b.text}</p>
                </div>
                {b.anchor && <AnchorChip anchor={b.anchor} itemId={state.itemId} />}
              </div>
            </li>
          ))}
        </ul>
      </article>
    );

  return null;
}
