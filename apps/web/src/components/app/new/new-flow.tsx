"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Loader2, Sparkles, WandSparkles } from "lucide-react";
import { NoteTypeShape } from "@/components/site/note-type-shape";
import type { SourceKind } from "@/lib/mock/app-data";
import { NOTE_TYPES, noteType, OUTPUT_LABELS, type NoteTypeKey, type OutputKey } from "@/lib/mock/note-types";
import { SourceIcon, Toggle, inputCls } from "../ui";
import { SourceStep, type PickedSource } from "./source-step";

type TypeChoice = NoteTypeKey | "auto";

const SUGGEST: Record<SourceKind, NoteTypeKey> = {
  youtube: "lecture",
  recording: "meeting",
  audio: "meeting",
  video: "general",
  pdf: "reading",
  slides: "lecture",
  image: "general",
  text: "general",
  web: "reading",
};

const STEPS = ["Source", "Note type", "Outputs", "Generate"] as const;

const LANGS = ["Same as source", "English", "Hindi", "Spanish", "French", "German", "Portuguese", "Japanese"];

/* ─────────────────────────── Stepper ─────────────────────────── */

function Stepper({ step, onJump, locked }: { step: number; onJump: (n: number) => void; locked: boolean }) {
  return (
    <ol className="relative flex items-center justify-between" aria-label="Progress">
      <span className="absolute top-1/2 right-[18px] left-[18px] h-px -translate-y-1/2 bg-line-strong" aria-hidden />
      <span
        className="absolute top-1/2 left-[18px] h-[2px] -translate-y-1/2 rounded-full bg-red-500 transition-[width] duration-700 ease-[var(--ease-spring)]"
        style={{ width: `calc((100% - 36px) * ${step / (STEPS.length - 1)})` }}
        aria-hidden
      />
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={label} className="relative z-10">
            <button
              type="button"
              disabled={!done || locked}
              onClick={() => onJump(i)}
              aria-current={current ? "step" : undefined}
              className={`flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-[13px] transition-all duration-300 disabled:cursor-default ${
                current
                  ? "border-ink bg-ink text-cream shadow-[0_8px_20px_-10px_rgba(42,14,12,0.6)]"
                  : done
                    ? "border-red-300 bg-card text-ink hover:-translate-y-px hover:border-red-500"
                    : "border-line bg-paper text-muted"
              }`}
            >
              <span
                className={`grid size-7 place-items-center rounded-full font-mono text-[11px] transition-all duration-300 ${
                  current ? "bg-red-500 text-cream" : done ? "bg-red-500 text-cream" : "bg-panel text-muted"
                }`}
              >
                {done ? <Check className="tick-pop size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={current ? "" : "hidden sm:inline"}>{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ─────────────────────────── Step 2 ─────────────────────────── */

function TypeStep({ value, suggested, onChange }: { value: TypeChoice; suggested: NoteTypeKey; onChange: (v: TypeChoice) => void }) {
  const cards: { key: TypeChoice }[] = [...NOTE_TYPES.map((n) => ({ key: n.key as TypeChoice })), { key: "auto" }];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="radiogroup" aria-label="Note type">
      {cards.map(({ key }, i) => {
        const selected = value === key;
        const ring = selected ? "ring-2 ring-red-500 ring-offset-[3px] ring-offset-paper" : "";
        const badge = selected && (
          <span className="tick-pop absolute -top-2 -right-2 z-10 grid size-6 place-items-center rounded-full border-2 border-paper bg-red-500 text-cream shadow">
            <Check className="size-3" strokeWidth={3.5} />
          </span>
        );
        if (key === "auto")
          return (
            <div key={key} className="rise relative" style={{ animationDelay: `${i * 40}ms` }}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange("auto")}
                className={`group lift relative flex h-full min-h-[172px] w-full flex-col justify-between overflow-hidden rounded-[8px] bg-night p-4 text-left text-night-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400 ${ring}`}
              >
                <div className="dots-night absolute inset-0 opacity-60" aria-hidden />
                <WandSparkles className="relative size-5 text-red-400 transition-transform duration-500 group-hover:rotate-12" />
                <div className="relative">
                  <p className="serif-accent text-[24px] leading-none">Auto-detect</p>
                  <p className="mt-1.5 text-[12px] text-night-muted">We read the first minutes and pick for you.</p>
                </div>
              </button>
              {badge}
            </div>
          );
        const nt = noteType(key);
        return (
          <div key={key} className="rise relative" style={{ animationDelay: `${i * 40}ms` }}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(key)}
              className={`group lift grain relative flex h-full min-h-[172px] w-full flex-col rounded-[8px] p-4 text-left shadow-[0_1px_2px_rgba(60,20,10,0.12)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400 ${ring}`}
              style={{ background: nt.color }}
            >
              <div className="h-11 origin-bottom transition-transform duration-500 ease-[var(--ease-spring)] group-hover:scale-y-[1.12]">
                <NoteTypeShape type={nt.key} />
              </div>
              <div className="mt-3 border-t border-ink/15 pt-3">
                <p className="serif-accent text-[24px] leading-none text-ink not-italic">{nt.label}</p>
                <p className="mt-1.5 text-[12px] leading-snug text-ink-soft">{nt.blurb}</p>
              </div>
              <p className="mt-auto pt-3 font-mono text-[9px] tracking-[0.12em] text-ink/60 uppercase">{nt.defaults.length} outputs</p>
            </button>
            {suggested === key && (
              <span className="absolute top-3 right-3 rounded-full bg-cream/85 px-2 py-0.5 font-mono text-[9px] tracking-[0.1em] text-red-700 uppercase">Suggested</span>
            )}
            {badge}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── Step 3 ─────────────────────────── */

function OutputRow({ k, extra, on, onToggle }: { k: OutputKey; extra: boolean; on: boolean; onToggle: (k: OutputKey) => void }) {
  return (
    <li>
      <div
        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all duration-300 ${
          on ? "border-line-strong bg-card shadow-[0_1px_2px_rgba(60,20,10,0.08)]" : "border-dashed border-line bg-transparent"
        }`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className={`size-2 shrink-0 rounded-full transition-all duration-300 ${on ? "scale-100 bg-red-500" : "scale-75 bg-line-strong"}`} aria-hidden />
          <span className={`truncate text-sm transition-colors ${on ? "text-ink" : "text-ink-soft"}`}>{OUTPUT_LABELS[k]}</span>
          {extra && <span className="shrink-0 font-mono text-[9px] tracking-[0.12em] text-muted uppercase">extra</span>}
        </span>
        <Toggle checked={on} onChange={() => onToggle(k)} label={OUTPUT_LABELS[k]} size="sm" />
      </div>
    </li>
  );
}

function OutputsStep({
  typeKey,
  isAuto,
  selected,
  onToggle,
  lang,
  onLang,
  instructions,
  onInstructions,
}: {
  typeKey: NoteTypeKey;
  isAuto: boolean;
  selected: OutputKey[];
  onToggle: (k: OutputKey) => void;
  lang: string;
  onLang: (l: string) => void;
  instructions: string;
  onInstructions: (s: string) => void;
}) {
  const nt = noteType(typeKey);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[1.2fr_1fr]">
      <div>
        {isAuto && (
          <p className="mb-4 flex items-start gap-2 rounded-2xl bg-night px-4 py-3 text-[13px] text-night-text">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-red-400" />
            <span>
              Looks like a <span className="serif-accent text-[16px] text-red-300">{nt.label.toLowerCase()}</span>. We’ll confirm after reading the first few minutes.
            </span>
          </p>
        )}
        <p className="eyebrow mb-2.5 text-[10px]">Defaults for {nt.label.toLowerCase()}</p>
        <ul className="space-y-2">
          {nt.defaults.map((k) => (
            <OutputRow key={k} k={k} extra={false} on={selected.includes(k)} onToggle={onToggle} />
          ))}
        </ul>
        <p className="eyebrow mt-6 mb-2.5 text-[10px]">Optional</p>
        <ul className="space-y-2">
          {nt.optional.map((k) => (
            <OutputRow key={k} k={k} extra on={selected.includes(k)} onToggle={onToggle} />
          ))}
        </ul>
        <p className="mt-3 text-[12px] text-muted">You can add or regenerate any output later from the workspace.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="lang" className="eyebrow text-[10px]">
            Output language
          </label>
          <select id="lang" value={lang} onChange={(e) => onLang(e.target.value)} className={`${inputCls} mt-2 cursor-pointer appearance-none bg-[length:12px] bg-[right_16px_center] bg-no-repeat pr-10`} style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' fill='none' stroke='%237d6660' stroke-width='1.5'/></svg>\")" }}>
            {LANGS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="instr" className="eyebrow text-[10px]">
            Custom instructions <span className="normal-case tracking-normal text-muted/70">(optional)</span>
          </label>
          <textarea
            id="instr"
            rows={5}
            maxLength={500}
            value={instructions}
            onChange={(e) => onInstructions(e.target.value)}
            placeholder="Focus on the pricing discussion. Write for a first-year student…"
            className={`${inputCls} mt-2 resize-none leading-relaxed`}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {["Keep it brief", "Explain like I’m new", "Use British spelling"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onInstructions(instructions ? `${instructions} ${s}.` : `${s}.`)}
                  className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-soft transition-all hover:-translate-y-px hover:border-line-strong hover:text-ink"
                >
                  + {s}
                </button>
              ))}
            </div>
            <span className="font-mono text-[10px] text-muted">{instructions.length}/500</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Step 4 ─────────────────────────── */

const FIRST_OUTPUT: Record<NoteTypeKey, { label: string; text: string }> = {
  meeting: {
    label: "TL;DR summary",
    text: "Launch slips a week to 14 Oct, the beta grows to 500 users, and an India-only pricing test runs for two weeks. One backend role opens; the design contractor search pauses.",
  },
  lecture: {
    label: "Detailed notes",
    text: "1. Limits, revisited. Differentiability needs the difference-quotient limit to exist; continuity alone isn’t enough. 2. The chain rule: outer derivative, keep the inside, times the inner derivative.",
  },
  reading: {
    label: "Summary",
    text: "The Transformer replaces recurrence with attention alone. It trains faster, parallelises better, and set a new state of the art on WMT 2014 translation.",
  },
  interview: { label: "Summary", text: "Meera studies from recorded lectures and wants flashcards that link back to the exact moment. Anki export is a must-have." },
  podcast: { label: "Summary", text: "Sleep is the foundation of memory consolidation. Morning light, consistent wake times and a cool room matter more than supplements." },
  tutorial: { label: "Step-by-step guide", text: "1. Install Docker Desktop. 2. Create docker-compose.yml with web and db services. 3. Run docker compose up -d and check the logs." },
  general: { label: "Summary", text: "The whiteboard sketches a sync engine: a local SQLite store, an op log, and a server that merges changes with CRDTs." },
};

const DEST: Partial<Record<NoteTypeKey, string>> = { meeting: "demo-meeting", lecture: "demo-lecture", reading: "demo-reading" };

function ProgressStep({ source, typeKey, outputs }: { source: PickedSource; typeKey: NoteTypeKey; outputs: OutputKey[] }) {
  // Mirrors plan §5.2: captioned YouTube skips audio + Whisper; speaker labels only for meetings/interviews.
  const captioned = source.kind === "youtube" && source.detail.includes("captions");
  const media = ["youtube", "audio", "video", "recording"].includes(source.kind);
  const diarize = typeKey === "meeting" || typeKey === "interview";
  const [extract, read] = captioned
    ? [
        { label: "Fetching captions", sub: "Manual captions found" },
        { label: "Aligning timestamps", sub: "Merging caption fragments" },
      ]
    : media
      ? [
          { label: "Extracting audio", sub: "Normalising to 16 kHz mono" },
          { label: "Transcribing", sub: diarize ? "Whisper · speaker labels" : "Whisper · timestamps" },
        ]
      : source.kind === "text"
        ? [
            { label: "Reading text", sub: "Cleaning and splitting sections" },
            { label: "Finding structure", sub: "Headings and key passages" },
          ]
        : source.kind === "web"
          ? [
              { label: "Fetching page", sub: "Readability extraction" },
              { label: "Finding structure", sub: "Headings and key passages" },
            ]
          : [
              { label: "Extracting content", sub: "Reading the text layer" },
              { label: "Reading pages", sub: "OCR on scanned pages" },
            ];
  const steps = [extract, read, { label: "Generating notes", sub: `${outputs.length} outputs · ${noteType(typeKey).label}` }];
  const first = FIRST_OUTPUT[typeKey];
  const [elapsed, setElapsed] = useState(0);

  // Fake the pipeline off one clock: extract → transcribe → stream first output → the rest.
  const T1 = 1600;
  const T2 = 3600;
  const streamEnd = T2 + Math.ceil(first.text.length / 3) * 28;
  const endAt = streamEnd + outputs.length * 380;

  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => {
      const e = performance.now() - start;
      setElapsed(e);
      if (e >= endAt) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [endAt]);

  const streamed = elapsed < T2 ? 0 : Math.min(first.text.length, Math.floor((elapsed - T2) / 28) * 3);
  const streamDone = elapsed >= streamEnd;
  const readyCount = streamDone ? Math.min(outputs.length, 1 + Math.floor((elapsed - streamEnd) / 380)) : 0;
  const phase = elapsed >= endAt ? 3 : elapsed >= T2 ? 2 : elapsed >= T1 ? 1 : 0;

  const overall = phase >= 3 ? 100 : phase === 2 ? 66 + (readyCount / Math.max(1, outputs.length)) * 34 : phase === 1 ? 40 : 12;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[1fr_1.3fr]">
      <div>
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-panel text-ink-soft">
            <SourceIcon kind={source.kind} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{source.label}</p>
            <p className="font-mono text-[10px] tracking-[0.08em] text-muted uppercase">{source.detail}</p>
          </div>
        </div>

        <ol className="relative mt-6 space-y-1">
          <span className="absolute top-5 bottom-5 left-[19px] w-px bg-line" aria-hidden />
          {steps.map((s, i) => {
            const state = phase > i ? "done" : phase === i ? "active" : "pending";
            return (
              <li key={s.label} className="relative flex items-center gap-4 rounded-2xl p-2">
                <span
                  className={`relative z-10 grid size-[38px] shrink-0 place-items-center rounded-full border transition-all duration-500 ${
                    state === "done" ? "border-red-500 bg-red-500 text-cream" : state === "active" ? "border-red-300 bg-card text-red-500" : "border-line bg-paper text-muted"
                  }`}
                >
                  {state === "done" ? <Check className="tick-pop size-4" strokeWidth={3} /> : state === "active" ? <Loader2 className="spin size-4" /> : <span className="font-mono text-[11px]">{i + 1}</span>}
                </span>
                <div>
                  <p className={`text-sm transition-colors ${state === "pending" ? "text-muted" : "text-ink"}`}>
                    {s.label}
                    {state === "active" && "…"}
                  </p>
                  <p className="font-mono text-[10px] tracking-[0.06em] text-muted">{s.sub}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-5">
          <div className="flex justify-between font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
            <span>{phase >= 3 ? "All done" : "Working"}</span>
            <span className="tabular-nums">{Math.round(overall)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel">
            <div className={`h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out)] ${phase >= 3 ? "bg-[image:var(--button-red)]" : "progress-shimmer"}`} style={{ width: `${overall}%` }} />
          </div>
          <p className="mt-3 text-[12px] text-muted">You can leave this page. We’ll email you when your notes are ready.</p>
        </div>
      </div>

      <div>
        {phase < 2 ? (
          <div className="rounded-[22px] border border-line bg-card p-5" aria-busy="true">
            <div className="skeleton h-3 w-28 rounded-full" />
            <div className="skeleton mt-5 h-4 w-full rounded-full" />
            <div className="skeleton mt-2 h-4 w-11/12 rounded-full" />
            <div className="skeleton mt-2 h-4 w-3/4 rounded-full" />
            <div className="skeleton mt-6 h-16 rounded-2xl" />
          </div>
        ) : (
          <div className="rise rounded-[22px] border border-line bg-card p-5 shadow-[0_24px_50px_-36px_rgba(60,20,10,0.5)]">
            <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-red-600 uppercase">
              <span className={`size-1.5 rounded-full bg-red-500 ${streamDone ? "" : "pulse-dot"}`} /> {first.label}
              {streamDone && <span className="text-muted">· ready</span>}
            </p>
            <p className="mt-3 text-[17px] leading-relaxed tracking-[-0.01em] text-ink">
              <span className={streamDone ? "" : "caret"}>{first.text.slice(0, streamed)}</span>
            </p>
          </div>
        )}

        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Outputs">
          {outputs.map((k, i) => {
            const ready = i < readyCount;
            return (
              <li key={k} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-all duration-500 ${ready ? "border-red-200 bg-red-50 text-red-800" : "border-line text-muted"}`}>
                {ready ? <Check className="tick-pop size-3" strokeWidth={3} /> : <span className="size-1.5 rounded-full bg-line-strong" />}
                {OUTPUT_LABELS[k]}
              </li>
            );
          })}
        </ul>

        {phase >= 3 && (
          <div className="rise mt-6 flex flex-wrap items-center gap-3">
            <Link href={`/app/i/${DEST[typeKey] ?? "demo-meeting"}`} className="btn btn-red btn-lg">
              Open workspace
              <ArrowRight className="btn-arrow-right size-4" />
            </Link>
            <Link href="/app" className="link-arrow text-sm text-ink-soft">
              Back to library <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Flow ─────────────────────────── */

const HEADINGS = [
  { t: "What are we", a: "noting", e: "today?", s: "Paste a link, upload a file, record a meeting or drop in text." },
  { t: "What", a: "kind", e: "of note is it?", s: "The type decides which outputs we write. You can change it later." },
  { t: "Choose your", a: "outputs", e: ".", s: "Defaults are ticked. Add extras, pick a language, leave instructions." },
  { t: "Turning it into", a: "notes", e: "…", s: "The first output appears as soon as it’s ready." },
];

export function NewFlow() {
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<PickedSource | null>(null);
  const [type, setType] = useState<TypeChoice>("meeting");
  const [typeTouched, setTypeTouched] = useState(false);
  const [outputs, setOutputs] = useState<OutputKey[] | null>(null);
  const [lang, setLang] = useState(LANGS[0]!);
  const [instructions, setInstructions] = useState("");

  const suggested = source ? SUGGEST[source.kind] : "general";
  const chosenType: TypeChoice = typeTouched ? type : suggested;
  const effective: NoteTypeKey = chosenType === "auto" ? suggested : chosenType;
  const selectedOutputs = outputs ?? noteType(effective).defaults;

  const pickType = (v: TypeChoice) => {
    setType(v);
    setTypeTouched(true);
    setOutputs(null);
  };
  const toggleOutput = (k: OutputKey) => setOutputs((o) => {
    const cur = o ?? noteType(effective).defaults;
    return cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k];
  });

  const canNext = step === 0 ? source !== null : step === 2 ? selectedOutputs.length > 0 : true;
  const h = HEADINGS[step]!;

  return (
    <div className="mx-auto max-w-[980px]">
      <div className="rise">
        <Link href="/app" className="group inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink">
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" /> Library
        </Link>
      </div>

      <div className="rise mt-5" style={{ animationDelay: "60ms" }}>
        <Stepper step={step} onJump={setStep} locked={step === 3} />
      </div>

      <div key={step} className="rise mt-9">
        <p className="eyebrow">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="mt-2 text-[32px] leading-[1.05] tracking-[-0.04em] sm:text-[42px]">
          {h.t} <span className="serif-accent text-red-500">{h.a}</span>
          {/^[.…]/.test(h.e) ? h.e : ` ${h.e}`}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">{h.s}</p>

        <div className="mt-7">
          {step === 0 && <SourceStep
              source={source}
              onSource={(s) => {
                setSource(s);
                if (!typeTouched) setOutputs(null);
              }}
            />}
          {step === 1 && <TypeStep value={chosenType} suggested={suggested} onChange={pickType} />}
          {step === 2 && (
            <OutputsStep
              typeKey={effective}
              isAuto={chosenType === "auto"}
              selected={selectedOutputs}
              onToggle={toggleOutput}
              lang={lang}
              onLang={setLang}
              instructions={instructions}
              onInstructions={setInstructions}
            />
          )}
          {step === 3 && source && <ProgressStep source={source} typeKey={effective} outputs={selectedOutputs} />}
        </div>
      </div>

      {step < 3 && (
        <div className="sticky bottom-24 z-20 mt-10 flex items-center justify-between gap-3 rounded-full border border-line bg-paper/85 p-2 backdrop-blur-xl lg:bottom-6">
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn btn-ghost btn-sm">
            <ArrowLeft className="size-3.5" /> Back
          </button>
          <p className="hidden min-w-0 truncate text-[12px] text-muted sm:block">
            {source ? (
              <>
                <span className="text-ink-soft">{source.label}</span>
                {step >= 1 && <> · {chosenType === "auto" ? "Auto-detect" : noteType(effective).label}</>}
                {step >= 2 && <> · {selectedOutputs.length} outputs</>}
              </>
            ) : (
              "Pick a source to continue"
            )}
          </p>
          <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="btn btn-red btn-sm">
            {step === 2 ? "Generate notes" : "Continue"}
            {step === 2 ? <Sparkles className="size-3.5" /> : <ArrowRight className="btn-arrow-right size-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
