"use client";

import { useState } from "react";
import type { Anchor } from "@/lib/mock/marketing-samples";
import { AnchorChip } from "./anchor-chip";

/** Compact 3D flip flashcard (same construction as the workspace preview). */
export function FlipCard({
  q,
  a,
  anchor,
  index,
  total,
  color = "var(--nt-lecture)",
}: {
  q: string;
  a: string;
  anchor?: Anchor;
  index: number;
  total: number;
  color?: string;
}) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
      aria-label={flipped ? `Answer: ${a}. Press to show the question.` : `Question: ${q}. Press to reveal the answer.`}
      className="group relative h-[190px] w-full cursor-pointer text-left [perspective:1200px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400"
    >
      <span
        className={`relative block size-full transition-transform duration-700 ease-[var(--ease-spring)] [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : "group-hover:[transform:rotateY(-6deg)]"
        }`}
      >
        <span
          className="grain absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl p-5 shadow-[0_1px_2px_rgba(60,20,10,0.12)] [backface-visibility:hidden]"
          style={{ background: color }}
        >
          <span className="font-mono text-[10px] tracking-[0.12em] text-ink/60 uppercase">
            Card {index + 1} / {total}
          </span>
          <span className="serif-accent text-[21px] leading-[1.15] text-ink not-italic">{q}</span>
          <span className="text-[11px] text-ink/60">Tap to flip</span>
        </span>
        <span className="absolute inset-0 flex flex-col justify-between rounded-2xl bg-night p-5 text-night-text shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="font-mono text-[10px] tracking-[0.12em] text-night-muted uppercase">Answer</span>
          <span className="text-[15px] leading-snug">{a}</span>
          {anchor ? (
            <span>
              <AnchorChip anchor={anchor} tone="night" />
            </span>
          ) : (
            <span />
          )}
        </span>
      </span>
    </button>
  );
}
