import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { PLANS, TRIAL, type PlanKey } from "@a2n/shared";

// One price for everyone, in USD, billed monthly through Dodo Payments (plan.md §8).

/** Sign in (or skip it if already signed in), then go straight to checkout for this plan. */
export const planHref = (plan: PlanKey) => `/sign-in?next=${encodeURIComponent(`/app/billing?plan=${plan}`)}`;

const ORB: Record<PlanKey, string> = {
  starter: "bg-[image:var(--button-ink)] shadow-[var(--button-shadow)]",
  plus: "bg-[radial-gradient(circle_at_40%_40%,#ffd2b8,#f65f48_45%,#c8231a)] shadow-[0_0_18px_#f65f4866]",
  pro: "bg-[radial-gradient(circle_at_40%_40%,#f3e6ff,#8d5cf6_45%,#4b1fa8)] shadow-[0_0_18px_#8d5cf655]",
};

function Price({ value }: { value: number }) {
  return (
    <span className="inline-flex items-baseline text-[64px] leading-none font-normal tracking-[-0.06em] tabular-nums">
      ${value}
      <span className="text-line-strong">.00</span>
    </span>
  );
}

export function Pricing() {
  return (
    <div>
      {/* Yield Theory nested card */}
      <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-3 rounded-[46px] border border-line-strong bg-panel p-3.5 md:grid-cols-3">
        {PLANS.map((p) => {
          const featured = p.key === "plus";
          return (
            <div key={p.key} className={`relative flex flex-col rounded-[34px] p-7 ${featured ? "bg-card shadow-[0_1px_8px_rgba(60,20,10,0.04)]" : ""}`}>
              {featured && <span className="absolute top-7 right-7 rounded-lg border border-line px-2.5 py-1 text-[11px] text-ink-soft">✦ Most popular</span>}
              <span className={`grid size-8 place-items-center rounded-lg ${ORB[p.key]}`}>
                {p.key === "starter" && <span className="size-2.5 rounded-full bg-cream shadow-[0_0_10px_2px_#fff8]" />}
              </span>
              <h3 className="mt-7 text-[21px] tracking-[-0.035em]">{p.name}</h3>
              <p className="mt-1 text-sm text-muted">{p.blurb}</p>
              <div className="mt-6">
                <Price value={p.price} />
                <span className="ml-2 text-sm text-muted">/month</span>
              </div>
              <p className="mt-3 text-xs text-muted">
                {TRIAL.days} days free, then billed monthly. Cancel anytime.
              </p>
              <ul className={`mt-8 flex flex-1 flex-col gap-3 border-t pt-6 text-sm ${featured ? "border-line" : "border-line-strong/70"}`}>
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className={`mt-0.5 size-4 shrink-0 ${featured ? "text-red-500" : "text-ink-soft"}`} /> {f}
                  </li>
                ))}
              </ul>
              <Link href={planHref(p.key)} className={`btn mt-10 w-full ${featured ? "btn-red" : "btn-ghost bg-card/50"}`}>
                Start free trial
                <ArrowUpRight className="btn-arrow size-4" />
              </Link>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-[12px] text-muted">
        Card required for the trial; you’re not charged until day {TRIAL.days + 1}. Billed in USD through Dodo Payments.
      </p>
    </div>
  );
}
