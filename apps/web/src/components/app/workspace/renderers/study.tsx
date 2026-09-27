"use client";

import { useState } from "react";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import type { Flashcard, OutputData, QuizQuestion } from "@/lib/mock/app-data";
import { FlipCard, RateButtons, type Rating } from "../../flashcard";
import { AnchorChip, ProgressBar } from "../../ui";
import type { SharedState } from "./shared";

function Flashcards({ cards, state }: { cards: Flashcard[]; state: SharedState }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [log, setLog] = useState<Rating[]>([]);
  const card = cards[i % cards.length]!;

  const rate = (r: Rating) => {
    setLog((l) => [...l, r]);
    setFlipped(false);
    setTimeout(() => setI((n) => n + 1), 200);
  };

  const pass = Math.floor(i / cards.length) + 1;

  return (
    <div className="flex flex-col items-center">
      <div className="mb-5 flex w-full max-w-[440px] items-center gap-3">
        <ProgressBar value={((i % cards.length) / cards.length) * 100} className="flex-1" />
        <span className="font-mono text-[10px] text-muted tabular-nums">
          {(i % cards.length) + 1}/{cards.length}
          {pass > 1 && ` · pass ${pass}`}
        </span>
      </div>
      <FlipCard
        key={card.id}
        front={card.front}
        back={card.back}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
        color={state.color}
        meta={
          <>
            <span>{card.topic}</span>
            <span>
              Card {(i % cards.length) + 1} / {cards.length}
            </span>
          </>
        }
        backFooter={<AnchorChip anchor={card.anchor} itemId={state.itemId} />}
      />
      <div className={`mt-5 flex w-full justify-center transition-all duration-300 ${flipped ? "opacity-100" : "pointer-events-none translate-y-1 opacity-40"}`}>
        <RateButtons onRate={rate} disabled={!flipped} />
      </div>
      <p className="mt-4 text-center font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
        {log.length ? `${log.length} rated this session · ${log.filter((r) => r === "good" || r === "easy").length} recalled` : "Flip, then rate how well you remembered"}
      </p>
    </div>
  );
}

function Quiz({ questions, state }: { questions: QuizQuestion[]; state: SharedState }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const q = questions[i];
  const score = answers.filter((a, n) => a === questions[n]!.correct).length;

  if (!q)
    return (
      <div className="rise flex flex-col items-center rounded-[22px] border border-line bg-paper p-8 text-center">
        <p className="eyebrow">Quiz complete</p>
        <p className="mt-3 text-[56px] leading-none tracking-[-0.05em]">
          {score}
          <span className="serif-accent text-[36px] text-muted">/{questions.length}</span>
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          {score === questions.length ? (
            <>
              A <span className="serif-accent text-[17px] text-red-500">clean</span> sweep.
            </>
          ) : (
            "Missed ones are added to your weak topics."
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
          onClick={() => {
            setAnswers(questions.map(() => null));
            setI(0);
          }}
          className="btn btn-ink btn-sm mt-6"
        >
          <RotateCcw className="size-3.5" /> Retake quiz
        </button>
      </div>
    );

  const answer = answers[i] ?? null;
  const reveal = answer !== null;

  return (
    <div key={q.id} className="rise">
      <div className="mb-5 flex items-center gap-3">
        <ProgressBar value={(i / questions.length) * 100} className="flex-1" />
        <span className="font-mono text-[10px] text-muted tabular-nums">
          Q{i + 1}/{questions.length} · score {score}
        </span>
      </div>
      <p className="eyebrow text-[10px]">{q.topic}</p>
      <p className="mt-1.5 text-[18px] font-medium tracking-[-0.02em]">{q.q}</p>
      <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Answers">
        {q.options.map((o, n) => {
          const chosen = answer === n;
          const correct = n === q.correct;
          return (
            <button
              key={o}
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
              <span>
                <span className="mr-3 font-mono text-xs text-muted">{String.fromCharCode(65 + n)}</span>
                {o}
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
          <p className="mt-1 text-ink-soft">{q.explanation}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <AnchorChip anchor={q.anchor} itemId={state.itemId} />
            <button type="button" onClick={() => setI((n) => n + 1)} className="btn btn-ink btn-sm">
              {i + 1 === questions.length ? "See score" : "Next question"}
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
