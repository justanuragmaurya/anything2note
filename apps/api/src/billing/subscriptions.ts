import { eq } from "drizzle-orm";
import type { Subscription } from "dodopayments/resources/subscriptions";
import { planDef, TRIAL, type BillingStatus } from "@a2n/shared";
import { subscriptions, user } from "../db/schema";
import { db, newId } from "../lib/http";
import { grantCycle } from "./credits";
import { dodo, planForProduct } from "./dodo";

/*
 * Mirrors a Dodo subscription into D1 and grants its credits. Idempotent: webhooks, the
 * post-checkout sync and plan changes all call it with the latest subscription object.
 */

const DAY = 86_400_000;
const ts = (iso: string | null | undefined) => (iso ? Date.parse(iso) : null);

/**
 * The subscription object has no trial flag. A free trial's first "cycle" is the trial itself, so
 * it's much shorter than a month; any paid monthly cycle is 28+ days.
 */
function inTrial(s: Subscription): boolean {
  const start = ts(s.previous_billing_date);
  const end = ts(s.next_billing_date);
  return s.status === "active" && s.trial_period_days > 0 && start !== null && end !== null && end - start <= (s.trial_period_days + 1) * DAY;
}

function localStatus(s: Subscription): BillingStatus {
  switch (s.status) {
    case "active":
      return inTrial(s) ? "trialing" : "active";
    case "past_due":
    case "on_hold":
    case "paused":
    case "cancelled":
    case "expired":
      return s.status;
    case "failed":
      return "expired";
    case "pending":
      return "none";
  }
}

async function ownerOf(s: Subscription): Promise<string | null> {
  const fromMeta = s.metadata?.user_id;
  if (typeof fromMeta === "string" && fromMeta) return fromMeta;
  const [existing] = await db.select({ userId: subscriptions.userId }).from(subscriptions).where(eq(subscriptions.providerSubId, s.subscription_id));
  if (existing) return existing.userId;
  const [byEmail] = await db.select({ id: user.id }).from(user).where(eq(user.email, s.customer.email.toLowerCase()));
  return byEmail?.id ?? null;
}

export async function applySubscription(s: Subscription): Promise<string | null> {
  const plan = planForProduct(s.product_id);
  const userId = await ownerOf(s);
  if (!plan || !userId) {
    console.warn("[billing] ignoring subscription", s.subscription_id, { plan, userId });
    return null;
  }
  const status = localStatus(s);
  if (status === "none") return userId;

  const periodStart = ts(s.previous_billing_date);
  const periodEnd = ts(s.next_billing_date);
  const pending = s.scheduled_change ? planForProduct(s.scheduled_change.product_id) : null;
  const row = {
    userId,
    providerCustomerId: s.customer.customer_id,
    plan,
    status,
    trialEndsAt: status === "trialing" ? periodEnd : null,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: s.cancel_at_next_billing_date,
    pendingPlan: pending && pending !== plan ? pending : null,
    updatedAt: Date.now(),
  };
  await db
    .insert(subscriptions)
    .values({ id: newId(), providerSubId: s.subscription_id, ...row })
    .onConflictDoUpdate({ target: subscriptions.providerSubId, set: row });

  if (periodEnd && status === "trialing")
    await grantCycle(userId, { kind: "trial", ref: `${s.subscription_id}:trial`, credits: TRIAL.credits, chat: TRIAL.chat, expiresAt: periodEnd });
  else if (periodEnd && periodStart && status === "active") {
    const p = planDef(plan);
    // One bucket per cycle; an upgrade re-anchors the cycle, so it gets a fresh full allowance.
    await grantCycle(userId, { kind: "plan", ref: `${s.subscription_id}:${periodStart}`, credits: p.credits, chat: p.chat, expiresAt: periodEnd });
  }
  return userId;
}

/** Re-reads a subscription from Dodo and applies it. */
export async function syncSubscription(subscriptionId: string) {
  const s = await dodo.subscriptions.retrieve(subscriptionId);
  return { subscription: s, userId: await applySubscription(s) };
}
