"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { CornerFrame } from "@/components/ui/corner-frame";
import { AnchorChip } from "./anchor-chip";

const SLIDES = ["Class notes", "Flashcard", "Tasks"] as const;
const INTERVAL = 3600;

function NotesSlide() {
  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.12em] text-night-muted uppercase">
        <span>ECON 102 · Lecture 14</span>
        <span>55 min</span>
        <span>Recorded in class</span>
      </div>
      <ol className="mt-5 space-y-3">
        {[
          { t: "What elasticity measures", b: "% change in quantity demanded ÷ % change in price.", at: 110 },
          { t: "The midpoint method", b: "₹40 → ₹60, 100 → 60 cups: PED = −1.25, so elastic.", at: 760 },
          { t: "Elasticity and revenue", b: "Elastic demand: a price cut raises total revenue.", at: 2112 },
        ].map((m, i) => (
          <li key={m.t} className="rounded-xl border border-night-line bg-night-2 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[14px] font-medium">
                <span className="mr-2 text-night-muted">{i + 1}.</span>
                {m.t}
              </p>
              <AnchorChip anchor={{ kind: "time", at: m.at }} tone="night" />
            </div>
            <p className="mt-1 text-[13px] text-night-muted">{m.b}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FlashcardSlide() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grain flex min-h-[170px] flex-col justify-between rounded-2xl bg-nt-lecture p-5 text-ink">
        <span className="font-mono text-[10px] tracking-[0.12em] text-ink/60 uppercase">Card 7 / 42 · Enzyme kinetics</span>
        <p className="serif-accent text-[26px] leading-tight not-italic">What does a low Km tell you about an enzyme?</p>
      </div>
      <div className="rounded-2xl border border-night-line bg-night-2 p-4">
        <p className="font-mono text-[10px] tracking-[0.12em] text-night-muted uppercase">Answer</p>
        <p className="mt-1.5 text-[14px]">High affinity: it reaches half of Vmax at a low substrate concentration.</p>
        <div className="mt-3 flex items-center justify-between">
          <AnchorChip anchor={{ kind: "time", at: 1004 }} tone="night" />
          <span className="font-mono text-[10px] text-night-muted">Next review · in 4 days</span>
        </div>
      </div>
    </div>
  );
}

function TasksSlide() {
  const [ticked, setTicked] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTicked(true), 1100);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="space-y-2.5">
      {[
        { task: "Read Mankiw ch. 5, sections 5.1–5.2", kind: "Reading", due: "Tue, 29 Sep", at: 3182, live: true },
        { task: "Problem set 5: elasticity questions 1–8", kind: "Homework", due: "Fri, 2 Oct", at: 3130, live: false },
        { task: "Pick a market for the group presentation", kind: "Project", due: "Not mentioned", at: 3260, live: false },
      ].map((a) => {
        const done = a.live && ticked;
        return (
          <div key={a.task} className="flex items-start gap-3 rounded-xl border border-night-line bg-night-2 p-4">
            <span
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-all duration-300 ${
                done ? "border-red-500 bg-red-500 text-cream" : "border-night-muted/50"
              }`}
            >
              <Check className={`size-3.5 transition-transform duration-300 ease-[var(--ease-spring)] ${done ? "scale-100" : "scale-0"}`} strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <p className={`text-[14px] transition-colors duration-300 ${done ? "text-night-muted line-through" : ""}`}>{a.task}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-night-muted">
                <span className="rounded-full bg-nt-lecture/20 px-2 py-0.5 text-[11px] text-nt-lecture">{a.kind}</span>
                <span className={a.due === "Not mentioned" ? "italic" : ""}>Due · {a.due}</span>
                <AnchorChip anchor={{ kind: "time", at: a.at }} tone="night" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Night panel beside the sign-in form: cycles sample outputs in a corner frame. */
export function SignInShowcase() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setI((v) => (v + 1) % SLIDES.length), INTERVAL);
    return () => clearTimeout(t);
  }, [i, paused]);

  return (
    <div className="dots-night relative flex h-full min-h-dvh flex-col justify-center overflow-hidden px-10 py-16 text-night-text xl:px-20">
      <div aria-hidden className="dashed-rail absolute inset-y-0 left-10 w-px xl:left-14" />
      <div aria-hidden className="dashed-rail absolute inset-y-0 right-10 w-px xl:right-14" />
      <div aria-hidden className="absolute -bottom-48 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#e5372b40_0%,transparent_65%)] blur-2xl" />

      <div className="relative mx-auto w-full max-w-[460px]">
        <p className="eyebrow rise !text-night-muted">What comes back</p>
        <h2 className="rise mt-4 text-[40px] leading-[1.05] tracking-[-0.04em]" style={{ animationDelay: "100ms" }}>
          One upload. <span className="serif-accent text-red-400">Every note</span> you&apos;d have taken.
        </h2>

        <div
          className="rise mt-10"
          style={{ animationDelay: "220ms" }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <CornerFrame className="bg-night/85 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-night-line px-5 py-3">
              <span className="font-mono text-[10px] tracking-[0.14em] text-night-muted uppercase">Sample output</span>
              <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 font-mono text-[10px] tracking-[0.1em] text-red-300 uppercase">
                {SLIDES[i]}
              </span>
            </div>
            <div className="min-h-[330px] p-5" aria-live="off">
              <div key={i} className="rise">
                {i === 0 && <NotesSlide />}
                {i === 1 && <FlashcardSlide />}
                {i === 2 && <TasksSlide />}
              </div>
            </div>
          </CornerFrame>

          <div className="mt-5 flex gap-2" role="group" aria-label="Choose a sample output">
            {SLIDES.map((s, k) => (
              <button
                key={s}
                type="button"
                aria-pressed={k === i}
                onClick={() => setI(k)}
                className="group flex-1 text-left"
              >
                <span className="block h-[3px] overflow-hidden rounded-full bg-night-3">
                  <span
                    key={`${i}-${k}-${paused}`}
                    className={`block h-full rounded-full bg-red-500 ${
                      k < i ? "w-full" : k === i ? (paused ? "w-full opacity-60" : "w-0 animate-[grow_3.6s_linear_forwards]") : "w-0"
                    }`}
                  />
                </span>
                <span className={`mt-2 block font-mono text-[10px] tracking-[0.12em] uppercase transition-colors ${k === i ? "text-night-text" : "text-night-muted group-hover:text-night-text"}`}>
                  {s}
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="rise mt-10 text-[14px] leading-relaxed text-night-muted" style={{ animationDelay: "320ms" }}>
          Detailed notes, flashcards, quizzes and every deadline mentioned, from class recordings, PDFs, links and photos. Every line links back to
          where it came from.
        </p>
      </div>
    </div>
  );
}
