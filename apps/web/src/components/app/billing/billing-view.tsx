"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowUpRight, Check, CreditCard, Loader2 } from "lucide-react";
import { PLANS, TRIAL, planDef, type Billing, type PlanKey } from "@a2n/shared";
import { api, errorMessage } from "@/lib/api";
import { fmtTsDate } from "@/lib/format";
import { keys, useInvalidate, useMe } from "@/lib/queries";
import { NestedCard, PageHeader, ProgressBar } from "../ui";

/* Plan & billing (plan.md §8): pick a plan, start the trial through Dodo checkout, switch plans, manage payment. */

const LIVE = ["trialing", "active", "past_due", "on_hold", "paused"];
export const hasLivePlan = (b: Billing) => LIVE.includes(b.status);

export function planLabel(b: Billing | undefined): string {
  if (!b) return " ";
  if (!b.plan || b.status === "none") return "No plan";
  const name = planDef(b.plan).name;
  if (b.status === "trialing") return `${name} · trial`;
  if (b.status === "expired" || (b.status === "cancelled" && !b.canUse)) return "Plan ended";
  return `${name} plan`;
}

/** One line on where the plan stands: trial end, renewal, cancellation or a payment problem. */
export function statusLine(b: Billing): string {
  const end = b.periodEnd ? fmtTsDate(b.periodEnd) : null;
  const price = b.plan ? `$${planDef(b.plan).price}/month` : "";
  switch (b.status) {
    case "none":
      return `Every plan starts with a ${TRIAL.days}-day free trial.`;
    case "trialing":
      return b.cancelAtPeriodEnd ? `Trial ends ${end} and won't renew.` : `Free trial until ${end}, then ${price}.`;
    case "active":
      if (b.cancelAtPeriodEnd) return `Cancelled · works until ${end}.`;
      if (b.pendingPlan) return `Switches to ${planDef(b.pendingPlan).name} on ${end}.`;
      return `Renews ${end} at ${price}.`;
    case "past_due":
    case "on_hold":
      return "Your last payment didn't go through. Update your card to keep going.";
    case "paused":
      return "Paused. Resume it from Manage billing.";
    case "cancelled":
      return b.canUse ? `Cancelled · works until ${end}.` : "Your plan has ended.";
    case "expired":
      return "Your plan has ended.";
  }
}

function Meter({ label, used, total, tone = "red" }: { label: string; used: number; total: number; tone?: "red" | "ink" }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-ink-soft">{label}</span>
        <span className="font-mono text-[11px] tabular-nums">
          {used.toLocaleString("en-US")} / {total.toLocaleString("en-US")} left
        </span>
      </div>
      <ProgressBar value={total ? (used / total) * 100 : 0} className="mt-1.5 h-2" tone={tone} />
    </div>
  );
}

/** Credits and chat left this cycle. */
export function CreditsSummary({ billing }: { billing: Billing }) {
  if (!hasLivePlan(billing) && !billing.canUse)
    return <p className="text-[13px] text-muted">No credits yet. A plan gives you a monthly allowance; 1 credit is 1 minute of audio or 1 page.</p>;
  const { credits, chat } = billing;
  return (
    <div className="space-y-4">
      <Meter label={billing.status === "trialing" ? "Trial credits" : "Credits this cycle"} used={credits.cycleRemaining} total={credits.cycleGranted} />
      <Meter label="AI chat messages" used={chat.remaining} total={chat.allowance} tone="ink" />
      {credits.topupRemaining > 0 && <p className="text-[12px] text-muted">+ {credits.topupRemaining.toLocaleString("en-US")} top-up credits</p>}
      <p className="text-[12px] text-muted">1 credit = 1 minute of audio or video, or 1 page. Once chat messages run out, each one uses 1 credit.</p>
    </div>
  );
}

function PlanCards({ billing, busy, onPick }: { billing: Billing; busy: PlanKey | null; onPick: (p: PlanKey) => void }) {
  const live = hasLivePlan(billing);
  const current = live ? billing.plan : null;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3">
      {PLANS.map((p) => {
        const isCurrent = p.key === current;
        const featured = p.key === "plus";
        let cta: string;
        if (!live) cta = billing.hadTrial ? `Subscribe to ${p.name}` : `Start ${TRIAL.days}-day free trial`;
        else if (isCurrent) cta = billing.pendingPlan ? `Keep ${p.name}` : "Current plan";
        else cta = billing.status !== "trialing" && p.price > planDef(current!).price ? `Upgrade to ${p.name}` : `Switch to ${p.name}`;
        const disabled = busy !== null || (isCurrent && !billing.pendingPlan) || billing.status === "on_hold" || billing.status === "past_due";
        return (
          <div key={p.key} className={`flex flex-col rounded-[24px] border p-5 ${isCurrent ? "border-red-300 bg-red-50/60" : "border-line bg-card"}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-[19px] tracking-[-0.03em]">{p.name}</h3>
              {isCurrent ? (
                <span className="rounded-full bg-red-500 px-2 py-0.5 font-mono text-[9px] tracking-[0.1em] text-cream uppercase">Current</span>
              ) : featured ? (
                <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-soft">✦ Popular</span>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] text-muted">{p.blurb}</p>
            <p className="mt-4 text-[40px] leading-none tracking-[-0.05em] tabular-nums">
              ${p.price}
              <span className="ml-1 text-[14px] tracking-normal text-muted">/month</span>
            </p>
            <ul className="mt-5 flex-1 space-y-2 border-t border-line pt-4 text-[13px]">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-red-500" strokeWidth={3} /> {f}
                </li>
              ))}
            </ul>
            <button type="button" disabled={disabled} onClick={() => onPick(p.key)} className={`btn mt-5 w-full ${isCurrent ? "btn-ghost" : featured || !live ? "btn-red" : "btn-ink"} disabled:cursor-not-allowed disabled:opacity-60`}>
              {busy === p.key ? <Loader2 className="size-4 animate-spin" /> : cta}
              {!isCurrent && busy !== p.key && <ArrowUpRight className="btn-arrow size-4" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function BillingView({ returned, startPlan }: { returned: { subscriptionId: string | null; status: string | null }; startPlan: PlanKey | null }) {
  const router = useRouter();
  const invalidate = useInvalidate();
  const { data: me, error: meError } = useMe();
  const [busy, setBusy] = useState<PlanKey | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [syncDone, setSyncDone] = useState(false);
  const synced = useRef(false);
  const started = useRef(false);

  // Back from Dodo checkout (?subscription_id=…&status=…): pull the new subscription in right away
  // instead of waiting for the webhook.
  const { subscriptionId: returnedSub, status: returnedStatus } = returned;
  const syncing = !!returnedSub && !syncDone;
  useEffect(() => {
    if (!returnedSub || synced.current) return;
    synced.current = true;
    api
      .syncBilling(returnedSub)
      .then(async ({ billing }) => {
        await invalidate(keys.me, keys.stats);
        if (billing.status === "trialing") setNotice(`You're in. Your ${TRIAL.days}-day trial has started with ${TRIAL.credits} credits.`);
        else if (billing.canUse) setNotice("You're subscribed. Your credits are ready.");
        else if (returnedStatus === "failed") setError("The payment didn't go through, so no plan was started. Try again.");
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => {
        setSyncDone(true);
        router.replace("/app/billing", { scroll: false });
      });
  }, [returnedSub, returnedStatus, invalidate, router]);

  const pick = async (plan: PlanKey) => {
    if (!me) return;
    setError(null);
    setNotice(null);
    setBusy(plan);
    try {
      if (!hasLivePlan(me.billing)) {
        const { url } = await api.checkout(plan);
        window.location.assign(url);
        return;
      }
      const { billing } = await api.changePlan(plan);
      await invalidate(keys.me, keys.stats);
      setNotice(billing.pendingPlan ? `You'll move to ${planDef(billing.pendingPlan).name} when this period ends.` : `You're on ${planDef(billing.plan ?? plan).name} now.`);
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(null);
  };

  // From the pricing page (?plan=…): open checkout for that plan right away.
  const autoCheckout = !!startPlan && !!me && !hasLivePlan(me.billing) && !error;
  useEffect(() => {
    if (!startPlan || !me || started.current) return;
    started.current = true;
    if (hasLivePlan(me.billing)) {
      router.replace("/app/billing", { scroll: false });
      return;
    }
    api
      .checkout(startPlan)
      .then(({ url }) => window.location.assign(url))
      .catch((e) => setError(errorMessage(e)));
  }, [startPlan, me, router]);

  const portal = async () => {
    setError(null);
    setBusy("portal");
    try {
      const { url } = await api.billingPortal();
      window.location.assign(url);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  };

  const b = me?.billing;
  return (
    <div className="mx-auto max-w-[1080px]">
      <PageHeader eyebrow="Account" title="Plan & billing" sub="Credits reset every billing cycle. Payments, tax and invoices are handled by Dodo Payments." />

      {(syncing || autoCheckout || notice || error) && (
        <div
          role="status"
          className={`rise mt-6 flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-[14px] ${error ? "border-red-200 bg-red-50 text-red-800" : "border-line bg-card text-ink"}`}
        >
          {error ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          ) : syncing || autoCheckout ? (
            <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
          ) : (
            <Check className="mt-0.5 size-4 shrink-0 text-green-800" />
          )}
          {error ?? (syncing ? "Confirming your subscription…" : autoCheckout ? `Opening checkout for ${planDef(startPlan!).name}…` : notice)}
        </div>
      )}

      {!b ? (
        meError ? (
          <p className="mt-8 text-sm text-red-700">{errorMessage(meError)}</p>
        ) : (
          <div className="mt-8 grid gap-3 md:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-[380px] rounded-[24px]" />
            ))}
          </div>
        )
      ) : (
        <div className="mt-8 space-y-4">
          <div className="rise grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[1.1fr_1fr]">
            <NestedCard eyebrow="Your plan" title={planLabel(b)}>
              <p className="text-[14px] text-ink-soft">{statusLine(b)}</p>
              {hasLivePlan(b) && (
                <button type="button" onClick={portal} disabled={busy !== null} className="btn btn-ghost btn-sm mt-4 disabled:opacity-60">
                  {busy === "portal" ? <Loader2 className="size-3.5 animate-spin" /> : <CreditCard className="size-3.5" />}
                  Manage billing
                </button>
              )}
              {hasLivePlan(b) && <p className="mt-2.5 text-[12px] text-muted">Update your card, download invoices or cancel.</p>}
            </NestedCard>
            <NestedCard eyebrow="This cycle" title="Credits">
              <CreditsSummary billing={b} />
            </NestedCard>
          </div>

          <div className="rise" style={{ animationDelay: "80ms" }}>
            <NestedCard eyebrow="Plans" title={hasLivePlan(b) ? "Change plan" : "Pick a plan"}>
              <PlanCards billing={b} busy={busy === "portal" ? null : busy} onPick={pick} />
              <p className="mt-4 text-[12px] text-muted">
                {b.status === "trialing"
                  ? "Switching during the trial is free. Your first charge, when the trial ends, uses the new plan's price."
                  : hasLivePlan(b)
                    ? "Upgrades start right away with a fresh allowance; you're charged the difference for the time left. Downgrades apply when the current period ends."
                  : b.hadTrial
                    ? "Prices in USD. Local taxes are added at checkout. Cancel anytime."
                    : `Card required. You won't be charged until the ${TRIAL.days}-day trial ends, and you can cancel before then. The trial includes ${TRIAL.credits} credits.`}
              </p>
            </NestedCard>
          </div>
        </div>
      )}
    </div>
  );
}
