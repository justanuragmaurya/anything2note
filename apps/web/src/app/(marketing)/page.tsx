import { Hero } from "@/components/site/hero";
import { Marquee } from "@/components/site/marquee";
import { SectionHeading } from "@/components/site/section-heading";
import { SourcesFlow } from "@/components/site/sources-flow";
import { FeatureCards } from "@/components/site/feature-cards";
import { NoteTypeCards } from "@/components/site/note-type-cards";
import { WorkspacePreview } from "@/components/site/workspace-preview";
import { NightSection } from "@/components/site/night-section";
import { Personas } from "@/components/site/personas";
import { Pricing } from "@/components/site/pricing";
import { Faq } from "@/components/site/faq";
import { CtaPanel } from "@/components/site/cta-panel";
import { Reveal } from "@/components/ui/reveal";

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />

      <section id="how" className="scroll-mt-24 px-6 pt-28 pb-24">
        <SectionHeading
          eyebrow="001 · How it works"
          title={
            <>
              Drop it in. We <span className="serif-accent text-red-500">connect the dots.</span>
            </>
          }
          sub="Every source becomes one clean, timestamped transcript or page-by-page text. Then the right outputs are generated for what it actually is."
        />
        <Reveal delay={150} className="mt-16">
          <SourcesFlow />
        </Reveal>
      </section>

      <section id="features" className="scroll-mt-24 mx-auto max-w-[1100px] px-6 pb-28">
        <FeatureCards />
      </section>

      <section id="note-types" className="scroll-mt-24 border-t border-line bg-paper-glow/60 px-6 py-28">
        <div className="mx-auto max-w-[1200px]">
          <SectionHeading
            eyebrow="002 · Note types"
            title={
              <>
                Seven kinds of content. <span className="serif-accent">Seven kinds of notes.</span>
              </>
            }
            sub="A lecture needs flashcards. A meeting needs minutes. Pick a type — or let us detect it — and get outputs that fit. Add or remove any output, any time."
          />
          <div className="mt-16">
            <NoteTypeCards />
          </div>
        </div>
      </section>

      <section className="px-6 py-28">
        <div className="mx-auto max-w-[1160px]">
          <SectionHeading
            eyebrow="003 · The workspace"
            title={
              <>
                Every line links back to <span className="serif-accent text-red-500">the moment</span> it was said.
              </>
            }
            sub="Click a timestamp to jump the player. Flip a card. Tick an action item. Ask the assistant. Try it — this one's live."
          />
          <Reveal delay={150} className="mt-14">
            <WorkspacePreview />
          </Reveal>
        </div>
      </section>

      <NightSection />

      <section className="px-6 py-28">
        <SectionHeading
          eyebrow="People, before notebooks"
          title={
            <>
              Built for whoever&apos;s <span className="serif-accent">taking notes.</span>
            </>
          }
          sub="Different days. Different sources. The same problem: too much to remember."
        />
        <div className="mt-16">
          <Personas />
        </div>
      </section>

      <section id="pricing" className="scroll-mt-24 px-6 pt-12 pb-28">
        <SectionHeading
          eyebrow="004 · Pricing"
          title="Start free. Upgrade when it sticks."
          sub="Priced by minutes and pages — so you only pay for what you actually feed it."
        />
        <Reveal delay={120} className="mt-12">
          <Pricing />
        </Reveal>
      </section>

      <section id="faq" className="scroll-mt-24 px-6 pb-32">
        <SectionHeading
          title="Frequently asked questions"
          sub={
            <>
              A little clarity before you start. Still stuck?{" "}
              <a href="mailto:hello@anything2note.com" className="link-underline text-ink">
                Write to us.
              </a>
            </>
          }
        />
        <div className="mt-12">
          <Faq />
        </div>
      </section>

      <section className="pb-24">
        <CtaPanel />
      </section>
    </>
  );
}
