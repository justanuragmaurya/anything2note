"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Layers, Loader2, RotateCcw, X } from "lucide-react";
import type { Flashcard, OutputData, QuizAttemptResponse, QuizQuestion } from "@a2n/shared";
import { api, errorMessage } from "@/lib/api";
import { keys, useInvalidate } from "@/lib/queries";
import { FlipCard } from "../../flashcard";
import { AnchorChip, ProgressBar } from "../../ui";
import { Markdown } from "../markdown";
import { fits, type SharedState } from "./shared";

const cardText = (t: string) => <Markdown inline text={t} className="[&_strong]:text-inherit [&_code]:text-ink" />;

/** Flip through this item's cards. Spaced-repetition ratings happen in Review. */
function Flashcards({ cards, state }: { cards: Flashcard[]; state: SharedState }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[i];
  if (!card) return <p className="text-sm text-muted">No flashcards were made from this source.</p>;

  const go = (n: number) => {
    setFlipped(false);
    setI((n + cards.length) % cards.length);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-5 flex w-full max-w-[440px] items-center gap-3">
        <ProgressBar value={((i + 1) / cards.length) * 100} className="flex-1" />
        <span className="font-mono text-[10px] text-muted tabular-nums">
          {i + 1}/{cards.length}
        </span>
      </div>
      <FlipCard
        key={card.id}
        front={card.front}
        back={card.back}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
        color={state.color}
        renderText={cardText}
        meta={
          <>
            <span>{card.topic}</span>
            <span>
              Card {i + 1} / {cards.length}
            </span>
          </>
        }
        backFooter={fits(state, card.anchor) ? <AnchorChip anchor={card.anchor} itemId={state.readOnly ? undefined : state.itemId} /> : undefined}
      />
      <div className="mt-5 flex w-full max-w-[440px] items-center justify-between gap-2">
        <button type="button" onClick={() => go(i - 1)} className="btn btn-ghost btn-sm" aria-label="Previous card">
          <ArrowLeft className="size-3.5" /> Prev
        </button>
        <button type="button" onClick={() => go(i + 1)} className="btn btn-ink btn-sm" aria-label="Next card">
          Next <ArrowRight className="btn-arrow-right size-3.5" />
        </button>
      </div>
      {!state.readOnly && (
      <p className="mt-4 flex items-center gap-2 text-center font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
        {state.flashcardsDue > 0 ? (
          <Link href="/app/review" className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700">
            <Layers className="size-3" /> {state.flashcardsDue} due for spaced review
          </Link>
        ) : (
          "These cards are in your spaced review deck"
        )}
      </p>
      )}
    </div>
  );
}

function Quiz({ questions, state }: { questions: QuizQuestion[]; state: SharedState }) {
  const invalidate = useInvalidate();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [result, setResult] = useState<{ state: "saving" } | { state: "saved"; r: QuizAttemptResponse } | { state: "error"; message: string } | null>(null);
  const q = questions[i];
  const score = answers.filter((a, n) => a === questions[n]!.correct).length;

  if (questions.length === 0) return <p className="text-sm text-muted">No questions were made from this source.</p>;

  const submit = async (final: (number | null)[]) => {
    if (state.readOnly) return;
    setResult({ state: "saving" });
    try {
      const r = await api.quizAttempt({ itemId: state.itemId, output: state.outputKey, answers: final.map((a) => a ?? -1) });
      setResult({ state: "saved", r });
      void invalidate(keys.stats);
    } catch (e) {
      setResult({ state: "error", message: errorMessage(e) });
    }
  };

  if (!q) {
    const shown = result?.state === "saved" ? result.r : { score, total: questions.length };
    return (
      <div className="rise flex flex-col items-center rounded-[22px] border border-line bg-paper p-8 text-center">
        <p className="eyebrow">Quiz complete</p>
        <p className="mt-3 text-[56px] leading-none tracking-[-0.05em]">
          {shown.score}
          <span className="serif-accent text-[36px] text-muted">/{shown.total}</span>
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          {result?.state === "saving" ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="spin size-3.5" /> Saving your attempt…
            </span>
          ) : result?.state === "error" ? (
            <span className="text-red-700">
              Couldn’t save this attempt: {result.message}{" "}
              <button type="button" onClick={() => submit(answers)} className="underline underline-offset-4">
                Try again
              </button>
            </span>
          ) : state.readOnly ? (
            shown.score === shown.total ? "A clean sweep." : "Nothing is saved on a shared page."
          ) : shown.score === shown.total ? (
            <>
              A <span className="serif-accent text-[17px] text-red-500">clean</span> sweep.
            </>
          ) : (
            "Saved. Topics you keep missing show up in Stats."
          )}
        </p>
        <ul className="mt-5 flex flex-wrap justify-center gap-1.5">
          {questions.map((qq, n) => {
            const ok = answers[n] === qq.correct;
            return (
              <li key={qq.id} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] ${ok ? "bg-green-700/10 text-green-800" : "bg-red-50 text-red-700"}`}>
                {ok ? <Check className="size-3" /> : <X className="size-3" />}
                {qq.topic}
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          disabled={result?.state === "saving"}
          onClick={() => {
            setAnswers(questions.map(() => null));
            setResult(null);
            setI(0);
          }}
          className="btn btn-ink btn-sm mt-6"
        >
          <RotateCcw className="size-3.5" /> Retake quiz
        </button>
      </div>
    );
  }

  const answer = answers[i] ?? null;
  const reveal = answer !== null;
  const last = i + 1 === questions.length;

  return (
    <div key={q.id} className="rise">
      <div className="mb-5 flex items-center gap-3">
        <ProgressBar value={(i / questions.length) * 100} className="flex-1" />
        <span className="font-mono text-[10px] text-muted tabular-nums">
          Q{i + 1}/{questions.length} · score {score}
        </span>
      </div>
      <p className="eyebrow text-[10px]">{q.topic}</p>
      <Markdown text={q.q} className="mt-1.5 text-[18px] font-medium tracking-[-0.02em]" />
      <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Answers">
        {q.options.map((o, n) => {
          const chosen = answer === n;
          const correct = n === q.correct;
          return (
            <button
              key={`${n}-${o}`}
              type="button"
              role="radio"
              aria-checked={chosen}
              disabled={reveal}
              onClick={() => setAnswers((a) => a.map((v, k) => (k === i ? n : v)))}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-all duration-200 focus-visible:outline-2 focus-visible:outline-red-400 disabled:cursor-default ${
                reveal && correct
                  ? "border-green-700/40 bg-green-700/10"
                  : reveal && chosen
                    ? "animate-[wiggle_0.3s] border-red-400 bg-red-50"
                    : reveal
                      ? "border-line opacity-60"
                      : "border-line bg-card hover:-translate-y-px hover:border-line-strong"
              }`}
            >
              <span className="flex min-w-0 items-baseline">
                <span className="mr-3 shrink-0 font-mono text-xs text-muted">{String.fromCharCode(65 + n)}</span>
                <Markdown inline text={o} />
              </span>
              {reveal && correct && <Check className="size-4 text-green-700" />}
              {reveal && chosen && !correct && <X className="size-4 text-red-600" />}
            </button>
          );
        })}
      </div>
      {reveal && (
        <div className="rise mt-4 rounded-2xl bg-panel p-4 text-sm">
          <p className={`font-medium ${answer === q.correct ? "text-green-800" : "text-red-700"}`}>{answer === q.correct ? "Correct." : "Not quite."}</p>
          {q.explanation && <Markdown text={q.explanation} className="mt-1 text-ink-soft" />}
          <div className="mt-3 flex items-center justify-between gap-3">
            {fits(state, q.anchor) ? <AnchorChip anchor={q.anchor} itemId={state.readOnly ? undefined : state.itemId} /> : <span />}
            <button
              type="button"
              onClick={() => {
                setI((n) => n + 1);
                if (last) void submit(answers);
              }}
              className="btn btn-ink btn-sm"
            >
              {last ? "See score" : "Next question"}
              <ArrowRight className="btn-arrow-right size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StudyRenderer({ data, state }: { data: OutputData; state: SharedState }) {
  if (data.type === "flashcards") return <Flashcards cards={data.cards} state={state} />;
  if (data.type === "quiz") return <Quiz questions={data.questions} state={state} />;
  return null;
}
