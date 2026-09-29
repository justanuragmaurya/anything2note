import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { planDef, type Billing, type BillingStatus, type PlanKey } from "@a2n/shared";
import { creditBuckets, creditLedger, subscriptions } from "../db/schema";
import { db, newId } from "../lib/http";

/*
 * Credits (plan.md §8). A bucket is one grant (trial, plan cycle or top-up). Spending takes from the
 * trial/plan bucket first, then top-ups, soonest-expiring first; every change gets a ledger row.
 */

type Sub = typeof subscriptions.$inferSelect;
type Bucket = typeof creditBuckets.$inferSelect;

const LIVE: BillingStatus[] = ["trialing", "active", "past_due", "on_hold", "paused"];
const isCycle = (b: Bucket) => b.kind === "trial" || b.kind === "plan";

async function batch(ops: BatchItem<"sqlite">[]) {
  if (ops.length) await db.batch(ops as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}

/** The live subscription if there is one, otherwise the most recent. */
export async function currentSubscription(userId: string): Promise<Sub | null> {
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.updatedAt));
  return rows.find((r) => LIVE.includes(r.status as BillingStatus)) ?? rows[0] ?? null;
}

export function canUse(sub: Sub | null, now = Date.now()): boolean {
  if (!sub) return false;
  if (sub.status === "trialing" || sub.status === "active" || sub.status === "past_due") return true;
  // Cancelled subscriptions keep working until the period they paid for ends.
  return sub.status === "cancelled" && (sub.currentPeriodEnd ?? 0) > now;
}

async function liveBuckets(userId: string, now = Date.now()) {
  const rows = await db
    .select()
    .from(creditBuckets)
    .where(and(eq(creditBuckets.userId, userId), gt(creditBuckets.expiresAt, now)));
  // Trial/plan credits first, then top-ups; soonest-expiring first within each.
  return rows.sort((a, b) => Number(isCycle(b)) - Number(isCycle(a)) || a.expiresAt - b.expiresAt);
}

export async function billingFor(userId: string): Promise<Billing> {
  const [sub, buckets] = await Promise.all([currentSubscription(userId), liveBuckets(userId)]);
  const hadTrial = (await db.select({ id: creditBuckets.id }).from(creditBuckets).where(and(eq(creditBuckets.userId, userId), eq(creditBuckets.kind, "trial"))).limit(1)).length > 0;
  const cycle = buckets.find(isCycle);
  const topup = buckets.filter((b) => b.kind === "topup").reduce((n, b) => n + b.remaining, 0);
  const usable = canUse(sub);
  return {
    plan: (sub?.plan as PlanKey | undefined) ?? null,
    status: (sub?.status as BillingStatus | undefined) ?? "none",
    canUse: usable,
    hadTrial,
    trialEndsAt: sub?.status === "trialing" ? sub.trialEndsAt : null,
    periodEnd: sub?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    pendingPlan: (sub?.pendingPlan as PlanKey | null | undefined) ?? null,
    credits: {
      balance: usable ? (cycle?.remaining ?? 0) + topup : 0,
      cycleGranted: cycle?.granted ?? (sub ? planDef(sub.plan as PlanKey).credits : 0),
      cycleRemaining: cycle?.remaining ?? 0,
      topupRemaining: topup,
    },
    chat: { allowance: cycle?.chatGranted ?? 0, remaining: usable ? (cycle?.chatRemaining ?? 0) : 0 },
  };
}

/** Spendable credits right now (0 without a usable plan). */
export async function balanceOf(userId: string): Promise<number> {
  if (!canUse(await currentSubscription(userId))) return 0;
  return (await liveBuckets(userId)).reduce((n, b) => n + b.remaining, 0);
}

/** Takes `amount` credits across buckets. Returns false (and changes nothing) if there aren't enough. */
export async function spend(userId: string, amount: number, reason: "item" | "chat", opts: { sourceId?: string; meta?: object } = {}): Promise<boolean> {
  if (amount <= 0) return true;
  const buckets = (await liveBuckets(userId)).filter((b) => b.remaining > 0);
  if (buckets.reduce((n, b) => n + b.remaining, 0) < amount) return false;
  const ops: BatchItem<"sqlite">[] = [];
  let left = amount;
  for (const b of buckets) {
    if (left === 0) break;
    const take = Math.min(b.remaining, left);
    left -= take;
    ops.push(db.update(creditBuckets).set({ remaining: sql`${creditBuckets.remaining} - ${take}` }).where(eq(creditBuckets.id, b.id)));
    ops.push(
      db.insert(creditLedger).values({
        id: newId(),
        userId,
        bucketId: b.id,
        delta: -take,
        reason,
        sourceId: opts.sourceId ?? null,
        metaJson: opts.meta ? JSON.stringify(opts.meta) : null,
      }),
    );
  }
  await batch(ops);
  return true;
}

async function itemRows(sourceId: string) {
  return db
    .select({ bucketId: creditLedger.bucketId, delta: creditLedger.delta })
    .from(creditLedger)
    .where(and(eq(creditLedger.sourceId, sourceId), inArray(creditLedger.reason, ["item", "item_refund"])));
}

/** Net credits currently charged for a source (so a retry doesn't charge twice). */
export async function chargedFor(sourceId: string): Promise<number> {
  return -(await itemRows(sourceId)).reduce((n, r) => n + r.delta, 0);
}

/** Gives back everything charged for a source, to the buckets it came from. */
export async function refundItem(userId: string, sourceId: string) {
  const net = new Map<string, number>();
  for (const r of await itemRows(sourceId)) if (r.bucketId) net.set(r.bucketId, (net.get(r.bucketId) ?? 0) + r.delta);
  const ops: BatchItem<"sqlite">[] = [];
  for (const [bucketId, delta] of net) {
    if (delta >= 0) continue;
    ops.push(db.update(creditBuckets).set({ remaining: sql`${creditBuckets.remaining} + ${-delta}` }).where(eq(creditBuckets.id, bucketId)));
    ops.push(db.insert(creditLedger).values({ id: newId(), userId, bucketId, delta: -delta, reason: "item_refund", sourceId }));
  }
  await batch(ops);
}

/** Whether one more chat message is allowed: plan allowance first, then 1 credit. */
export async function canChat(userId: string): Promise<boolean> {
  const b = await billingFor(userId);
  return b.canUse && (b.chat.remaining > 0 || b.credits.balance >= 1);
}

/** Records one chat message against the allowance, or 1 credit once it's used up. */
export async function consumeChat(userId: string) {
  const cycle = (await liveBuckets(userId)).find((b) => isCycle(b) && b.chatRemaining > 0);
  if (cycle) {
    await db.update(creditBuckets).set({ chatRemaining: sql`${creditBuckets.chatRemaining} - 1` }).where(eq(creditBuckets.id, cycle.id));
    return;
  }
  await spend(userId, 1, "chat");
}

/**
 * Grants a trial or plan cycle once (keyed by `ref`) and closes any earlier trial/plan bucket, so
 * an upgrade or renewal replaces the old allowance instead of stacking on it.
 */
export async function grantCycle(userId: string, g: { kind: "trial" | "plan"; ref: string; credits: number; chat: number; expiresAt: number }) {
  const id = newId();
  const inserted = await db
    .insert(creditBuckets)
    .values({ id, userId, kind: g.kind, granted: g.credits, remaining: g.credits, chatGranted: g.chat, chatRemaining: g.chat, expiresAt: g.expiresAt, ref: g.ref })
    .onConflictDoNothing()
    .returning({ id: creditBuckets.id });
  if (!inserted.length) return;
  const now = Date.now();
  const old = (await liveBuckets(userId, now)).filter((b) => isCycle(b) && b.id !== id);
  await batch([
    db.insert(creditLedger).values({ id: newId(), userId, bucketId: id, delta: g.credits, reason: "grant" }),
    ...old.flatMap((b) => [
      db.update(creditBuckets).set({ expiresAt: now }).where(eq(creditBuckets.id, b.id)),
      ...(b.remaining > 0 ? [db.insert(creditLedger).values({ id: newId(), userId, bucketId: b.id, delta: -b.remaining, reason: "expire" })] : []),
    ]),
  ]);
}

/** Why this account can't start new work right now, or null if it can. */
export function blockReason(b: Billing): { code: "NO_PLAN" | "NO_CREDITS"; message: string } | null {
  if (!b.canUse) {
    const message =
      b.status === "none"
        ? "Start your 7-day free trial to add notes."
        : b.status === "on_hold" || b.status === "past_due"
          ? "Your last payment didn't go through. Update your card in Plan & billing to keep going."
          : "Your plan has ended. Pick a plan in Plan & billing to keep going.";
    return { code: "NO_PLAN", message };
  }
  if (b.credits.balance <= 0) return { code: "NO_CREDITS", message: "You're out of credits for this cycle. Upgrade in Plan & billing, or wait for your plan to renew." };
  return null;
}
