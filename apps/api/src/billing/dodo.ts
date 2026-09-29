import { env } from "cloudflare:workers";
import DodoPayments from "dodopayments";
import type { PlanKey } from "@a2n/shared";

/*
 * Dodo Payments (plan.md §8). Test mode everywhere except NODE_ENV=prod/production, which uses the
 * live keys and live product ids. Product ids aren't secret, so they live here per mode.
 */

export const isProd = env.NODE_ENV === "prod" || env.NODE_ENV === "production";

const PRODUCTS: Record<"test" | "live", Record<PlanKey, string>> = {
  test: {
    starter: "pdt_0Noc1n4shtxqMu16GFjfz",
    plus: "pdt_0Noc1yhTm4LQ22RHKJJYa",
    pro: "pdt_0Noc291qks8TvTylKLeMO",
  },
  live: {
    starter: "pdt_0Nobpl5swB5odlpBFbiy3",
    plus: "pdt_0Nobq2nHOc90F18KjBWzJ",
    pro: "pdt_0NobqEzCVYtTJnSKkrVir",
  },
};

const products = PRODUCTS[isProd ? "live" : "test"];

export const productFor = (plan: PlanKey) => products[plan];

export function planForProduct(productId: string): PlanKey | null {
  const hit = Object.entries(products).find(([, id]) => id === productId);
  return (hit?.[0] as PlanKey | undefined) ?? null;
}

export const dodo = new DodoPayments({
  bearerToken: isProd ? env.DODO_PAYMENTS_LIVE_API_KEY : env.DODO_PAYMENTS_TEST_API_KEY,
  webhookKey: (isProd ? env.DODO_PAYMENTS_LIVE_WEBHOOK_KEY : env.DODO_PAYMENTS_TEST_WEBHOOK_KEY) || null,
  environment: isProd ? "live_mode" : "test_mode",
});
