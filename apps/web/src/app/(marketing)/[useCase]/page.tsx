import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Brain,
  Eye,
  FileText,
  Languages,
  Layers,
  ListOrdered,
  Quote,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  Tag,
  Terminal,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "@/components/site/section-heading";
import { CtaPanel } from "@/components/site/cta-panel";
import { NoteTypeShape } from "@/components/site/note-type-shape";
import { CornerFrame } from "@/components/ui/corner-frame";
import { Reveal } from "@/components/ui/reveal";
import { Accordion } from "@/components/marketing/accordion";
import { SampleDocument } from "@/components/marketing/sample-document";
import { UseCaseHero } from "@/components/marketing/use-case-hero";
import { getUseCase, USE_CASE_SLUGS, USE_CASES, type BenefitIcon } from "@/lib/mock/marketing-use-cases";
import { noteType, OUTPUT_LABELS } from "@/lib/mock/note-types";

type Props = { params: Promise<{ useCase: string }> };

const BENEFIT_ICONS: Record<BenefitIcon, LucideIcon> = {
  users: Users,
  shield: ShieldCheck,
  send: Send,
  timer: Timer,
  brain: Brain,
  languages: Languages,
  list: ListOrdered,
  file: FileText,
  search: Search,
  quote: Quote,
  tag: Tag,
  scan: ScanLine,
  eye: Eye,
  layers: Layers,
  terminal: Terminal,
  bookmark: Bookmark,
};

export function generateStaticParams() {
  return USE_CASE_SLUGS.map((useCase) => ({ useCase }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { useCase } = await params;
  const uc = getUseCase(useCase);
  if (!uc) return {};
  return {
    title: uc.metaTitle,
    description: uc.metaDescription,
    keywords: uc.keywords,
    alternates: { canonical: `/${uc.slug}` },
    openGraph: {
      type: "website",
      url: `/${uc.slug}`,
      title: `${uc.metaTitle} · anything2note`,
      description: uc.metaDescription,
      siteName: "anything2note",
    },
    twitter: { card: "summary_large_image", title: uc.metaTitle, description: uc.metaDescription },
  };
}

export default async function UseCasePage({ params }: Props) {
  const { useCase } = await params;
  const uc = getUseCase(useCase);
  if (!uc) notFound();

  const nt = noteType(uc.noteType);
  const related = USE_CASE_SLUGS.filter((s) => s !== uc.slug).map((s) => USE_CASES[s]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: uc.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <UseCaseHero uc={uc} />

      {/* Benefits */}
      <section className="mx-auto max-w-[1100px] px-6 pt-4 pb-28">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
          {uc.benefits.map((b, i) => {
            const Icon = BENEFIT_ICONS[b.icon];
            return (
              <Reveal key={b.title} delay={i * 90}>
                <article className="group lift flex h-full flex-col rounded-[22px] border border-line bg-card p-7">
                  <div className="flex items-center justify-between">
                    <span
                      className="grain grid size-11 place-items-center rounded-xl text-ink transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-rotate-6"
                      style={{ background: nt.color }}
                    >
                      <Icon className="size-5" strokeWidth={1.5} />
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.14em] text-muted">0{i + 1}</span>
                  </div>
                  <h2 className="mt-8 text-[22px] leading-tight tracking-[-0.03em]">{b.title}</h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{b.body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Sample output */}
      <section id="sample" className="scroll-mt-24 border-t border-line bg-paper-glow/60 px-6 py-28">
        <div className="mx-auto max-w-[1160px]">
          <SectionHeading
            eyebrow="001 · Sample output"
            title={
              <>
                {uc.sampleTitle.before} <span className="serif-accent text-red-500">{uc.sampleTitle.accent}</span>
                {uc.sampleTitle.after ? ` ${uc.sampleTitle.after}` : ""}
              </>
            }
            sub={uc.sampleSub}
          />

          <div className="mt-14 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[1fr_320px]">
            <Reveal delay={120}>
              <SampleDocument doc={uc.sample} accent={nt.color} typeLabel={nt.label} />
            </Reveal>

            <Reveal delay={220} className="lg:sticky lg:top-28">
              <aside className="grain relative flex flex-col rounded-[6px] p-5 shadow-[0_1px_2px_rgba(60,20,10,0.12)]" style={{ background: nt.color }}>
                <div className="h-[72px]">
                  <NoteTypeShape type={nt.key} />
                </div>
                <div className="mt-4 border-t border-ink/15 pt-4">
                  <p className="font-mono text-[10px] tracking-[0.12em] text-ink/60 uppercase">Note type</p>
                  <h3 className="serif-accent mt-1 text-[30px] leading-none text-ink not-italic">{nt.label}</h3>
                  <p className="mt-2 text-sm text-ink-soft">Every {nt.label.toLowerCase()} item comes with these outputs:</p>
                </div>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {nt.defaults.map((o) => (
                    <li key={o} className="rounded-full bg-cream/70 px-2.5 py-1 text-[11px] text-ink">
                      {OUTPUT_LABELS[o]}
                    </li>
                  ))}
                  {nt.optional.map((o) => (
                    <li key={o} className="rounded-full border border-dashed border-ink/25 px-2.5 py-1 text-[11px] text-ink-soft">
                      + {OUTPUT_LABELS[o]}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-ink-soft">Dashed outputs are optional extras. Add any of them later.</p>
                <Link href="/#note-types" className="link-arrow mt-6 self-start text-sm text-ink">
                  All seven note types
                  <ArrowRight className="size-4" />
                </Link>
              </aside>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="px-6 py-28">
        <div className="mx-auto max-w-[1100px]">
          <SectionHeading
            eyebrow="002 · How it works"
            title={
              <>
                Three steps. <span className="serif-accent">No note-taking.</span>
              </>
            }
          />
          <Reveal delay={120} className="mt-14">
            <CornerFrame tone="paper" className="grid grid-cols-[minmax(0,1fr)] bg-card/40 md:grid-cols-3">
              {uc.steps.map((s, i) => (
                <div
                  key={s.title}
                  className={`group relative p-8 transition-colors duration-300 hover:bg-card ${
                    i < uc.steps.length - 1 ? "border-line-strong max-md:border-b md:border-r" : ""
                  }`}
                >
                  <span className="serif-accent text-[56px] leading-none text-red-500 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-translate-y-1 inline-block">
                    {i + 1}
                  </span>
                  <h3 className="mt-6 text-lg font-medium tracking-[-0.02em]">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{s.body}</p>
                </div>
              ))}
            </CornerFrame>
          </Reveal>
          <Reveal delay={200} className="mt-10 flex justify-center">
            <Link href={`/sign-in?next=${encodeURIComponent(`/app/new?type=${uc.noteType}`)}`} className="btn btn-red btn-lg">
              Try it with your own {uc.source.kind.toLowerCase()}
              <ArrowUpRight className="btn-arrow size-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-28">
        <SectionHeading title={`${uc.name}: questions`} sub="The things people usually ask before their first upload." />
        <Reveal delay={120} className="mt-10">
          <Accordion items={uc.faq} />
        </Reveal>
      </section>

      {/* Related */}
      <section className="px-6 pb-24">
        <Reveal className="mx-auto max-w-[1100px]">
          <p className="eyebrow text-center">More ways to use it</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {related.map((r) => {
              const rnt = noteType(r.noteType);
              return (
                <li key={r.slug}>
                  <Link
                    href={`/${r.slug}`}
                    className="group inline-flex items-center gap-2 rounded-full border border-line bg-card py-2 pr-3 pl-2 text-sm text-ink-soft transition-all duration-200 hover:-translate-y-px hover:border-ink/40 hover:text-ink"
                  >
                    <span className="size-4 rounded-full" style={{ background: rnt.color }} />
                    {r.name}
                    <ArrowUpRight className="size-3.5 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </section>

      <section className="pb-24">
        <CtaPanel
          title={
            <>
              {uc.cta.title.before} <span className="serif-accent">{uc.cta.title.accent}</span>
            </>
          }
          body={uc.cta.body}
        />
      </section>
    </>
  );
}
