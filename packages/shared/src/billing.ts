/* ───────────── Plans & credits (plan.md §8) ───────────── */

export type PlanKey = "starter" | "plus" | "pro";

export type PlanDef = {
  key: PlanKey;
  name: string;
  /** USD per month */
  price: number;
  /** Credits granted every billing cycle. 1 credit = 1 media minute or 1 document page. */
  credits: number;
  /** AI chat messages included per cycle; after that each message costs 1 credit. */
  chat: number;
  /** Longest single recording or video, in seconds */
  maxMediaSeconds: number;
  blurb: string;
  features: string[];
};

export const PLANS: PlanDef[] = [
  {
    key: "starter",
    name: "Starter",
    price: 9,
    credits: 1200,
    chat: 300,
    maxMediaSeconds: 2 * 3600,
    blurb: "For a couple of courses a term.",
    features: ["1,200 credits a month (~20 h of audio or 1,200 pages)", "300 AI chat messages a month", "Recordings up to 2 hours", "All note types, flashcards, quizzes & tasks"],
  },
  {
    key: "plus",
    name: "Plus",
    price: 19,
    credits: 3000,
    chat: 1500,
    maxMediaSeconds: 4 * 3600,
    blurb: "For a full semester of lectures.",
    features: ["3,000 credits a month (~50 h of audio or 3,000 pages)", "1,500 AI chat messages a month", "Recordings up to 4 hours", "Everything in Starter"],
  },
  {
    key: "pro",
    name: "Pro",
    price: 29,
    credits: 5000,
    chat: 2000,
    maxMediaSeconds: 6 * 3600,
    blurb: "For exam season, research and heavy weeks.",
    features: ["5,000 credits a month (~83 h of audio or 5,000 pages)", "2,000 AI chat messages a month", "Recordings up to 6 hours", "Everything in Plus"],
  },
];

export const PLAN_KEYS = PLANS.map((p) => p.key) as PlanKey[];
export const planDef = (key: PlanKey): PlanDef => PLANS.find((p) => p.key === key)!;

/** Every plan starts with a 7-day trial (card required), capped so a trial can't burn a full month. */
export const TRIAL = { days: 7, credits: 150, chat: 30 } as const;

/** Pasted text and web articles count one page per this many characters. */
export const CHARS_PER_PAGE = 3000;

/**
 * - none: never subscribed · trialing: in the free trial · active: paid and renewing
 * - past_due: renewal failed, still in the grace period · on_hold: renewal failed, access paused
 * - cancelled: won't renew (usable until the period ends) · expired: ended
 */
export type BillingStatus = "none" | "trialing" | "active" | "past_due" | "on_hold" | "paused" | "cancelled" | "expired";

export type Billing = {
  plan: PlanKey | null;
  status: BillingStatus;
  /** Can add items and chat right now */
  canUse: boolean;
  /** A trial has been used on this account, so new checkouts start paid */
  hadTrial: boolean;
  trialEndsAt: number | null;
  /** When the current cycle ends (next renewal or trial end) */
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  /** A downgrade that applies at the next renewal */
  pendingPlan: PlanKey | null;
  credits: {
    /** Everything spendable now */
    balance: number;
    /** Granted for this cycle (trial or plan) */
    cycleGranted: number;
    cycleRemaining: number;
    topupRemaining: number;
  };
  chat: { allowance: number; remaining: number };
};

/** POST /api/billing/checkout */
export type CheckoutRequest = { plan: PlanKey };
export type CheckoutResponse = { url: string };

/** POST /api/billing/change-plan */
export type ChangePlanRequest = { plan: PlanKey };

/** POST /api/billing/sync — after returning from checkout */
export type BillingSyncRequest = { subscriptionId: string };

/** POST /api/billing/portal */
export type PortalResponse = { url: string };

export type BillingResponse = { billing: Billing };
