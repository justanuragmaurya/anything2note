"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Flame, RotateCcw } from "lucide-react";
import { Art } from "@/components/ui/art";
import { CountUp } from "@/components/ui/count-up";
import { DUE_CARDS, USER, type ReviewCard } from "@/lib/mock/app-data";
import { noteType } from "@/lib/mock/note-types";
import { FlipCard, RATINGS, RateButtons, type Rating } from "../flashcard";
import { AnchorChip, Kbd, ProgressBar } from "../ui";

const RATING_TINT: Record<Rating, string> = {
  again: "bg-red-500",
  hard: "bg-red-300",
  good: "bg-ink-soft",
  easy: "bg-ink",
};

export function ReviewSession() {
  const [queue, setQueue] = useState<ReviewCard[]>(DUE_CARDS);
  const [flipped, setFlipped] = useState(false);
  const [log, setLog] = useState<{ id: string; r: Rating }[]>([]);
  const [leaving, setLeaving] = useState(false);

  const card = queue[0];
  const total = DUE_CARDS.length;
  const cleared = total - queue.length;

  const rate = useCallback(
    (r: Rating) => {
      if (!card || !flipped || leaving) return;
      setLog((l) => [...l, { id: card.id, r }]);
      setLeaving(true);
      setTimeout(() => {
        setFlipped(false);
        setQueue((q) => {
          const [head, ...rest] = q;
          return r === "again" && head ? [...rest, head] : rest;
        });
        setLeaving(false);
      }, 260);
    },
    [card, flipped, leaving],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " ") {
        e.preventDefault();
        if (card) setFlipped((f) => !f);
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        rate(RATINGS[Number(e.key) - 1]!.value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, rate]);

  const restart = () => {
    setQueue(DUE_CARDS);
    setLog([]);
    setFlipped(false);
  };

  const recalled = log.filter((l) => l.r === "good" || l.r === "easy").length;

  if (!card) {
    return (
      <div className="rise mx-auto flex max-w-[620px] flex-col items-center py-6 text-center">
        <Art id="empty-review" className="w-full max-w-[320px]" />
        <p className="eyebrow mt-8">Session complete</p>
        <h1 className="mt-3 text-[36px] leading-[1.05] tracking-[-0.04em] sm:text-[44px]">
          All caught <span className="serif-accent text-red-500">up</span>.
        </h1>
        <div className="mt-7 flex items-center gap-3 rounded-full border border-line bg-card py-2 pr-5 pl-2">
          <span className="grid size-10 place-items-center rounded-full bg-[image:var(--button-red)] text-cream shadow-[var(--button-shadow)]">
            <Flame className="size-5" />
          </span>
          <span className="text-left">
            <span className="block text-[26px] leading-none tracking-[-0.03em]">
              <CountUp to={USER.streak + 1} /> <span className="text-[15px] text-ink-soft">day streak</span>
            </span>
            <span className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">+1 today · personal best 21</span>
          </span>
        </div>
        <dl className="mt-6 grid w-full max-w-[420px] grid-cols-3 gap-2">
          {[
            { k: "Reviewed", v: log.length },
            { k: "Recalled", v: `${log.length ? Math.round((recalled / log.length) * 100) : 0}%` },
            { k: "Next due", v: "Tomorrow" },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl border border-line bg-card px-3 py-3">
              <dt className="eyebrow text-[9px]">{s.k}</dt>
              <dd className="mt-1 text-[18px] tracking-[-0.02em]">{s.v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link href="/app" className="btn btn-red">
            Back to library <ArrowUpRight className="btn-arrow size-4" />
          </Link>
          <button type="button" onClick={restart} className="btn btn-ghost">
            <RotateCcw className="size-4" /> Review again
          </button>
        </div>
      </div>
    );
  }

  const nt = noteType(card.noteType);

  return (
    <div className="mx-auto flex max-w-[760px] flex-col items-center">
      <div className="rise w-full">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Review · {queue.length} left</p>
            <h1 className="mt-2 text-[30px] leading-[1.05] tracking-[-0.04em] sm:text-[36px]">
              Today’s <span className="serif-accent text-red-500">review</span>.
            </h1>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[13px]">
            <Flame className="size-4 text-red-500" /> {USER.streak} days
          </span>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <ProgressBar value={(cleared / total) * 100} className="h-2 flex-1" />
          <span className="font-mono text-[11px] text-muted tabular-nums">
            {cleared}/{total}
          </span>
        </div>
        <div className="mt-2 flex h-1.5 gap-0.5" aria-hidden>
          {log.map((l, i) => (
            <span key={i} className={`tick-pop h-full w-3 rounded-full ${RATING_TINT[l.r]}`} />
          ))}
        </div>
      </div>

      <div
        className={`mt-6 flex w-full justify-center transition-all duration-300 ease-[var(--ease-out)] ${leaving ? "translate-x-8 opacity-0 blur-[2px]" : "translate-x-0 opacity-100"}`}
      >
        <FlipCard
          key={`${card.id}-${log.length}`}
          size="lg"
          front={card.front}
          back={card.back}
          flipped={flipped}
          onFlip={() => setFlipped((f) => !f)}
          color={nt.color}
          meta={
            <>
              <span className="truncate">{card.itemTitle}</span>
              <span className="shrink-0">{card.topic}</span>
            </>
          }
          backFooter={<AnchorChip anchor={card.anchor} itemId={card.itemId} />}
        />
      </div>

      <div className="mt-7 flex min-h-[64px] w-full justify-center">
        {flipped ? (
          <div className="rise flex w-full justify-center">
            <RateButtons onRate={rate} showKeys />
          </div>
        ) : (
          <button type="button" onClick={() => setFlipped(true)} className="btn btn-ink btn-lg">
            Show answer <Kbd>space</Kbd>
          </button>
        )}
      </div>

      <p className="mt-6 hidden items-center gap-3 font-mono text-[10px] tracking-[0.08em] text-muted uppercase sm:flex">
        <span className="flex items-center gap-1.5">
          <Kbd>space</Kbd> flip
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>1</Kbd>–<Kbd>4</Kbd> rate
        </span>
        <span>Intervals from FSRS</span>
      </p>
    </div>
  );
}
