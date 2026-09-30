import { env } from "cloudflare:workers";
import { and, desc, eq, lt } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { z } from "zod";
import DodoPayments from "dodopayments";
import { PLAN_KEYS, planDef, type BillingResponse, type CheckoutResponse, type CreditEntry, type CreditHistoryResponse, type PlanKey, type PortalResponse } from "@a2n/shared";
import { billingFor, currentSubscription } from "../billing/credits";
import { dodo, productFor } from "../billing/dodo";
import { applySubscription, syncSubscription } from "../billing/subscriptions";
import { billingEvents, creditBuckets, creditLedger, sources, userSources } from "../db/schema";
import { db, fail, type AppEnv } from "../lib/http";
import { parseJson, type SourceMeta } from "./serialize";

/* Plans, checkout and the customer portal (plan.md §8). Everything goes through Dodo Payments. */

export const billing = new Hono<AppEnv>();

const planSchema = z.enum(PLAN_KEYS as [PlanKey, ...PlanKey[]]);
const RETURN_PATH = "/app/billing";

/** Dodo errors become a 502 the client can show; our own HttpErrors pass through. */
async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DodoPayments.APIError) {
      console.error("[billing] dodo", e.status, e.message);
      if (e.status === 404) throw fail(404, "NOT_FOUND", "We couldn't find that subscription.");
      throw fail(502, "BILLING_ERROR", "The payment provider didn't respond as expected. Try again in a moment.");
    }
    throw e;
  }
}

const respond = async (c: Context<AppEnv>) => c.json({ billing: await billingFor(c.get("user").id) } satisfies BillingResponse);

billing.get("/billing", respond);

billing.post("/billing/checkout", async (c) => {
  const user = c.get("user");
  const { plan } = z.object({ plan: planSchema }).parse(await c.req.json());
  const sub = await currentSubscription(user.id);
  if (sub && ["trialing", "active", "past_due", "on_hold", "paused"].includes(sub.status))
    throw fail(409, "ALREADY_SUBSCRIBED", "You already have a plan. Change it from Plan & billing instead.");
  // One trial per account: anyone who has subscribed before starts paid. Otherwise the product's
  // 7-day trial applies (and Dodo's own trial-misuse check still runs).
  const { hadTrial } = await billingFor(user.id);
  const session = await call(() =>
    dodo.checkoutSessions.create({
      product_cart: [{ product_id: productFor(plan), quantity: 1 }],
      customer: sub ? { customer_id: sub.providerCustomerId } : { email: user.email, name: user.name || null },
      metadata: { user_id: user.id, plan },
      return_url: `${env.WEB_ORIGIN}${RETURN_PATH}`,
      ...(hadTrial || sub ? { subscription_data: { trial_period_days: 0 } } : {}),
    }),
  );
  if (!session.checkout_url) throw fail(502, "BILLING_ERROR", "Checkout didn't start. Try again.");
  return c.json({ url: session.checkout_url } satisfies CheckoutResponse);
});

/** Called when the user lands back from checkout, so the plan shows up without waiting for the webhook. */
billing.post("/billing/sync", async (c) => {
  const user = c.get("user");
  const { subscriptionId } = z.object({ subscriptionId: z.string().min(1).max(100).optional() }).parse(await c.req.json().catch(() => ({})));
  const id = subscriptionId ?? (await currentSubscription(user.id))?.providerSubId;
  if (id) {
    const s = await call(() => dodo.subscriptions.retrieve(id));
    const owner = s.metadata?.user_id;
    const mine = typeof owner === "string" && owner ? owner === user.id : s.customer.email.toLowerCase() === user.email.toLowerCase();
    if (!mine) throw fail(404, "NOT_FOUND", "We couldn't find that subscription.");
    await applySubscription(s);
  }
  return respond(c);
});

billing.post("/billing/change-plan", async (c) => {
  const user = c.get("user");
  const { plan } = z.object({ plan: planSchema }).parse(await c.req.json());
  const sub = await currentSubscription(user.id);
  if (!sub || !["trialing", "active"].includes(sub.status)) throw fail(409, "NO_PLAN", "You don't have an active plan to change.");
  const current = sub.plan as PlanKey;
  const productId = productFor(plan);

  if (plan === current) {
    // Picking the current plan again undoes a scheduled downgrade.
    if (sub.pendingPlan)
      await call(() => dodo.subscriptions.changePlan(sub.providerSubId, { product_id: productId, quantity: 1, proration_billing_mode: "do_not_bill", cancel_scheduled_change_plan: true }));
  } else if (sub.status === "trialing") {
    // Nothing has been charged yet: switch now, and the first charge at trial end uses the new price.
    await call(() => dodo.subscriptions.changePlan(sub.providerSubId, { product_id: productId, quantity: 1, proration_billing_mode: "do_not_bill" }));
  } else if (planDef(plan).price > planDef(current).price) {
    // Upgrade: charged now (unused time credited), new cycle and full new allowance from today.
    await call(() =>
      dodo.subscriptions.changePlan(sub.providerSubId, { product_id: productId, quantity: 1, proration_billing_mode: "prorated_immediately", on_payment_failure: "prevent_change" }),
    );
  } else {
    // Downgrade: keep the current plan until the paid period ends.
    await call(() => dodo.subscriptions.changePlan(sub.providerSubId, { product_id: productId, quantity: 1, proration_billing_mode: "do_not_bill", effective_at: "next_billing_date" }));
  }
  await call(() => syncSubscription(sub.providerSubId));
  return respond(c);
});

const PAGE = 50;

/**
 * GET /billing/credits?before= (CreditHistoryResponse). One charge can take from two buckets (plan
 * credits, then a top-up), which writes a ledger row each; those show as one entry.
 */
billing.get("/billing/credits", async (c) => {
  const user = c.get("user");
  const { before } = z.object({ before: z.coerce.number().int().positive().optional() }).parse(c.req.query());
  const rows = await db
    .select({
      l: creditLedger,
      bucketKind: creditBuckets.kind,
      title: sources.title,
      meta: sources.metaJson,
      override: userSources.titleOverride,
      inLibrary: userSources.sourceId,
    })
    .from(creditLedger)
    .leftJoin(creditBuckets, eq(creditBuckets.id, creditLedger.bucketId))
    .leftJoin(sources, eq(sources.id, creditLedger.sourceId))
    .leftJoin(userSources, and(eq(userSources.sourceId, creditLedger.sourceId), eq(userSources.userId, user.id)))
    .where(and(eq(creditLedger.userId, user.id), before ? lt(creditLedger.createdAt, before) : undefined))
    .orderBy(desc(creditLedger.createdAt), desc(creditLedger.id))
    .limit(PAGE * 2 + 1);

  const entries: (CreditEntry & { last: number; sourceId: string | null })[] = [];
  let used = 0;
  for (const r of rows) {
    const prev = entries.at(-1);
    const sameCharge = prev && r.l.reason !== "grant" && r.l.reason !== "expire" && prev.reason === r.l.reason && prev.sourceId === r.l.sourceId && prev.last - r.l.createdAt < 1000;
    // Stop at 50 entries, but never between rows with the same timestamp (the next page starts strictly before it).
    if (!sameCharge && entries.length >= PAGE && r.l.createdAt !== prev?.last) break;
    used++;
    if (sameCharge) {
      prev.delta += r.l.delta;
      prev.last = r.l.createdAt;
      continue;
    }
    const item = parseJson<{ minutes?: number; pages?: number }>(r.l.metaJson);
    const reason = r.l.reason === "grant" && r.bucketKind === "topup" ? "topup" : (r.l.reason as CreditEntry["reason"]);
    entries.push({
      id: r.l.id,
      at: r.l.createdAt,
      last: r.l.createdAt,
      sourceId: r.l.sourceId,
      delta: r.l.delta,
      reason,
      ...(r.l.sourceId && {
        itemId: r.inLibrary ? r.l.sourceId : undefined,
        itemTitle: r.override ?? r.title ?? parseJson<SourceMeta>(r.meta)?.label ?? undefined,
      }),
      ...(r.l.reason === "item" && { minutes: item?.minutes || undefined, pages: item?.pages || undefined }),
    });
  }
  const more = used < rows.length || rows.length === PAGE * 2 + 1;
  const body: CreditHistoryResponse = {
    entries: entries.map(({ last: _last, sourceId: _sourceId, ...e }) => e),
    next: more ? entries.at(-1)!.last : null,
  };
  return c.json(body);
});

/** Dodo's customer portal: payment method, invoices and cancellation. */
billing.post("/billing/portal", async (c) => {
  const sub = await currentSubscription(c.get("user").id);
  if (!sub) throw fail(404, "NO_PLAN", "There's no billing account yet. Pick a plan first.");
  const { link } = await call(() => dodo.customers.customerPortal.create(sub.providerCustomerId, { return_url: `${env.WEB_ORIGIN}${RETURN_PATH}` }));
  return c.json({ url: link } satisfies PortalResponse);
});

/** POST /webhooks/dodo — signed with Standard Webhooks; retried by Dodo until we return 2xx. */
export async function dodoWebhook(c: Context) {
  const body = await c.req.text();
  const id = c.req.header("webhook-id") ?? "";
  let event: ReturnType<typeof dodo.webhooks.unwrap>;
  try {
    event = dodo.webhooks.unwrap(body, {
      headers: { "webhook-id": id, "webhook-signature": c.req.header("webhook-signature") ?? "", "webhook-timestamp": c.req.header("webhook-timestamp") ?? "" },
    });
  } catch (e) {
    console.warn("[billing] rejected webhook (check DODO_PAYMENTS_*_WEBHOOK_KEY)", e instanceof Error ? e.message : e);
    return c.json({ error: { code: "INVALID_SIGNATURE", message: "Invalid webhook signature." } }, 401);
  }
  const [seen] = await db.select({ id: billingEvents.id }).from(billingEvents).where(eq(billingEvents.id, id));
  if (seen) return c.json({ received: true });

  let userId: string | null = null;
  // Always re-read the subscription: events can arrive out of order, the API has the latest state.
  const subscriptionId = "subscription_id" in event.data ? event.data.subscription_id : null;
  if (event.type.startsWith("subscription.") && subscriptionId) userId = (await syncSubscription(subscriptionId)).userId;

  await db.insert(billingEvents).values({ id, type: event.type, userId, payloadJson: body }).onConflictDoNothing();
  return c.json({ received: true });
}
