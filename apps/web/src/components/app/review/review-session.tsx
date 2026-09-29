"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowUpRight, Flame, Loader2, RotateCcw } from "lucide-react";
import type { ReviewCard } from "@a2n/shared";
import { Art } from "@/components/ui/art";
import { CountUp } from "@/components/ui/count-up";
import { api, errorMessage } from "@/lib/api";
import { relativeFuture } from "@/lib/format";
import { noteType } from "@/lib/note-types";
import { keys, useDueCards, useInvalidate, useLibrary, useMe } from "@/lib/queries";
import { FlipCard, RATINGS, RateButtons, type Rating } from "../flashcard";
import { AnchorChip, Kbd, ProgressBar } from "../ui";

const RATING_TINT: Record<Rating, string> = {
  again: "bg-red-500",
  hard: "bg-red-300",
  good: "bg-ink-soft",
  easy: "bg-ink",
};

export function ReviewSession() {
  const { data, error, isPending, refetch, isFetching, dataUpdatedAt } = useDueCards();
  if (error && !data)
    return (
      <div className="rise mx-auto flex max-w-[520px] flex-col items-center py-16 text-center">
        <AlertCircle className="size-7 text-red-500" />
        <p className="mt-4 text-sm text-ink-soft">{errorMessage(error)}</p>
        <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn btn-ink btn-sm mt-5">
          {isFetching ? <Loader2 className="spin size-3.5" /> : <RotateCcw className="size-3.5" />} Try again
        </button>
      </div>
    );
  if (isPending)
    return (
      <div className="mx-auto flex max-w-[760px] flex-col items-center" aria-busy="true" aria-label="Loading review">
        <div className="skeleton h-3 w-24 self-start rounded-full" />
        <div className="skeleton mt-3 h-9 w-64 self-start rounded-2xl" />
        <div className="skeleton mt-8 h-[340px] w-full max-w-[620px] rounded-[22px]" />
      </div>
    );
  // A fresh session each time the due list is (re)fetched.
  return <Session key={dataUpdatedAt} cards={data.cards} onRestart={() => refetch()} restarting={isFetching} />;
}

function Session({ cards, onRestart, restarting }: { cards: ReviewCard[]; onRestart: () => void; restarting: boolean }) {
  const invalidate = useInvalidate();
  const { data: me } = useMe();
  const { data: library } = useLibrary();
  const [queue, setQueue] = useState<ReviewCard[]>(cards);
  const [flipped, setFlipped] = useState(false);
  const [log, setLog] = useState<{ id: string; r: Rating; nextDue: number }[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const card = queue[0];
  const total = cards.length;
  const cleared = total - queue.length;

  const rate = useCallback(
    async (r: Rating) => {
      if (!card || !flipped || leaving || saving) return;
      setSaving(true);
      setSaveError(null);
      let nextDue: number;
      try {
        ({ nextDue } = await api.review(card.id, r));
      } catch (e) {
        setSaveError(errorMessage(e));
        setSaving(false);
        return;
      }
      setSaving(false);
      setLog((l) => [...l, { id: card.id, r, nextDue }]);
      setLeaving(true);
      setTimeout(() => {
        setFlipped(false);
        setQueue((q) => {
          const [head, ...rest] = q;
          // "Again" is due in 10 minutes; see it once more before the session ends.
          const next = r === "again" && head ? [...rest, head] : rest;
          if (next.length === 0) void invalidate(keys.me, keys.stats, keys.library);
          return next;
        });
        setLeaving(false);
      }, 260);
    },
    [card, flipped, leaving, saving, invalidate],
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
        void rate(RATINGS[Number(e.key) - 1]!.value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, rate]);

  const recalled = log.filter((l) => l.r === "good" || l.r === "easy").length;
  const nextDue = log.length ? Math.min(...log.map((l) => l.nextDue)) : null;

  if (total === 0) {
    const hasCards = library?.items.some((i) => i.outputs.includes("flashcards") && i.status.state === "ready");
    return (
      <div className="rise mx-auto flex max-w-[620px] flex-col items-center py-6 text-center">
        <Art id="empty-review" className="w-full max-w-[320px]" />
        <p className="eyebrow mt-8">Review</p>
        <h1 className="mt-3 text-[36px] leading-[1.05] tracking-[-0.04em] sm:text-[44px]">
          {hasCards ? (
            <>
              Nothing <span className="serif-accent text-red-500">due</span>.
            </>
          ) : (
            <>
              No cards <span className="serif-accent text-red-500">yet</span>.
            </>
          )}
        </h1>
        <p className="mt-3 max-w-[42ch] text-sm text-ink-soft">
          {hasCards ? "You’re caught up. Cards come back here when they’re due again." : "Flashcards from your notes land here, ready for spaced review."}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link href="/app/new" className="btn btn-red">
            New note <ArrowUpRight className="btn-arrow size-4" />
          </Link>
          {hasCards && (
            <button type="button" onClick={onRestart} disabled={restarting} className="btn btn-ghost">
              {restarting ? <Loader2 className="spin size-4" /> : <RotateCcw className="size-4" />} Check again
            </button>
          )}
        </div>
      </div>
    );
  }

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
              {me ? <CountUp key={me.streak} to={me.streak} /> : "–"} <span className="text-[15px] text-ink-soft">day streak</span>
            </span>
            <span className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">Reviewed today</span>
          </span>
        </div>
        <dl className="mt-6 grid w-full max-w-[420px] grid-cols-3 gap-2">
          {[
            { k: "Reviewed", v: log.length },
            { k: "Recalled", v: `${log.length ? Math.round((recalled / log.length) * 100) : 0}%` },
            { k: "Next due", v: nextDue ? relativeFuture(nextDue) : "–" },
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
          <button type="button" onClick={onRestart} disabled={restarting} className="btn btn-ghost">
            {restarting ? <Loader2 className="spin size-4" /> : <RotateCcw className="size-4" />} Check for more
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
            <Flame className="size-4 text-red-500" /> {me ? `${me.streak} ${me.streak === 1 ? "day" : "days"}` : "–"}
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
          backFooter={card.anchor ? <AnchorChip anchor={card.anchor} itemId={card.itemId} /> : undefined}
        />
      </div>

      <div className="mt-7 flex min-h-[64px] w-full justify-center">
        {flipped ? (
          <div className="rise flex w-full flex-col items-center">
            <RateButtons onRate={(r) => void rate(r)} disabled={saving} showKeys />
            {saving && (
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
                <Loader2 className="spin size-3" /> Saving…
              </p>
            )}
            {saveError && (
              <p className="mt-2 text-[12px] text-red-700" role="alert">
                Couldn’t save that rating: {saveError}
              </p>
            )}
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
        <span>Spaced by your ratings</span>
      </p>
    </div>
  );
}
