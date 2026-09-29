"use client";

import { useEffect, useState } from "react";
import { Check, Pause, Play, RotateCcw, Sparkles, ArrowRight } from "lucide-react";
import { SlidingTabs } from "@/components/ui/sliding-tabs";

type Mode = "class" | "youtube";
const DURATION = 52 * 60 + 18;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function Stamp({ at, onSeek }: { at: number; onSeek: (s: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSeek(at)}
      className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-[10px] text-red-700 transition-all duration-200 hover:-translate-y-px hover:border-red-400 hover:bg-red-100"
    >
      <Play className="size-2.5 fill-current" />
      {fmt(at)}
    </button>
  );
}

type TaskKind = "homework" | "reading" | "exam" | "project";
const KIND_LABEL: Record<TaskKind, string> = { homework: "Homework", reading: "Reading", exam: "Exam", project: "Project" };

const TASKS: { task: string; kind: TaskKind; due: string; at: number }[] = [
  { task: "Read Clayden ch. 15, pp. 328–345", kind: "reading", due: "Tue, 29 Sep", at: 2968 },
  { task: "Problem set 6: SN1/SN2 mechanisms, Q1–12", kind: "homework", due: "Fri, 2 Oct", at: 3004 },
  { task: "Midterm 2: substitution and elimination", kind: "exam", due: "Wed, 14 Oct", at: 3046 },
  { task: "Pick a molecule for the group mechanism poster", kind: "project", due: "Not mentioned", at: 3080 },
];

const REVISION = [
  { d: "SN2: one step, backside attack, inversion of configuration.", at: 560 },
  { d: "SN1: carbocation first, racemic product, rate depends on substrate only.", at: 1350 },
  { d: "Tertiary + weak nucleophile → SN1. Methyl or primary + strong nucleophile → SN2.", at: 2150 },
];

const CARDS = [
  { q: "What does the chain rule let you differentiate?", a: "Compositions of functions: (f∘g)′(x) = f′(g(x)) · g′(x).", at: 740 },
  { q: "Derivative of sin(x²)?", a: "2x · cos(x²) — outer derivative times inner derivative.", at: 1022 },
  { q: "When is a function differentiable at a point?", a: "When the limit of the difference quotient exists there.", at: 305 },
];

const NOTES: Record<Mode, { h: string; at: number; b: string }[]> = {
  class: [
    { h: "1. Two ways to substitute", at: 95, b: "Nucleophilic substitution swaps a leaving group for a nucleophile. SN2 does it in one step; SN1 forms a carbocation first." },
    { h: "2. SN2: one concerted step", at: 540, b: "Backside attack, so the stereocentre inverts. Rate = k[substrate][Nu⁻]. Fastest at methyl and primary carbons." },
    { h: "3. SN1: carbocation first", at: 1320, b: "The leaving group goes, then the nucleophile hits a flat carbocation from either face: a racemic mix. Rate = k[substrate]." },
  ],
  youtube: [
    { h: "1. Limits, revisited", at: 60, b: "Differentiability needs the difference-quotient limit to exist — continuity alone isn't enough (|x| at 0)." },
    { h: "2. The chain rule", at: 700, b: "For y = f(g(x)), dy/dx = f′(g(x))·g′(x). Think: outside derivative, keep inside, times inside derivative." },
    { h: "3. Worked examples", at: 1010, b: "sin(x²), e³ˣ, √(1+x²). Common mistake: forgetting the inner derivative." },
  ],
};

const CHAT = {
  class: {
    q: "Which mechanism for tert-butyl bromide in water?",
    a: "SN1. It's a tertiary carbon and water is a weak nucleophile and a polar protic solvent, so the carbocation forms first. The lecturer covers this case right after the rate laws.",
    at: 2150,
  },
  youtube: {
    q: "Explain the chain rule like I'm new to this",
    a: "Differentiate the outer function, leave the inside alone, then multiply by the derivative of the inside. For sin(x²): cos(x²) × 2x.",
    at: 700,
  },
};

type TabKey = "notes" | "tasks" | "revision" | "cards" | "quiz" | "chat";
const TABS: Record<Mode, { value: TabKey; label: string }[]> = {
  class: [
    { value: "notes", label: "Notes" },
    { value: "tasks", label: "Tasks & deadlines" },
    { value: "revision", label: "Revision" },
    { value: "chat", label: "Chat" },
  ],
  youtube: [
    { value: "notes", label: "Notes" },
    { value: "cards", label: "Flashcards" },
    { value: "quiz", label: "Quiz" },
    { value: "chat", label: "Chat" },
  ],
};

/** Streams `text` in like an assistant reply, then reveals `children`. */
function TypedAnswer({ text, children }: { text: string; children: React.ReactNode }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id);
          return v;
        }
        return v + 2;
      });
    }, 22);
    return () => clearInterval(id);
  }, [text]);
  const done = n >= text.length;
  return (
    <>
      <span className={done ? "" : "caret"}>{text.slice(0, n)}</span>
      {done && <div className="rise mt-2">{children}</div>}
    </>
  );
}

export function WorkspacePreview() {
  const [mode, setMode] = useState<Mode>("class");
  const [tab, setTab] = useState<TabKey>("notes");
  const [time, setTime] = useState(95);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState<Record<number, boolean>>({ 0: true });
  const [card, setCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setTime((t) => (t + 1) % DURATION), 250);
    return () => clearInterval(id);
  }, [playing]);

  const chat = CHAT[mode];

  const switchMode = (m: Mode) => {
    setMode(m);
    setTab(TABS[m][0]!.value);
    setTime(m === "class" ? 95 : 60);
  };
  const seek = (s: number) => {
    setTime(s);
    setPlaying(true);
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-line bg-card shadow-[0_40px_80px_-40px_rgba(60,20,10,0.45)]">
      {/* window chrome */}
      <div className="flex items-center justify-between gap-4 border-b border-line bg-paper/60 px-5 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
        </div>
        <SlidingTabs
          size="sm"
          tone="ink"
          value={mode}
          onChange={switchMode}
          ariaLabel="Sample source"
          items={[
            { value: "class", label: "Class recording" },
            { value: "youtube", label: "YouTube lecture" },
          ]}
        />
        <span className="hidden font-mono text-[10px] tracking-[0.12em] text-muted uppercase sm:block">
          {mode === "class" ? "chem-204-lecture-12.m4a" : "youtube · calculus 07"}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[1fr_1.25fr]">
        {/* Player + transcript */}
        <div className="border-b border-line p-5 md:border-r md:border-b-0">
          <div className="relative grid aspect-video place-items-center overflow-hidden rounded-2xl bg-night">
            <div className="dots-night absolute inset-0 opacity-70" />
            <div aria-hidden className="absolute inset-x-6 bottom-10 flex h-16 items-end gap-[3px]">
              {Array.from({ length: 48 }).map((_, i) => {
                const pos = i / 48;
                const played = pos <= time / DURATION;
                return (
                  <span
                    key={i}
                    className={`flex-1 rounded-full transition-colors duration-200 ${played ? "bg-red-400" : "bg-night-text/20"}`}
                    style={{ height: `${Math.round(18 + Math.abs(Math.sin(i * 1.3 + (mode === "youtube" ? 1 : 0))) * 82)}%` }}
                  />
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="relative z-10 grid size-14 place-items-center rounded-full bg-cream text-ink shadow-xl transition-transform duration-200 hover:scale-105 active:scale-95"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
            </button>
            <div className="absolute inset-x-5 bottom-4 flex items-center gap-3 font-mono text-[11px] text-night-muted">
              <span>{fmt(time)}</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-night-text/15">
                <div className="h-full bg-red-400 transition-[width] duration-300" style={{ width: `${(time / DURATION) * 100}%` }} />
              </div>
              <span>{fmt(DURATION)}</span>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-[13px] leading-relaxed">
            {(mode === "class"
              ? [
                  { s: "Lecturer", at: 540, t: "SN2 is one step: the nucleophile comes in from the back as the bromide leaves." },
                  { s: "Student", at: 1455, t: "So if the carbocation is flat, the nucleophile can attack from either side?" },
                ]
              : [
                  { s: "Lecturer", at: 700, t: "So the chain rule: outer derivative, keep the inside, times the inner derivative." },
                  { s: "Lecturer", at: 1010, t: "Let's try sin of x squared. What's the inside function here?" },
                ]
            ).map((l) => (
              <div key={l.at} className={`rounded-xl p-3 transition-colors duration-300 ${Math.abs(time - l.at) < 60 ? "bg-red-50" : ""}`}>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-medium text-ink">{l.s}</span>
                  <Stamp at={l.at} onSeek={seek} />
                </div>
                <p className="text-ink-soft">{l.t}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Outputs */}
        <div className="flex min-h-[460px] flex-col p-5">
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <SlidingTabs size="sm" value={tab} onChange={setTab} items={TABS[mode]} ariaLabel="Outputs" />
          </div>

          <div key={`${mode}-${tab}`} className="rise mt-5 flex-1">
            {tab === "tasks" && (
              <ul className="space-y-2">
                {TASKS.map((a, i) => (
                  <li key={a.task} className="flex items-start gap-3 rounded-2xl border border-line p-4">
                    <button
                      type="button"
                      onClick={() => setDone((d) => ({ ...d, [i]: !d[i] }))}
                      aria-pressed={!!done[i]}
                      aria-label={`Mark “${a.task}” done`}
                      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-all duration-200 active:scale-90 ${
                        done[i] ? "border-red-500 bg-red-500 text-cream" : "border-line-strong hover:border-red-400"
                      }`}
                    >
                      <Check className={`size-3.5 transition-transform duration-200 ${done[i] ? "scale-100" : "scale-0"}`} strokeWidth={3} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm transition-colors duration-300 ${done[i] ? "text-muted line-through" : "text-ink"}`}>{a.task}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span className="rounded-full bg-nt-lecture/70 px-2 py-0.5 text-[11px] text-ink">{KIND_LABEL[a.kind]}</span>
                        <span className={a.due === "Not mentioned" ? "italic" : ""}>📅 {a.due}</span>
                        <Stamp at={a.at} onSeek={seek} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {tab === "revision" && (
              <ul className="space-y-3">
                {REVISION.map((d) => (
                  <li key={d.d} className="flex items-center justify-between gap-3 rounded-2xl bg-nt-lecture/50 p-4 text-sm">
                    <span className="flex items-center gap-2">
                      <Check className="size-4 shrink-0 text-red-600" /> {d.d}
                    </span>
                    <Stamp at={d.at} onSeek={seek} />
                  </li>
                ))}
              </ul>
            )}

            {tab === "notes" && (
              <div className="space-y-4">
                {mode === "class" && (
                  <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-muted uppercase">
                    <span>CHEM 204 · Lecture 12</span>
                    <span>52 min</span>
                    <span>Recorded in class</span>
                  </div>
                )}
                {NOTES[mode].map((n) => (
                  <div key={n.h}>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium tracking-[-0.01em]">{n.h}</h4>
                      <Stamp at={n.at} onSeek={seek} />
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">{n.b}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === "cards" && (
              <div className="flex flex-col items-center">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setFlipped((f) => !f)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setFlipped((f) => !f);
                    }
                  }}
                  className="group relative h-[220px] w-full max-w-[380px] cursor-pointer [perspective:1200px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400"
                  aria-label="Flip card"
                >
                  <div
                    className={`relative size-full transition-transform duration-700 ease-[var(--ease-spring)] [transform-style:preserve-3d] ${
                      flipped ? "[transform:rotateY(180deg)]" : ""
                    }`}
                  >
                    <div className="absolute inset-0 flex flex-col justify-between rounded-2xl bg-nt-lecture p-6 text-left shadow-md [backface-visibility:hidden]">
                      <span className="font-mono text-[10px] tracking-[0.12em] text-ink/60 uppercase">
                        Card {card + 1} / {CARDS.length}
                      </span>
                      <p className="serif-accent text-[26px] leading-tight not-italic">{CARDS[card]!.q}</p>
                      <span className="text-xs text-ink/60">Tap to flip</span>
                    </div>
                    <div className="absolute inset-0 flex flex-col justify-between rounded-2xl bg-night p-6 text-left text-night-text shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      <span className="font-mono text-[10px] tracking-[0.12em] text-night-muted uppercase">Answer</span>
                      <p className="text-lg leading-snug">{CARDS[card]!.a}</p>
                      <span onClick={(e) => e.stopPropagation()}>
                        <Stamp at={CARDS[card]!.at} onSeek={seek} />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  {(["Again", "Hard", "Good", "Easy"] as const).map((r, i) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setFlipped(false);
                        setTimeout(() => setCard((c) => (c + 1) % CARDS.length), 180);
                      }}
                      className={`btn btn-sm ${i === 2 ? "btn-red" : "btn-ghost"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === "quiz" && (
              <div>
                <p className="font-medium">What is d/dx of sin(x²)?</p>
                <div className="mt-4 grid gap-2">
                  {["cos(x²)", "2x · cos(x²)", "2 · sin(x)", "x² · cos(x)"].map((o, i) => {
                    const chosen = answer === i;
                    const correct = i === 1;
                    const reveal = answer !== null;
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setAnswer(i)}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-all duration-200 hover:-translate-y-px ${
                          reveal && correct
                            ? "border-green-700/40 bg-green-700/10"
                            : reveal && chosen
                              ? "border-red-400 bg-red-50 animate-[wiggle_0.3s]"
                              : "border-line hover:border-line-strong"
                        }`}
                      >
                        <span>
                          <span className="mr-3 font-mono text-xs text-muted">{String.fromCharCode(65 + i)}</span>
                          {o}
                        </span>
                        {reveal && correct && <Check className="size-4 text-green-700" />}
                      </button>
                    );
                  })}
                </div>
                {answer !== null && (
                  <div className="rise mt-4 flex items-center justify-between rounded-xl bg-panel p-3 text-sm text-ink-soft">
                    <span>Outer derivative cos(x²), times inner derivative 2x.</span>
                    <button type="button" onClick={() => setAnswer(null)} className="text-muted hover:text-ink" aria-label="Retry">
                      <RotateCcw className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === "chat" && (
              <div className="flex h-full flex-col gap-3">
                <div className="self-end rounded-2xl rounded-br-md bg-[image:var(--button-ink)] px-4 py-2.5 text-sm text-[#f6ece8]">{chat.q}</div>
                <div className="flex max-w-[92%] gap-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-red-500 text-cream">
                    <Sparkles className="size-3.5" />
                  </span>
                  <div className="rounded-2xl rounded-tl-md border border-line bg-paper px-4 py-3 text-sm leading-relaxed">
                    <TypedAnswer key={mode} text={chat.a}>
                      <Stamp at={chat.at} onSeek={seek} />
                    </TypedAnswer>
                  </div>
                </div>
                <div className="mt-auto flex items-center gap-2 rounded-full border border-line bg-paper p-1.5 pl-4 text-sm text-muted">
                  <span className="flex-1">Ask anything about this item…</span>
                  <span className="grid size-8 place-items-center rounded-full bg-red-500 text-cream">
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
