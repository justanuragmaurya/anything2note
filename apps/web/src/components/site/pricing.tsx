"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, Minus } from "lucide-react";
import { SlidingTabs } from "@/components/ui/sliding-tabs";

type Period = "monthly" | "yearly";
type Region = "in" | "intl";

// Placeholder prices — plan.md §8 leaves exact numbers open.
const PRICES = {
  in: { monthly: 199, yearly: 1499, symbol: "₹" },
  intl: { monthly: 12, yearly: 96, symbol: "$" },
} as const;

const FREE = [
  "120 media minutes / month",
  "50 document pages / month",
  "Up to 60 min per recording",
  "All 7 note types",
  "Flashcards, quizzes, action items",
  "Markdown export",
];

const PRO = [
  "2,000 media minutes / month",
  "2,000 document pages / month",
  "Up to 5 hours per recording",
  "Speaker labels for meetings & interviews",
  "Generous AI chat",
  "PDF, DOCX & Anki export + share links",
];

function Price({ symbol, value }: { symbol: string; value: number }) {
  return (
    <span className="inline-flex items-baseline text-[64px] leading-none font-normal tracking-[-0.06em] tabular-nums">
      {symbol}
      <span key={value} className="rise inline-block">
        {value.toLocaleString("en-IN")}
      </span>
      <span className="text-line-strong">.00</span>
    </span>
  );
}

export function Pricing() {
  const [period, setPeriod] = useState<Period>("yearly");
  const [region, setRegion] = useState<Region>("intl");
  const p = PRICES[region];

  return (
    <div>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <SlidingTabs
          value={period}
          onChange={setPeriod}
          tone="ink"
          ariaLabel="Billing period"
          items={[
            { value: "monthly", label: "Monthly" },
            {
              value: "yearly",
              label: (
                <span className="flex items-center gap-2">
                  Yearly <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-cream">-33%</span>
                </span>
              ),
            },
          ]}
        />
        <SlidingTabs
          value={region}
          onChange={setRegion}
          size="sm"
          ariaLabel="Billing country"
          items={[
            { value: "in", label: "🇮🇳 India" },
            { value: "intl", label: "🌍 Everywhere else" },
          ]}
        />
      </div>

      {/* Yield Theory nested card */}
      <div className="mx-auto mt-10 grid grid-cols-[minmax(0,1fr)] max-w-[1040px] gap-3 rounded-[46px] border border-line-strong bg-panel p-3.5 md:grid-cols-2">
        <div className="flex flex-col rounded-[34px] p-7">
          <span className="grid size-8 place-items-center rounded-lg bg-[image:var(--button-ink)] shadow-[var(--button-shadow)]">
            <span className="size-2.5 rounded-full bg-cream shadow-[0_0_10px_2px_#fff8]" />
          </span>
          <h3 className="mt-7 text-[21px] tracking-[-0.035em]">Free</h3>
          <p className="mt-1 text-sm text-muted">Try every note type. No card.</p>
          <div className="mt-6">
            <Price symbol={p.symbol} value={0} />
            <span className="ml-2 text-sm text-muted">forever</span>
          </div>
          <p className="mt-3 text-xs text-muted">Enough for a few lectures or meetings a month.</p>
          <ul className="mt-8 flex flex-col gap-3 border-t border-line-strong/70 pt-6 text-sm">
            {FREE.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <Check className="size-4 text-ink-soft" /> {f}
              </li>
            ))}
            <li className="flex items-center gap-3 text-muted">
              <Minus className="size-4" /> Speaker labels
            </li>
          </ul>
          <Link href="/sign-in?next=/app/new" className="btn btn-ghost mt-10 w-full bg-card/50">
            Start free
            <ArrowUpRight className="btn-arrow size-4" />
          </Link>
        </div>

        <div className="relative flex flex-col rounded-[34px] bg-card p-7 shadow-[0_1px_8px_rgba(60,20,10,0.04)]">
          <span className="absolute top-7 right-7 rounded-lg border border-line px-2.5 py-1 text-[11px] text-ink-soft">
            ✦ Most popular
          </span>
          <span className="grid size-8 place-items-center rounded-lg bg-[radial-gradient(circle_at_40%_40%,#ffd2b8,#f65f48_45%,#c8231a)] shadow-[0_0_18px_#f65f4866]" />
          <h3 className="mt-7 text-[21px] tracking-[-0.035em]">Pro</h3>
          <p className="mt-1 text-sm text-muted">For semesters, sprints and research projects.</p>
          <div className="mt-6">
            <Price symbol={p.symbol} value={period === "monthly" ? p.monthly : p.yearly} />
            <span className="ml-2 text-sm text-muted">/{period === "monthly" ? "month" : "year"}</span>
          </div>
          <p className="mt-3 text-xs text-muted">
            {period === "yearly"
              ? `That's ${p.symbol}${Math.round(p.yearly / 12)}/month, billed yearly.`
              : "Billed monthly. Cancel anytime."}
          </p>
          <ul className="mt-8 flex flex-col gap-3 border-t border-line pt-6 text-sm">
            {PRO.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <Check className="size-4 text-red-500" /> {f}
              </li>
            ))}
          </ul>
          <Link href="/sign-in?next=/app/settings%3Ftab%3Dbilling" className="btn btn-red mt-10 w-full">
            Go Pro {period === "yearly" ? "for the year" : "monthly"}
            <ArrowUpRight className="btn-arrow size-4" />
          </Link>
          <p className="mt-3 text-center text-[11px] text-muted">
            {region === "in" ? "UPI AutoPay, cards & netbanking via Razorpay." : "Cards & local methods via Dodo Payments."}
          </p>
        </div>
      </div>
    </div>
  );
}
