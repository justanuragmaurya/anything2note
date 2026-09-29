"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2, RotateCcw, Sparkles, WandSparkles, X } from "lucide-react";
import { TRIAL, type CreateSourceRequest, type ItemDetail, type OutputData, type OutputEntry, type SourceKind } from "@a2n/shared";
import { NoteTypeShape } from "@/components/site/note-type-shape";
import { api, errorMessage } from "@/lib/api";
import { MEDIA_KINDS } from "@/lib/format";
import { NOTE_TYPES, noteType, OUTPUT_LABELS, type NoteTypeKey, type OutputKey } from "@/lib/note-types";
import { apiLanguage, LANGS, readPrefs } from "@/lib/prefs";
import { keys, useInvalidate, useItem, useMe } from "@/lib/queries";
import { statusLine } from "../billing/billing-view";
import { SourceIcon, Toggle, inputCls } from "../ui";
import { SourceStep, type PickedSource } from "./source-step";

type TypeChoice = NoteTypeKey | "auto";

/** A starting point based on the kind of source; the user picks, or leaves it to the API. */
const SUGGEST: Record<SourceKind, NoteTypeKey> = {
  youtube: "lecture",
  recording: "lecture",
  audio: "lecture",
  video: "general",
  pdf: "reading",
  docx: "reading",
  slides: "lecture",
  image: "general",
  text: "general",
  web: "reading",
};

const STEPS = ["Source", "Note type", "Outputs", "Generate"] as const;

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

function TypeStep({ value, suggested, onChange }: { value: TypeChoice; suggested: NoteTypeKey | null; onChange: (v: TypeChoice) => void }) {
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
                  <p className="mt-1.5 text-[12px] text-night-muted">We read the source first, then pick the type and its outputs.</p>
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
              <span className="absolute top-3 right-3 rounded-full bg-cream/85 px-2 py-0.5 font-mono text-[9px] tracking-[0.1em] text-red-700 uppercase">Common pick</span>
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
  selected,
  onToggle,
  lang,
  onLang,
  instructions,
  onInstructions,
}: {
  typeKey: TypeChoice;
  selected: OutputKey[];
  onToggle: (k: OutputKey) => void;
  lang: string;
  onLang: (l: string) => void;
  instructions: string;
  onInstructions: (s: string) => void;
}) {
  const nt = typeKey === "auto" ? null : noteType(typeKey);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[1.2fr_1fr]">
      <div>
        {nt ? (
          <>
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
          </>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl bg-night px-4 py-4 text-[13px] text-night-text">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-red-400" />
            <div>
              <p>
                The note type is <span className="serif-accent text-[16px] text-red-300">detected after reading</span> the source.
              </p>
              <p className="mt-1 text-night-muted">We’ll make that type’s default outputs. Want to choose them yourself? Go back and pick a type.</p>
            </div>
          </div>
        )}
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

const READ_SUB: Partial<Record<SourceKind, string>> = {
  pdf: "Reading the PDF’s text layer",
  docx: "Reading the document",
  slides: "Reading the slides",
  image: "Reading the text in the image",
  text: "Splitting the text into passages",
  web: "Fetching the page and its main text",
};

const clean = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\s+/g, " ").trim();
const clip = (s: string, n = 420) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, "")}…` : s);

/** A short plain-text taste of an output, for the progress screen. */
function preview(d: OutputData): string {
  switch (d.type) {
    case "summary":
      return clean(d.tldr);
    case "notes": {
      const s = d.sections[0];
      return s ? clean(`${s.heading}. ${s.body.join(" ")}`) : "";
    }
    case "generic":
      return clean(d.intro ?? d.blocks.slice(0, 3).map((b) => (b.title ? `${b.title}: ${b.text}` : b.text)).join(" · "));
    case "flashcards":
      return d.cards[0] ? `${d.cards.length} cards. First up: ${clean(d.cards[0].front)}` : "No cards.";
    case "quiz":
      return d.questions[0] ? `${d.questions.length} questions. First up: ${clean(d.questions[0].q)}` : "No questions.";
    case "tasks":
      return d.items.length ? d.items.map((t) => clean(t.task)).join(" · ") : "No tasks were mentioned.";
  }
}

function OutputChip({ k, entry }: { k: OutputKey; entry: OutputEntry | undefined }) {
  const status = entry?.status ?? "queued";
  const cls =
    status === "ready"
      ? "border-red-200 bg-red-50 text-red-800"
      : status === "failed"
        ? "border-red-300 bg-card text-red-700"
        : status === "running"
          ? "border-line-strong bg-card text-ink"
          : "border-line text-muted";
  return (
    <li title={status === "failed" ? entry?.error : undefined} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-all duration-500 ${cls}`}>
      {status === "ready" ? (
        <Check className="tick-pop size-3" strokeWidth={3} />
      ) : status === "failed" ? (
        <X className="size-3" strokeWidth={3} />
      ) : status === "running" ? (
        <Loader2 className="spin size-3" />
      ) : (
        <span className="size-1.5 rounded-full bg-line-strong" />
      )}
      {OUTPUT_LABELS[k]}
      <span className="sr-only">· {status}</span>
    </li>
  );
}

type Created = { state: "posting" } | { state: "error"; message: string } | { state: "created"; id: string };

function ProgressStep({ source, auto, created, onBack }: { source: PickedSource; auto: boolean; created: Created; onBack: () => void }) {
  if (created.state === "posting")
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 text-sm text-ink-soft" aria-busy="true">
        <Loader2 className="spin size-4 text-red-500" /> Sending {source.label} to be read…
      </div>
    );
  if (created.state === "error")
    return (
      <div className="rounded-[22px] border border-red-200 bg-red-50 p-5" role="alert">
        <p className="flex items-start gap-2 text-sm text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {created.message}
        </p>
        <button type="button" onClick={onBack} className="btn btn-ghost btn-sm mt-4">
          <ArrowLeft className="size-3.5" /> Change the source
        </button>
      </div>
    );
  return <Tracking id={created.id} source={source} auto={auto} />;
}

function Tracking({ id, source, auto }: { id: string; source: PickedSource; auto: boolean }) {
  const { data, error, refetch } = useItem(id);
  const invalidate = useInvalidate();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  if (!data)
    return error ? (
      <div className="rounded-[22px] border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">
        {errorMessage(error)}{" "}
        <button type="button" onClick={() => refetch()} className="underline underline-offset-4">
          Try again
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 text-sm text-ink-soft" aria-busy="true">
        <Loader2 className="spin size-4 text-red-500" /> Queued…
      </div>
    );

  return <TrackingView detail={data} source={source} auto={auto} retrying={retrying} retryError={retryError} onRetry={async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      await api.retrySource(id);
      await invalidate(keys.item(id), keys.library);
    } catch (e) {
      setRetryError(errorMessage(e));
    } finally {
      setRetrying(false);
    }
  }} />;
}

function TrackingView({
  detail,
  source,
  auto,
  retrying,
  retryError,
  onRetry,
}: {
  detail: ItemDetail;
  source: PickedSource;
  auto: boolean;
  retrying: boolean;
  retryError: string | null;
  onRetry: () => void;
}) {
  const { item, outputs } = detail;
  const st = item.status;
  const media = MEDIA_KINDS.includes(item.source);
  // 0 = queued, 1 = reading, 2 = generating, 3 = done
  const phase = st.state === "queued" ? 0 : st.state === "processing" ? (st.step === "generating" ? 2 : 1) : st.state === "ready" ? 3 : -1;
  const failed = st.state === "failed";
  const typeKnown = !auto || phase >= 2 || st.state === "ready";
  const keysList = item.outputs;
  const readyCount = keysList.filter((k) => outputs[k]?.status === "ready").length;
  const failedCount = keysList.filter((k) => outputs[k]?.status === "failed").length;
  const overall = st.state === "processing" ? st.progress : st.state === "ready" ? 100 : 0;

  const primaryKey = typeKnown ? noteType(item.noteType).primary : null;
  const shownKey = primaryKey && keysList.includes(primaryKey) ? primaryKey : (keysList.find((k) => outputs[k]?.status === "ready") ?? keysList[0] ?? null);
  const shown = shownKey ? outputs[shownKey] : undefined;

  const steps = [
    {
      label: media ? "Transcribing" : "Reading the source",
      sub: phase === 0 ? "Queued · starts in a moment" : media ? "Speech to text, with timestamps" : (READ_SUB[item.source] ?? "Reading the source"),
    },
    {
      label: "Generating notes",
      sub: keysList.length
        ? `${readyCount} of ${keysList.length} outputs ready${failedCount ? ` · ${failedCount} failed` : ""}`
        : auto
          ? "Picking the note type first"
          : "Waiting for the source",
    },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[1fr_1.3fr]">
      <div>
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-panel text-ink-soft">
            <SourceIcon kind={source.kind} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="font-mono text-[10px] tracking-[0.08em] text-muted uppercase">
              {source.detail} ·{" "}
              {typeKnown ? noteType(item.noteType).label : <span className="normal-case tracking-normal">note type detected after reading</span>}
            </p>
          </div>
        </div>

        <ol className="relative mt-6 space-y-1">
          <span className="absolute top-5 bottom-5 left-[19px] w-px bg-line" aria-hidden />
          {steps.map((s, i) => {
            const at = i + 1;
            const state = failed ? "pending" : phase > at ? "done" : phase === at || (phase === 0 && i === 0) ? "active" : "pending";
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

        {failed ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4" role="alert">
            <p className="flex items-start gap-2 text-sm text-red-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0" /> {st.error}
            </p>
            {retryError && <p className="mt-2 text-[12px] text-red-700">{retryError}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={onRetry} disabled={retrying} className="btn btn-red btn-sm">
                {retrying ? <Loader2 className="spin size-3.5" /> : <RotateCcw className="size-3.5" />} Retry
              </button>
              <Link href="/app" className="btn btn-ghost btn-sm">
                Back to library
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <div className="flex justify-between font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
              <span>{phase >= 3 ? "All done" : phase === 0 ? "Queued" : "Working"}</span>
              <span className="tabular-nums">{Math.round(overall)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel" role="progressbar" aria-valuenow={Math.round(overall)} aria-valuemin={0} aria-valuemax={100} aria-label="Overall progress">
              <div className={`h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out)] ${phase >= 3 ? "bg-[image:var(--button-red)]" : "progress-shimmer"}`} style={{ width: `${Math.max(2, overall)}%` }} />
            </div>
            {phase < 3 && <p className="mt-3 text-[12px] text-muted">You can leave this page. The note keeps processing and shows up in your library when it’s ready.</p>}
          </div>
        )}
      </div>

      <div>
        {shownKey && shown?.status === "ready" && shown.data ? (
          <div className="rise rounded-[22px] border border-line bg-card p-5 shadow-[0_24px_50px_-36px_rgba(60,20,10,0.5)]">
            <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-red-600 uppercase">
              <span className="size-1.5 rounded-full bg-red-500" /> {OUTPUT_LABELS[shownKey]}
              <span className="text-muted">· ready</span>
            </p>
            <p className="mt-3 text-[17px] leading-relaxed tracking-[-0.01em] text-ink">{clip(preview(shown.data))}</p>
          </div>
        ) : failed ? null : (
          <div className="rounded-[22px] border border-line bg-card p-5" aria-busy="true">
            <p className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
              {shownKey && shown?.status === "running" ? `Writing ${OUTPUT_LABELS[shownKey].toLowerCase()}…` : shownKey && shown?.status === "failed" ? `${OUTPUT_LABELS[shownKey]} failed` : "The first output appears here"}
            </p>
            <div className="skeleton mt-5 h-4 w-full rounded-full" />
            <div className="skeleton mt-2 h-4 w-11/12 rounded-full" />
            <div className="skeleton mt-2 h-4 w-3/4 rounded-full" />
            <div className="skeleton mt-6 h-16 rounded-2xl" />
          </div>
        )}

        {keysList.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Outputs">
            {keysList.map((k) => (
              <OutputChip key={k} k={k} entry={outputs[k]} />
            ))}
          </ul>
        )}

        {phase >= 3 && (
          <div className="rise mt-6 flex flex-wrap items-center gap-3">
            <Link href={`/app/i/${item.id}`} className="btn btn-red btn-lg">
              Open notes
              <ArrowRight className="btn-arrow-right size-4" />
            </Link>
            <Link href="/app" className="btn btn-ghost">
              Back to library
            </Link>
            {failedCount > 0 && <p className="w-full text-[12px] text-muted">{failedCount === 1 ? "One output" : `${failedCount} outputs`} failed. You can retry from the note.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Flow ─────────────────────────── */

const HEADINGS = [
  { t: "What are we", a: "noting", e: "today?", s: "Upload a file, record a lecture, paste text or add a web page." },
  { t: "What", a: "kind", e: "of note is it?", s: "The type decides which outputs we write." },
  { t: "Choose your", a: "outputs", e: ".", s: "Defaults are ticked. Add extras, pick a language, leave instructions." },
  { t: "Turning it into", a: "notes", e: "…", s: "The first output appears as soon as it’s ready." },
];

/** Adding notes needs a plan with credits left; say so up front instead of failing at step 4. */
function PlanGate() {
  const { data } = useMe();
  if (!data) return null;
  const b = data.billing;
  if (b.canUse && b.credits.balance > 0) return null;
  const message = b.canUse
    ? "You're out of credits for this cycle. Upgrade, or wait for your plan to renew."
    : b.status === "none"
      ? `Start your ${TRIAL.days}-day free trial to add notes. It comes with ${TRIAL.credits} credits.`
      : statusLine(b);
  return (
    <div className="rise mt-5 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/70 px-4 py-3 text-[14px] text-red-800 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0" /> {message}
      </span>
      <Link href="/app/billing" className="btn btn-red btn-sm shrink-0">
        {b.status === "none" ? "Start free trial" : "Plan & billing"}
      </Link>
    </div>
  );
}

export function NewFlow() {
  const invalidate = useInvalidate();
  const [prefs] = useState(readPrefs);
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<PickedSource | null>(null);
  const [type, setType] = useState<TypeChoice>(prefs.noteType);
  const [outputs, setOutputs] = useState<OutputKey[] | null>(null);
  const [lang, setLang] = useState(LANGS.includes(prefs.language) ? prefs.language : LANGS[0]!);
  const [instructions, setInstructions] = useState("");
  const [created, setCreated] = useState<Created>({ state: "posting" });

  const suggested = source ? SUGGEST[source.kind] : null;
  const selectedOutputs = type === "auto" ? [] : (outputs ?? noteType(type).defaults);

  const pickType = (v: TypeChoice) => {
    setType(v);
    setOutputs(null);
  };
  const toggleOutput = (k: OutputKey) =>
    setOutputs((o) => {
      if (type === "auto") return o;
      const cur = o ?? noteType(type).defaults;
      return cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k];
    });

  const generate = async () => {
    if (!source) return;
    setStep(3);
    setCreated({ state: "posting" });
    const body: CreateSourceRequest = {
      source: source.input,
      noteType: type,
      ...(type !== "auto" && { outputs: selectedOutputs }),
      language: apiLanguage(lang),
      ...(instructions.trim() && { instructions: instructions.trim() }),
    };
    try {
      const { item } = await api.createSource(body);
      setCreated({ state: "created", id: item.id });
      void invalidate(keys.library);
    } catch (e) {
      setCreated({ state: "error", message: errorMessage(e) });
    }
  };

  const canNext = step === 0 ? source !== null : step === 2 ? type === "auto" || selectedOutputs.length > 0 : true;
  const h = HEADINGS[step]!;
  const locked = step === 3 && created.state !== "error";

  return (
    <div className="mx-auto max-w-[980px]">
      <div className="rise">
        <Link href="/app" className="group inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink">
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" /> Library
        </Link>
      </div>

      <PlanGate />

      <div className="rise mt-5" style={{ animationDelay: "60ms" }}>
        <Stepper step={step} onJump={setStep} locked={locked} />
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
          {step === 0 && <SourceStep source={source} onSource={setSource} />}
          {step === 1 && <TypeStep value={type} suggested={suggested} onChange={pickType} />}
          {step === 2 && (
            <OutputsStep
              typeKey={type}
              selected={selectedOutputs}
              onToggle={toggleOutput}
              lang={lang}
              onLang={setLang}
              instructions={instructions}
              onInstructions={setInstructions}
            />
          )}
          {step === 3 && source && <ProgressStep source={source} auto={type === "auto"} created={created} onBack={() => setStep(0)} />}
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
                {step >= 1 && <> · {type === "auto" ? "Auto-detect" : noteType(type).label}</>}
                {step >= 2 && <> · {type === "auto" ? "default outputs" : `${selectedOutputs.length} outputs`}</>}
              </>
            ) : (
              "Pick a source to continue"
            )}
          </p>
          <button type="button" onClick={() => (step === 2 ? void generate() : setStep((s) => s + 1))} disabled={!canNext} className="btn btn-red btn-sm">
            {step === 2 ? "Generate notes" : "Continue"}
            {step === 2 ? <Sparkles className="size-3.5" /> : <ArrowRight className="btn-arrow-right size-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
