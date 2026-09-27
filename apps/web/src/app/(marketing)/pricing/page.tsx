import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, FileText, Globe2, Receipt, RotateCcw, Timer } from "lucide-react";
import { Pricing } from "@/components/site/pricing";
import { SectionHeading } from "@/components/site/section-heading";
import { CtaPanel } from "@/components/site/cta-panel";
import { Reveal } from "@/components/ui/reveal";
import { Accordion } from "@/components/marketing/accordion";
import { ComparisonTable } from "@/components/marketing/comparison-table";
import { PageHero } from "@/components/marketing/page-hero";
import { AppleLogo, PlayLogo } from "@/components/marketing/brand-icons";
import { BILLING_FAQ, COUNTING } from "@/lib/mock/marketing-pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "anything2note is free to start: 120 media minutes and 50 document pages a month. Pro gives you 2,000 of each, speaker labels, exports and share links. Pay in INR or USD.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing · anything2note",
    description: "Start free. Upgrade when it sticks. Priced by minutes and pages, in INR or USD.",
    url: "/pricing",
  },
};

const COUNT_ICONS = [Timer, FileText, RotateCcw];

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title={
          <>
            Start free. Upgrade when it <span className="serif-accent text-red-500">sticks.</span>
          </>
        }
        sub="Priced by minutes and pages, so you only pay for what you actually feed it. Every note type and every output is on both plans."
        className="!pb-10"
      />

      <section className="px-6 pb-10">
        <Reveal delay={120}>
          <Pricing />
        </Reveal>
        <Reveal delay={200}>
          <ul className="mx-auto mt-8 flex max-w-[1040px] flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-muted">
            <li className="flex items-center gap-2">
              <Receipt className="size-3.5" /> INR prices include GST
            </li>
            <li className="flex items-center gap-2">
              <Globe2 className="size-3.5" /> Local taxes handled at checkout
            </li>
            <li className="flex items-center gap-2">
              <CreditCard className="size-3.5" /> Cancel anytime
            </li>
            <li>
              <Link href="/refunds" className="link-underline text-ink-soft">
                Refund policy
              </Link>
            </li>
          </ul>
        </Reveal>
      </section>

      {/* Comparison */}
      <section id="compare" className="scroll-mt-24 px-6 pt-20 pb-28">
        <SectionHeading
          eyebrow="001 · Compare"
          title={
            <>
              Everything in each plan, <span className="serif-accent">line by line.</span>
            </>
          }
        />
        <Reveal delay={120} className="mx-auto mt-12 max-w-[900px]">
          <ComparisonTable />
        </Reveal>
      </section>

      {/* How usage is counted */}
      <section className="border-t border-line bg-paper-glow/60 px-6 py-28">
        <div className="mx-auto max-w-[1100px]">
          <SectionHeading
            eyebrow="002 · Usage"
            title={
              <>
                How minutes &amp; pages are <span className="serif-accent text-red-500">counted</span>
              </>
            }
            sub="No credits, no tokens, no maths. You're charged once for the source, by how long or how long-winded it is."
          />
          <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
            {COUNTING.map((c, i) => {
              const Icon = COUNT_ICONS[i]!;
              return (
                <Reveal key={c.kicker} delay={i * 90}>
                  <article className="group lift grain flex h-full flex-col rounded-[6px] p-6 shadow-[0_1px_2px_rgba(60,20,10,0.12)]" style={{ background: c.color }}>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[10px] tracking-[0.14em] text-ink/60 uppercase">{c.kicker}</p>
                      <Icon className="size-5 text-ink transition-transform duration-500 ease-[var(--ease-spring)] group-hover:rotate-12" strokeWidth={1.5} />
                    </div>
                    <h3 className="serif-accent mt-8 text-[28px] leading-[1.05] text-ink not-italic">{c.title}</h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{c.body}</p>
                    <p className="mt-auto pt-8">
                      <span className="block border-t border-ink/15 pt-4 font-mono text-[11px] tracking-[0.06em] text-ink/80">{c.example}</span>
                    </p>
                  </article>
                </Reveal>
              );
            })}
          </div>

          {/* Mobile subscriptions */}
          <Reveal delay={120} className="mt-6">
            <div className="relative overflow-hidden rounded-[18px] bg-night text-night-text">
              <div aria-hidden className="dots-night absolute inset-y-0 left-0 w-4 md:w-8" />
              <div aria-hidden className="dots-night absolute inset-y-0 right-0 w-4 md:w-8" />
              <div aria-hidden className="dashed-rail absolute inset-y-0 left-4 w-px md:left-8" />
              <div aria-hidden className="dashed-rail absolute inset-y-0 right-4 w-px md:right-8" />
              <div className="flex flex-col gap-8 px-9 py-10 md:flex-row md:items-center md:justify-between md:px-16">
                <div className="max-w-[520px]">
                  <p className="eyebrow !text-night-muted">On your phone</p>
                  <h3 className="mt-3 text-[26px] leading-tight tracking-[-0.03em]">
                    Subscribed in the App Store or Google Play? <span className="serif-accent text-red-400">It works here too.</span>
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-night-muted">
                    One account, one plan, on web, iOS and Android. In-app subscriptions are billed and refunded by Apple or
                    Google, so manage or cancel them in your store account. Store prices can be slightly higher to cover store
                    fees.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col">
                  <span className="inline-flex items-center gap-3 rounded-xl border border-night-line bg-night-2 px-4 py-2.5 transition-colors duration-200 hover:border-night-muted/50">
                    <AppleLogo className="size-6 text-night-text" />
                    <span className="leading-tight">
                      <span className="block text-[10px] text-night-muted">Subscribe on</span>
                      <span className="block text-[15px] font-medium">App Store</span>
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-3 rounded-xl border border-night-line bg-night-2 px-4 py-2.5 transition-colors duration-200 hover:border-night-muted/50">
                    <PlayLogo className="size-6" />
                    <span className="leading-tight">
                      <span className="block text-[10px] text-night-muted">Subscribe on</span>
                      <span className="block text-[15px] font-medium">Google Play</span>
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Billing FAQ */}
      <section id="billing-faq" className="scroll-mt-24 px-6 py-28">
        <SectionHeading
          eyebrow="003 · Billing"
          title="Billing questions"
          sub={
            <>
              Anything else about payments?{" "}
              <a href="mailto:billing@anything2note.com" className="link-underline text-ink">
                billing@anything2note.com
              </a>
            </>
          }
        />
        <Reveal delay={120} className="mt-10">
          <Accordion items={BILLING_FAQ} />
        </Reveal>
      </section>

      <section className="pb-24">
        <CtaPanel />
      </section>
    </>
  );
}
