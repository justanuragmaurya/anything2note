import Link from "next/link";
import { ArrowRight, ChevronDown, TriangleAlert } from "lucide-react";
import { LEGAL_DOCS, type LegalBlock, type LegalDoc } from "@/lib/mock/marketing-legal";
import { LegalToc } from "./legal-toc";

const LABELS: Record<LegalDoc["slug"], string> = {
  privacy: "Privacy policy",
  terms: "Terms of service",
  refunds: "Refund policy",
};

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") return <p>{block}</p>;
  if ("list" in block)
    return (
      <ul className="space-y-2.5">
        {block.list.map((li) => (
          <li key={li} className="flex gap-3">
            <span aria-hidden className="mt-[11px] size-1.5 shrink-0 rounded-full bg-red-500" />
            <span>{li}</span>
          </li>
        ))}
      </ul>
    );
  return (
    <p className="rounded-2xl border border-line bg-card px-5 py-4 text-[15px] text-ink">
      <span className="mr-2 font-mono text-[10px] tracking-[0.14em] text-red-600 uppercase">Note</span>
      {block.note}
    </p>
  );
}

/** Long-form reading layout for legal pages: 680px column + sticky TOC. */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  const toc = doc.sections.map((s) => ({ id: s.id, heading: s.heading }));
  const others = (Object.keys(LEGAL_DOCS) as LegalDoc["slug"][]).filter((k) => k !== doc.slug);

  return (
    <div className="paper-hero grain">
      <div className="mx-auto max-w-[1080px] px-6 pt-[128px] pb-28 md:pt-[152px] lg:grid lg:grid-cols-[210px_minmax(0,680px)] lg:justify-center lg:gap-16">
        <aside className="hidden lg:block">
          <div className="rise sticky top-28" style={{ animationDelay: "300ms" }}>
            <LegalToc items={toc} />
          </div>
        </aside>

        <article className="mx-auto w-full max-w-[680px] lg:mx-0">
          <div
            role="note"
            className="rise flex items-start gap-3 rounded-2xl border border-dashed border-red-300 bg-red-50/80 px-4 py-3 text-[13px] leading-relaxed text-red-800"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red-600" />
            <p>
              <span className="font-medium">Draft, pending legal review.</span> This placeholder text has not been reviewed by
              counsel and is not yet a binding policy. Bracketed items still need to be filled in.
            </p>
          </div>

          <header className="rise mt-10" style={{ animationDelay: "100ms" }}>
            <h1 className="text-[clamp(44px,6vw,68px)] leading-[1.02] font-normal tracking-[-0.042em]">
              {doc.title.before} <span className="serif-accent text-red-500">{doc.title.accent}</span>
            </h1>
            <p className="mt-5 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
              Last updated · <time dateTime="2026-09-27">{doc.updated}</time>
            </p>
          </header>

          <div className="rise mt-10 rounded-[22px] border border-line bg-card p-6" style={{ animationDelay: "200ms" }}>
            <p className="eyebrow">In short</p>
            <p className="serif-accent mt-2 text-[22px] leading-snug text-ink">{doc.summary}</p>
          </div>

          {/* Mobile table of contents */}
          <details className="group rise mt-8 rounded-2xl border border-line bg-card/60 lg:hidden" style={{ animationDelay: "260ms" }}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
              On this page
              <ChevronDown className="size-4 text-muted transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <ol className="space-y-1 px-5 pb-4">
              {toc.map((t, i) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="flex gap-2.5 py-1 text-sm text-ink-soft hover:text-ink">
                    <span className="font-mono text-[10px] leading-5 text-muted">{String(i + 1).padStart(2, "0")}</span>
                    {t.heading}
                  </a>
                </li>
              ))}
            </ol>
          </details>

          <div className="rise mt-4" style={{ animationDelay: "300ms" }}>
            {doc.sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-28 border-t border-line pt-10 mt-10 first:mt-8">
                <p className="font-mono text-[10px] tracking-[0.14em] text-red-500">{String(i + 1).padStart(2, "0")}</p>
                <h2 id={`${s.id}-h`} className="mt-2 text-[26px] leading-tight tracking-[-0.03em]">
                  {s.heading}
                </h2>
                <div className="mt-5 space-y-4 text-[16px] leading-[1.75] text-ink-soft">
                  {s.blocks.map((b, j) => (
                    <Block key={j} block={b} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <footer className="mt-16 flex flex-col gap-4 rounded-[22px] border border-line bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-soft">
              Questions?{" "}
              <a href="mailto:hello@anything2note.com" className="link-underline text-ink">
                hello@anything2note.com
              </a>
            </p>
            <div className="flex flex-wrap gap-5">
              {others.map((k) => (
                <Link key={k} href={`/${k}`} className="link-arrow text-sm text-ink">
                  {LABELS[k]}
                  <ArrowRight className="size-4" />
                </Link>
              ))}
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
