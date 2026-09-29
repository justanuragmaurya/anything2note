import type { Metadata } from "next";
import { PLAN_KEYS, type PlanKey } from "@a2n/shared";
import { BillingView } from "@/components/app/billing/billing-view";

export const metadata: Metadata = { title: "Plan & billing" };

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BillingPage({ searchParams }: Props) {
  const sp = await searchParams;
  const plan = one(sp.plan);
  return (
    <BillingView
      // Dodo appends these when it sends the customer back from checkout.
      returned={{ subscriptionId: one(sp.subscription_id) ?? null, status: one(sp.status) ?? null }}
      // From the pricing page: start checkout for this plan straight away.
      startPlan={PLAN_KEYS.includes(plan as PlanKey) ? (plan as PlanKey) : null}
    />
  );
}
