"use client";

import type { ReactNode } from "react";
import { RotateCw } from "lucide-react";
import type { Rating } from "@a2n/shared";

export type { Rating };

/** The API schedules the next review from the rating; "Again" comes back in 10 minutes. */
export const RATINGS: { value: Rating; label: string; hint: string }[] = [
  { value: "again", label: "Again", hint: "Forgot" },
  { value: "hard", label: "Hard", hint: "Struggled" },
  { value: "good", label: "Good", hint: "Got it" },
  { value: "easy", label: "Easy", hint: "Instantly" },
];

type Props = {
  front: string;
  back: string;
  flipped: boolean;
  onFlip: () => void;
  color: string;
  meta: ReactNode;
  backFooter?: ReactNode;
  size?: "md" | "lg";
};

/** 3D flip card: nt-colour front with serif question, night back with the answer. */
export function FlipCard({ front, back, flipped, onFlip, color, meta, backFooter, size = "md" }: Props) {
  const lg = size === "lg";
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={flipped ? `Answer: ${back}. Press to show question.` : `Question: ${front}. Press to reveal answer.`}
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onFlip();
        }
      }}
      className={`flip-scene group w-full cursor-pointer rounded-[22px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400 ${
        lg ? "h-[340px] max-w-[620px] sm:h-[380px]" : "h-[240px] max-w-[440px]"
      }`}
    >
      <div className="flip-inner" data-flipped={flipped}>
        <div
          className={`flip-face grain flex flex-col justify-between rounded-[22px] text-left shadow-[0_24px_50px_-28px_rgba(60,20,10,0.55)] transition-transform duration-300 group-hover:-translate-y-0.5 ${lg ? "p-7 sm:p-9" : "p-6"}`}
          style={{ background: color }}
        >
          <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.12em] text-ink/60 uppercase">{meta}</div>
          <p className={`serif-accent leading-[1.1] text-ink not-italic text-balance ${lg ? "text-[30px] sm:text-[40px]" : "text-[26px]"}`}>{front}</p>
          <span className="flex items-center gap-1.5 text-xs text-ink/60">
            <RotateCw className="size-3 transition-transform duration-500 group-hover:rotate-180" /> Tap or press space to flip
          </span>
        </div>
        <div className={`flip-face flip-back flex flex-col justify-between overflow-hidden rounded-[22px] bg-night text-left text-night-text shadow-[0_24px_50px_-28px_rgba(20,10,10,0.8)] ${lg ? "p-7 sm:p-9" : "p-6"}`}>
          <div className="dots-night absolute inset-0 opacity-50" aria-hidden />
          <span className="relative font-mono text-[10px] tracking-[0.12em] text-night-muted uppercase">Answer</span>
          <p className={`relative leading-snug text-balance ${lg ? "text-[22px] sm:text-[26px]" : "text-lg"}`}>{back}</p>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {backFooter}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RateButtons({ onRate, disabled, showKeys = false }: { onRate: (r: Rating) => void; disabled?: boolean; showKeys?: boolean }) {
  return (
    <div className="grid w-full max-w-[520px] grid-cols-4 gap-2" role="group" aria-label="Rate your recall">
      {RATINGS.map((r, i) => (
        <button
          key={r.value}
          type="button"
          disabled={disabled}
          onClick={() => onRate(r.value)}
          className={`btn btn-sm flex-col !gap-0 !rounded-2xl !px-2 !py-2 ${r.value === "good" ? "btn-red" : r.value === "again" ? "btn-ghost hover:!border-red-400 hover:!text-red-700" : "btn-ghost"}`}
        >
          <span className="flex items-center gap-1.5">
            {showKeys && <span className={`font-mono text-[9px] opacity-60`}>{i + 1}</span>}
            {r.label}
          </span>
          <span className={`font-mono text-[10px] ${r.value === "good" ? "text-cream/75" : "text-muted"}`}>{r.hint}</span>
        </button>
      ))}
    </div>
  );
}
