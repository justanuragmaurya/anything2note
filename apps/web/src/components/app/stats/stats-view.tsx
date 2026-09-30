"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AlertCircle, ArrowUpRight, Flame, Loader2, RotateCcw } from "lucide-react";
import type { CreditEntry, StatsResponse } from "@a2n/shared";
import { CountUp } from "@/components/ui/count-up";
import { errorMessage } from "@/lib/api";
import { MONTHS, fmtDayUTC, fmtTsDate, todayIso } from "@/lib/format";
import { useCreditHistory, useStats } from "@/lib/queries";
import { boughtLabel, creditReason, fmtDelta } from "../billing/credit-history";
import { PageHeader, ProgressBar } from "../ui";

const WEEKS = 26;
const LEVELS = ["bg-panel", "bg-red-100", "bg-red-200", "bg-red-400", "bg-red-600"];
const level = (n: number) => (n === 0 ? 0 : n < 6 ? 1 : n < 12 ? 2 : n < 20 ? 3 : 4);
const DAY = 86_400_000;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const todayMs = () => Date.parse(`${todayIso()}T00:00:00Z`);
const cellDate = (i: number) => new Date(todayMs() - (WEEKS * 7 - 1 - i) * DAY);
const fmtDay = fmtDayUTC;

/** "+40% vs last month", or null when there's no last month to compare with. */
function monthDelta(now: number, last: number): { text: string; up: boolean } | null {
  if (last === 0) return null;
  const pct = Math.round(((now - last) / last) * 100);
  return { text: `${pct >= 0 ? "+" : "−"}${Math.abs(pct)}% vs last month`, up: pct >= 0 };
}

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

function Heatmap({ cells }: { cells: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
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

function WeeklyBars({ weekly }: { weekly: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const max = Math.max(1, ...weekly);
  const sum = weekly.reduce((a, b) => a + b, 0);
  const todayIdx = (new Date(todayMs()).getUTCDay() + 6) % 7;
  return (
    <section className="rise flex flex-col rounded-[28px] border border-line bg-card p-5 sm:p-6" style={{ animationDelay: "300ms" }} aria-label="Cards reviewed this week">
      <p className="eyebrow text-[10px]">This week</p>
      <p className="mt-1.5 text-[15px] text-ink-soft">
        <span className="text-ink">{sum}</span> cards reviewed
      </p>
      <div className="mt-5 flex h-[150px] flex-1 items-end gap-2 border-b border-line" onPointerLeave={() => setHover(null)}>
        {weekly.map((v, i) => (
          <div key={days[i]} className="group relative flex h-full flex-1 items-end" onPointerEnter={() => setHover(i)}>
            {hover === i && (
              <span className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-md bg-night px-2 py-1 font-mono text-[10px] whitespace-nowrap text-night-text">
                {v} cards
              </span>
            )}
            <span
              className={`w-full origin-bottom rounded-t-[4px] transition-colors duration-200 ${i === todayIdx ? "bg-red-500" : hover === i ? "bg-ink-soft" : "bg-line-strong"}`}
              style={{ height: `${(v / max) * 100}%` }}
              aria-label={`${days[i]}: ${v} cards`}
              role="img"
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 font-mono text-[9px] tracking-[0.06em] text-muted uppercase">
        {days.map((d, i) => (
          <span key={d} className={`flex-1 text-center ${i === todayIdx ? "text-red-600" : ""}`}>
            {d}
          </span>
        ))}
      </div>
    </section>
  );
}

export function StatsView() {
  const { data, error, refetch, isFetching } = useStats();
  if (!data)
    return error ? (
      <div className="rise mx-auto flex max-w-[520px] flex-col items-center py-16 text-center">
        <AlertCircle className="size-7 text-red-500" />
        <p className="mt-4 text-sm text-ink-soft">{errorMessage(error)}</p>
        <button type="button" onClick={() => refetch()} disabled={isFetching} className="btn btn-ink btn-sm mt-5">
          {isFetching ? <Loader2 className="spin size-3.5" /> : <RotateCcw className="size-3.5" />} Try again
        </button>
      </div>
    ) : (
      <div className="mx-auto max-w-[1100px]" aria-busy="true" aria-label="Loading stats">
        <div className="skeleton h-3 w-28 rounded-full" />
        <div className="skeleton mt-4 h-10 w-80 max-w-full rounded-2xl" />
        <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-[24px]" />
          ))}
        </div>
        <div className="skeleton mt-4 h-60 rounded-[28px]" />
      </div>
    );
  return <Stats stats={data} />;
}

function Stats({ stats }: { stats: StatsResponse }) {
  const { credits, chat, canUse, periodEnd } = stats.billing;
  const delta = monthDelta(stats.cardsReviewedThisMonth, stats.cardsReviewedLastMonth);
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        eyebrow={`Stats · ${MONTH_NAMES[new Date(todayMs()).getUTCMonth()]}`}
        title={
          stats.streak > 0 ? (
            <>
              A <span className="serif-accent text-red-500">{stats.streak}-day</span> streak. Keep it warm.
            </>
          ) : (
            <>
              Your streak starts <span className="serif-accent text-red-500">today</span>.
            </>
          )
        }
        sub="Reviews, quiz scores and what’s left on your plan this cycle."
        actions={
          <Link href="/app/review" className="btn btn-red btn-sm">
            <Flame className="size-3.5" /> Review now
          </Link>
        }
      />

      <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Cards reviewed"
          delay={60}
          foot={
            delta ? (
              <span className={delta.up ? "text-green-800" : "text-red-700"}>{delta.text}</span>
            ) : stats.cardsReviewedThisMonth > 0 ? (
              "This month"
            ) : (
              "Review a card to get started"
            )
          }
        >
          <CountUp to={stats.cardsReviewedThisMonth} />
        </Tile>
        <Tile label="Quiz accuracy" delay={110} foot={stats.quizAccuracy === null ? "Take a quiz to see it here" : "Across every quiz you’ve taken"}>
          {stats.quizAccuracy === null ? (
            <span className="text-muted">—</span>
          ) : (
            <>
              <CountUp to={stats.quizAccuracy} />
              <span className="serif-accent text-[28px] text-muted">%</span>
            </>
          )}
        </Tile>
        <Tile
          label="Credits left"
          delay={160}
          foot={
            canUse ? (
              <>
                <ProgressBar value={credits.cycleGranted ? (credits.cycleRemaining / credits.cycleGranted) * 100 : 0} />
                <span className="mt-2 block">{periodEnd ? `Resets ${fmtTsDate(periodEnd)}` : "This cycle"}</span>
              </>
            ) : (
              <Link href="/app/billing" className="link-underline text-ink-soft">
                Start a plan to get credits
              </Link>
            )
          }
        >
          <CountUp to={credits.balance} />
          {canUse && <span className="text-[18px] tracking-[-0.02em] text-muted"> / {credits.cycleGranted.toLocaleString("en-US")}</span>}
        </Tile>
        <Tile
          label="Chat messages left"
          delay={210}
          foot={
            canUse ? (
              <>
                <ProgressBar value={chat.allowance ? (chat.remaining / chat.allowance) * 100 : 0} tone="ink" />
                <span className="mt-2 block">Then 1 credit per message</span>
              </>
            ) : (
              "Included with every plan"
            )
          }
        >
          <CountUp to={chat.remaining} />
          {canUse && <span className="text-[18px] tracking-[-0.02em] text-muted"> / {chat.allowance.toLocaleString("en-US")}</span>}
        </Tile>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Heatmap cells={stats.heatmap} />
        <WeeklyBars weekly={stats.weekly} />
      </div>

      <CreditUsage />

      <section className="rise mt-4 rounded-[28px] border border-line bg-card p-5 sm:p-6" style={{ animationDelay: "360ms" }} aria-label="Weak topics">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-[10px]">Weak topics</p>
            <p className="mt-1.5 text-[15px] text-ink-soft">From quiz answers and cards you rated “Again”.</p>
          </div>
          {stats.weakTopics.length > 0 && (
            <Link href="/app/review" className="link-arrow shrink-0 text-[13px] text-red-600">
              Practise these <ArrowUpRight className="size-3.5" />
            </Link>
          )}
        </div>
        {stats.weakTopics.length === 0 && <p className="mt-5 text-sm text-muted">Nothing yet. Topics you keep missing will show up here.</p>}
        <ul className="mt-5 space-y-4">
          {stats.weakTopics.map((w, i) => (
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

/* ─────────────────────────── Credit usage ─────────────────────────── */

const USAGE_DAYS = 30;
/** Pages of history to pull (50 each) to cover the window. */
const USAGE_MAX_PAGES = 4;

function sumUsage(entries: CreditEntry[]) {
  const t = { items: 0, itemCount: 0, minutes: 0, pages: 0, chat: 0, added: 0, refunded: 0, expired: 0 };
  for (const e of entries) {
    if (e.reason === "item") {
      t.items -= e.delta;
      t.itemCount += 1;
      t.minutes += e.minutes ?? 0;
      t.pages += e.pages ?? 0;
    } else if (e.reason === "item_refund") t.refunded += e.delta;
    else if (e.reason === "chat") t.chat -= e.delta;
    else if (e.reason === "grant" || e.reason === "topup") t.added += e.delta;
    else if (e.reason === "expire") t.expired -= e.delta;
  }
  return t;
}

function UsageFigure({ label, value, foot }: { label: string; value: string; foot: string }) {
  return (
    <div className="rounded-2xl border border-line bg-paper/60 p-3.5">
      <p className="eyebrow text-[9px]">{label}</p>
      <p className="mt-1.5 text-[24px] leading-none tracking-[-0.03em] tabular-nums">{value}</p>
      <p className="mt-1.5 truncate text-[12px] text-muted">{foot}</p>
    </div>
  );
}

/** What credits went on over the last 30 days, from the credit history. */
function CreditUsage() {
  const q = useCreditHistory();
  const [since] = useState(() => Date.now() - USAGE_DAYS * DAY);
  const entries = q.data?.pages.flatMap((p) => p.entries) ?? [];
  const oldest = entries.at(-1)?.at;
  const needMore = !!q.hasNextPage && oldest !== undefined && oldest > since && (q.data?.pages.length ?? 0) < USAGE_MAX_PAGES;
  const { fetchNextPage, isFetchingNextPage } = q;
  useEffect(() => {
    if (needMore && !isFetchingNextPage) void fetchNextPage();
  }, [needMore, isFetchingNextPage, fetchNextPage]);

  if (q.error && !q.data) return null;
  const recent = entries.filter((e) => e.at >= since);
  const t = sumUsage(recent);
  const bought = boughtLabel(t);
  return (
    <section className="rise mt-4 rounded-[28px] border border-line bg-card p-5 sm:p-6" style={{ animationDelay: "330ms" }} aria-label="Credit usage">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-[10px]">Credit usage · last {USAGE_DAYS} days</p>
          <p className="mt-1.5 text-[15px] text-ink-soft">What your notes and chat used, and what was added.</p>
        </div>
        <Link href="/app/billing#credits" className="link-arrow shrink-0 text-[13px] text-red-600">
          Full history <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
      {!q.data ? (
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[92px] rounded-2xl" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <p className="mt-5 text-sm text-muted">No credits used in the last {USAGE_DAYS} days.</p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <UsageFigure label="Notes" value={t.items.toLocaleString("en-US")} foot={`${t.itemCount} ${t.itemCount === 1 ? "item" : "items"}${bought ? ` · ${bought}` : ""}`} />
            <UsageFigure label="Chat" value={t.chat.toLocaleString("en-US")} foot="Past the included messages" />
            <UsageFigure label="Added" value={fmtDelta(t.added)} foot="Plan and trial credits" />
            <UsageFigure label="Refunded" value={fmtDelta(t.refunded)} foot={t.expired ? `${t.expired.toLocaleString("en-US")} expired unused` : "From notes that failed"} />
          </div>
          <ul className="mt-5 divide-y divide-line">
            {recent.slice(0, 4).map((e) => {
              const r = creditReason(e);
              return (
                <li key={e.id} className="flex items-center gap-3 py-2.5 text-[13px] first:pt-0 last:pb-0">
                  <span className="w-[48px] shrink-0 font-mono text-[10px] tracking-[0.06em] text-muted uppercase">{fmtTsDate(e.at)}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-soft">
                    {r.title}
                    {r.detail && <span className="text-muted"> · {r.detail}</span>}
                  </span>
                  <span className={`shrink-0 font-mono text-[12px] tabular-nums ${e.delta > 0 ? "text-green-800" : "text-ink"}`}>{fmtDelta(e.delta)}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
