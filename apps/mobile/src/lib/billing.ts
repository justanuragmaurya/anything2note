import { Linking } from "react-native";
import { planDef, type Billing, type CreditEntry } from "@a2n/shared";

/*
 * Plans are bought and managed on the web (plan.md §8); the app only shows what the API reports.
 */

const date = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function planTitle(b: Billing | undefined): string {
  if (!b) return "Your plan";
  if (!b.plan || b.status === "none") return "No plan yet";
  if (!b.canUse && b.status !== "on_hold" && b.status !== "past_due") return "Plan ended";
  return `${planDef(b.plan).name}${b.status === "trialing" ? " · trial" : " plan"}`;
}

export function planSubtitle(b: Billing): string {
  const end = b.periodEnd ? date(b.periodEnd) : null;
  switch (b.status) {
    case "none":
      return "Every plan starts with a 7-day free trial.";
    case "trialing":
      return `Free trial until ${end}`;
    case "active":
      return b.cancelAtPeriodEnd ? `Cancelled · works until ${end}` : `Credits reset ${end}`;
    case "past_due":
    case "on_hold":
      return "Payment failed · update your card on the web";
    case "paused":
      return "Paused · resume it on the web";
    case "cancelled":
      return b.canUse ? `Cancelled · works until ${end}` : "Your plan has ended";
    default:
      return "Your plan has ended";
  }
}

/** The web app's origin (apps/web), where plans are bought and managed. */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://anything2note.com").replace(/\/$/, "");

/** Plan & billing on the web, in the browser (sign in there with the same account). */
export const openWebBilling = () => Linking.openURL(`${WEB_URL}/app/billing`);

/** A line in the credit history: what the credits were for. */
export function creditLabel(e: CreditEntry): string {
  switch (e.reason) {
    case "grant":
      return "Credits for this cycle";
    case "topup":
      return "Top-up";
    case "expire":
      return "Unused credits expired";
    case "chat":
      return "AI chat";
    case "item_refund":
      return `Refund · ${e.itemTitle ?? "an item that failed"}`;
    default: {
      const size = e.minutes ? `${e.minutes} min` : e.pages ? `${e.pages} ${e.pages === 1 ? "page" : "pages"}` : null;
      return [e.itemTitle ?? "Deleted item", size].filter(Boolean).join(" · ");
    }
  }
}
