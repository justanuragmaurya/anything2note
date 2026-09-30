"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, ArrowUpRight, Sparkles, X } from "lucide-react";
import { TRIAL, type Billing } from "@a2n/shared";
import { fmtTsDate } from "@/lib/format";
import { useMe } from "@/lib/queries";

/* Low-credit warnings and the compact plan/credits bits for small screens. */

/** 0, or how much of this cycle's credits are used once it crosses 80% / 100%. */
export function creditLevel(b: Billing): 0 | 80 | 100 {
  const { cycleGranted, cycleRemaining } = b.credits;
  if (!b.canUse || cycleGranted <= 0) return 0;
  const used = 1 - cycleRemaining / cycleGranted;
  return used >= 1 ? 100 : used >= 0.8 ? 80 : 0;
}

const DISMISS_KEY = "a2n.creditBanner";

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

/**
 * Shown across the app at 80% and 100% of the cycle's credits. Dismissing hides it until the next
 * threshold or the next cycle.
 */
export function CreditBanner({ pathname }: { pathname: string }) {
  const { data } = useMe();
  const [dismissedNow, setDismissedNow] = useState<string | null>(null);
  if (!data) return null;
  const b = data.billing;
  const level = creditLevel(b);
  // Billing is where the button goes; the add flow has its own out-of-credits notice.
  if (!level || pathname.startsWith("/app/billing") || (pathname.startsWith("/app/new") && b.credits.balance <= 0)) return null;
  const key = `${level}:${b.periodEnd ?? 0}`;
  if (dismissedNow === key || readDismissed() === key) return null;

  const dismiss = () => {
    setDismissedNow(key);
    try {
      localStorage.setItem(DISMISS_KEY, key);
    } catch {
      /* it just comes back next visit */
    }
  };

  const { balance, cycleRemaining, cycleGranted, topupRemaining } = b.credits;
  const until = b.periodEnd ? ` ${b.status === "trialing" ? "Your trial ends" : "Credits reset"} ${fmtTsDate(b.periodEnd)}.` : "";
  const message =
    level === 100
      ? balance > 0
        ? `You’ve used all of this cycle’s credits. ${topupRemaining.toLocaleString("en-US")} top-up credits left.${until}`
        : `You’re out of credits for this cycle, so new notes and extra chat are paused.${until}`
      : `You’ve used ${Math.floor((1 - cycleRemaining / cycleGranted) * 100)}% of this cycle’s credits. ${cycleRemaining.toLocaleString("en-US")} left.${until}`;
  const topPlan = b.plan === "pro";

  return (
    <div
      role="status"
      className={`rise mx-auto mb-6 flex max-w-[1180px] items-start gap-3 rounded-2xl border px-4 py-3 text-[13px] sm:items-center ${
        level === 100 ? "border-red-200 bg-red-50/80 text-red-800" : "border-line-strong bg-card text-ink"
      }`}
    >
      <AlertCircle className={`mt-0.5 size-4 shrink-0 sm:mt-0 ${level === 100 ? "" : "text-red-500"}`} aria-hidden />
      <p className="min-w-0 flex-1">{message}</p>
      <Link href="/app/billing" className="btn btn-red btn-sm !min-h-[32px] shrink-0 !px-3 !py-1 text-[12px]">
        {topPlan ? "Plan & billing" : "Upgrade"}
      </Link>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-panel hover:text-ink">
        <X className="size-3.5" />
      </button>
    </div>
  );
}

/** Credits left as a small ring + number, for the mobile header. */
export function MobileCredits() {
  const { data } = useMe();
  if (!data?.billing.canUse) return null;
  const b = data.billing;
  const { balance, cycleRemaining, cycleGranted } = b.credits;
  const frac = cycleGranted ? Math.min(1, Math.max(0, cycleRemaining / cycleGranted)) : 0;
  const level = creditLevel(b);
  const C = 2 * Math.PI * 6;
  const label = `${balance.toLocaleString("en-US")} credits left${b.status === "trialing" ? " in your trial" : ""}${b.periodEnd ? `, ${b.status === "trialing" ? "ends" : "resets"} ${fmtTsDate(b.periodEnd)}` : ""}`;
  return (
    <Link
      href="/app/billing"
      aria-label={label}
      title={label}
      className={`flex h-10 items-center gap-1.5 rounded-full border bg-card px-2.5 transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-red-400 ${
        level === 100 ? "border-red-300" : "border-line"
      }`}
    >
      <svg viewBox="0 0 16 16" className="size-4 -rotate-90" aria-hidden>
        <circle cx="8" cy="8" r="6" fill="none" stroke="var(--line-strong)" strokeWidth="2.5" />
        <circle cx="8" cy="8" r="6" fill="none" stroke="var(--red-500)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${frac * C} ${C}`} />
      </svg>
      <span className="font-mono text-[11px] text-ink tabular-nums max-[359px]:hidden">
        {b.status === "trialing" && <span className="text-muted">Trial · </span>}
        {balance.toLocaleString("en-US")}
      </span>
    </Link>
  );
}

/** What to say when there's no usable plan: start the trial, fix a payment, or pick a plan again. */
export function planPrompt(b: Billing): { payment: boolean; message: string; cta: string } | null {
  if (b.canUse) return null;
  const payment = b.status === "on_hold" || b.status === "past_due";
  if (payment) return { payment, message: "Your last payment didn't go through.", cta: "Update payment" };
  if (b.status === "none") return { payment, message: `Try any plan free for ${TRIAL.days} days.`, cta: "Start free trial" };
  return { payment, message: "Your plan has ended. Pick one to keep adding notes.", cta: "See plans" };
}

/** The sidebar's trial card as a slim strip under the mobile header. */
export function MobilePlanStrip() {
  const { data } = useMe();
  const p = data && planPrompt(data.billing);
  if (!p) return null;
  return (
    <div className="relative flex items-center gap-3 overflow-hidden bg-night px-4 py-2.5 text-night-text lg:hidden">
      <div className="dots-night absolute inset-0 opacity-60" aria-hidden />
      <Sparkles className="relative size-4 shrink-0 text-red-400" aria-hidden />
      <p className="relative min-w-0 flex-1 text-[13px] leading-snug">{p.message}</p>
      <Link href="/app/billing" className="btn btn-cream btn-sm relative !min-h-[32px] shrink-0 !px-3 !py-1 text-[12px]">
        {p.cta}
        <ArrowUpRight className="btn-arrow size-3.5" />
      </Link>
    </div>
  );
}
