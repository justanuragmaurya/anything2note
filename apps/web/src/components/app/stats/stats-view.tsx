"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowUpRight, Flame } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";
import { MONTHS, STATS, TODAY_ISO, USER, fmtDayUTC } from "@/lib/mock/app-data";
import { PageHeader, ProgressBar } from "../ui";

const WEEKS = 26;
const LEVELS = ["bg-panel", "bg-red-100", "bg-red-200", "bg-red-400", "bg-red-600"];
const level = (n: number) => (n === 0 ? 0 : n < 6 ? 1 : n < 12 ? 2 : n < 20 ? 3 : 4);
const DAY = 86_400_000;
const TODAY = Date.parse(`${TODAY_ISO}T00:00:00Z`);

const cellDate = (i: number) => new Date(TODAY - (WEEKS * 7 - 1 - i) * DAY);
const fmtDay = fmtDayUTC;

function Tile({ label, children, foot, delay }: { label: string; children: ReactNode; foot: ReactNode; delay: number }) {
  return (
    <div className="rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="lift flex h-full flex-col rounded-[24px] border border-line bg-card p-5">
        <p className="eyebrow text-[10px]">{label}</p>
        <div className="mt-3 text-[40px] leading-none tracking-[-0.045em] text-ink">{children}</div>
        <div className="mt-auto pt-4 text-[12px] text-ink-soft">{foot}</div>
      </div>
    </div>
  );
}

function Heatmap() {
  const [hover, setHover] = useState<number | null>(null);
  const cells = STATS.heatmap;
  const months: { col: number; label: string }[] = [];
  for (let w = 0; w < WEEKS; w++) {
    const d = cellDate(w * 7);
    const prev = w > 0 ? cellDate((w - 1) * 7) : null;
    if (!prev || prev.getUTCMonth() !== d.getUTCMonth()) months.push({ col: w, label: MONTHS[d.getUTCMonth()]! });
  }
  const total = cells.reduce((a, b) => a + b, 0);
  const activeDays = cells.filter((c) => c > 0).length;

  return (
    <section className="rise rounded-[28px] border border-line bg-card p-5 sm:p-6" style={{ animationDelay: "240ms" }} aria-label="Review activity">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-[10px]">Review activity · 26 weeks</p>
          <p className="mt-1.5 text-[15px] text-ink-soft">
            <span className="text-ink">{total.toLocaleString("en-US")}</span> cards across <span className="text-ink">{activeDays}</span> days
          </p>
        </div>
        <p className="font-mono text-[11px] text-ink-soft tabular-nums" aria-live="polite">
          {hover !== null ? (
            <>
              <span className="text-ink">{cells[hover]}</span> cards · {fmtDay(cellDate(hover))}
            </>
          ) : (
            <span className="text-muted">Hover a day</span>
          )}
        </p>
      </div>

      <div className="no-scrollbar -mx-5 mt-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div className="inline-grid grid-cols-[22px_auto] gap-x-2">
          <span />
          <div className="relative mb-1.5 h-3" style={{ width: WEEKS * 15 - 3 }}>
            {months.map((m) => (
              <span key={m.col} className="absolute font-mono text-[9px] tracking-[0.08em] text-muted uppercase" style={{ left: m.col * 15 }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="grid grid-rows-7 gap-[3px] font-mono text-[9px] text-muted" aria-hidden>
            {["M", "", "W", "", "F", "", "S"].map((d, i) => (
              <span key={i} className="flex h-3 items-center leading-none">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-flow-col grid-rows-7 gap-[3px]" role="grid" aria-label="Cards reviewed per day" onPointerLeave={() => setHover(null)}>
            {cells.map((n, i) => (
              <span
                key={i}
                role="gridcell"
                aria-label={`${fmtDay(cellDate(i))}: ${n} cards`}
                onPointerEnter={() => setHover(i)}
                className={`size-3 rounded-[3px] transition-transform duration-150 ${LEVELS[level(n)]} ${hover === i ? "scale-[1.35] ring-2 ring-card" : ""} ${i === cells.length - 1 ? "outline outline-1 outline-offset-1 outline-ink/40" : ""}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-1.5 font-mono text-[9px] tracking-[0.08em] text-muted uppercase">
        Less
        {LEVELS.map((c) => (
          <span key={c} className={`size-2.5 rounded-[2px] ${c}`} />
        ))}
        More
      </div>
    </section>
  );
}

function WeeklyBars() {
  const [hover, setHover] = useState<number | null>(null);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const max = Math.max(...STATS.weekly);
  const sum = STATS.weekly.reduce((a, b) => a + b, 0);
  return (
    <section className="rise flex flex-col rounded-[28px] border border-line bg-card p-5 sm:p-6" style={{ animationDelay: "300ms" }} aria-label="Cards reviewed this week">
      <p className="eyebrow text-[10px]">This week</p>
      <p className="mt-1.5 text-[15px] text-ink-soft">
        <span className="text-ink">{sum}</span> cards reviewed
      </p>
      <div className="mt-5 flex h-[150px] flex-1 items-end gap-2 border-b border-line" onPointerLeave={() => setHover(null)}>
        {STATS.weekly.map((v, i) => (
          <div key={days[i]} className="group relative flex h-full flex-1 items-end" onPointerEnter={() => setHover(i)}>
            {hover === i && (
              <span className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-md bg-night px-2 py-1 font-mono text-[10px] whitespace-nowrap text-night-text">
                {v} cards
              </span>
            )}
            <span
              className={`w-full origin-bottom rounded-t-[4px] transition-colors duration-200 ${i === 6 ? "bg-red-500" : hover === i ? "bg-ink-soft" : "bg-line-strong"}`}
              style={{ height: `${(v / max) * 100}%` }}
              aria-label={`${days[i]}: ${v} cards`}
              role="img"
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 font-mono text-[9px] tracking-[0.06em] text-muted uppercase">
        {days.map((d, i) => (
          <span key={d} className={`flex-1 text-center ${i === 6 ? "text-red-600" : ""}`}>
            {d}
          </span>
        ))}
      </div>
    </section>
  );
}

export function StatsView() {
  const u = USER.usage;
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        eyebrow="Stats · September"
        title={
          <>
            A <span className="serif-accent text-red-500">{USER.streak}-day</span> streak. Keep it warm.
          </>
        }
        sub="Reviews, quiz scores and what’s left on your plan this month."
        actions={
          <Link href="/app/review" className="btn btn-red btn-sm">
            <Flame className="size-3.5" /> Review now
          </Link>
        }
      />

      <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Cards reviewed" delay={60} foot={<span className="text-green-800">{STATS.cardsDelta}</span>}>
          <CountUp to={STATS.cardsReviewed} />
        </Tile>
        <Tile label="Quiz accuracy" delay={110} foot={<span className="text-green-800">{STATS.quizDelta} this month</span>}>
          <CountUp to={STATS.quizAccuracy} />
          <span className="serif-accent text-[28px] text-muted">%</span>
        </Tile>
        <Tile
          label="Media minutes"
          delay={160}
          foot={
            <>
              <ProgressBar value={(u.mediaMin / u.mediaLimit) * 100} />
              <span className="mt-2 block">{u.mediaLimit - u.mediaMin} min left · resets {u.resetsOn}</span>
            </>
          }
        >
          <CountUp to={u.mediaMin} />
          <span className="text-[18px] tracking-[-0.02em] text-muted"> / {u.mediaLimit}</span>
        </Tile>
        <Tile
          label="Pages"
          delay={210}
          foot={
            <>
              <ProgressBar value={(u.pages / u.pagesLimit) * 100} tone="ink" />
              <span className="mt-2 block">{u.pagesLimit - u.pages} pages left</span>
            </>
          }
        >
          <CountUp to={u.pages} />
          <span className="text-[18px] tracking-[-0.02em] text-muted"> / {u.pagesLimit}</span>
        </Tile>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Heatmap />
        <WeeklyBars />
      </div>

      <section className="rise mt-4 rounded-[28px] border border-line bg-card p-5 sm:p-6" style={{ animationDelay: "360ms" }} aria-label="Weak topics">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-[10px]">Weak topics</p>
            <p className="mt-1.5 text-[15px] text-ink-soft">From quiz answers and cards you rated “Again”.</p>
          </div>
          <Link href="/app/review" className="link-arrow shrink-0 text-[13px] text-red-600">
            Practise these <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        <ul className="mt-5 space-y-4">
          {STATS.weakTopics.map((w, i) => (
            <li key={w.topic} className="grid grid-cols-[minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[220px_1fr_48px]">
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{w.topic}</p>
                <p className="truncate font-mono text-[10px] tracking-[0.06em] text-muted uppercase">{w.item}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-panel" role="img" aria-label={`${w.topic}: ${w.accuracy}% accuracy`}>
                <div
                  className="rise h-full rounded-full"
                  style={{ width: `${w.accuracy}%`, background: w.accuracy < 60 ? "var(--red-500)" : "var(--red-300)", animationDelay: `${420 + i * 80}ms` }}
                />
              </div>
              <span className="font-mono text-[12px] text-ink tabular-nums sm:text-right">{w.accuracy}%</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
