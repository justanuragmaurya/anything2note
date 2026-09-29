import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, AudioLines, CalendarDays, Clock, Eye, Users } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Reveal } from "@/components/ui/reveal";
import { SharedTabs } from "@/components/marketing/shared-tabs";
import { getSharedNote, SHARED_SLUGS } from "@/lib/mock/marketing-shared";
import { noteType, OUTPUT_LABELS } from "@/lib/note-types";
import { OG_IMAGE } from "@/lib/og";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SHARED_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const note = getSharedNote((await params).slug);
  if (!note) return { title: "Shared note not found", robots: { index: false } };
  return {
    title: note.title,
    description: note.summary,
    robots: { index: false, follow: true },
    openGraph: { title: note.title, description: note.summary, type: "article", images: [OG_IMAGE] },
  };
}

export default async function SharedNotePage({ params }: Props) {
  const note = getSharedNote((await params).slug);
  if (!note) notFound();
  const nt = noteType(note.noteType);
  const makeHref = `/sign-in?next=${encodeURIComponent(`/app/new?type=${note.noteType}`)}`;

  const meta = [
    { icon: AudioLines, text: note.source.kind },
    { icon: Clock, text: note.source.duration },
    { icon: CalendarDays, text: note.source.recorded },
    { icon: Users, text: note.source.speakers },
  ];

  return (
    <div className="min-h-dvh bg-paper">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-4 px-5 py-3">
          <Logo />
          <p className="hidden font-mono text-[10px] tracking-[0.14em] text-muted uppercase md:block">Made with anything2note</p>
          <Link href={makeHref} className="btn btn-red btn-sm">
            Make your own
            <ArrowUpRight className="btn-arrow size-3.5" />
          </Link>
        </div>
      </header>

      <main>
        {/* Title block */}
        <section className="paper-hero grain border-b border-line px-5 pt-14 pb-12 md:pt-20">
          <div className="mx-auto max-w-[1160px]">
            <p className="rise flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
              <Eye className="size-3.5" /> Shared note · read-only
            </p>
            <h1
              className="rise mt-4 max-w-[860px] text-[clamp(34px,5vw,60px)] leading-[1.04] font-normal tracking-[-0.04em] text-balance"
              style={{ animationDelay: "80ms" }}
            >
              {note.title}
            </h1>
            <div className="rise mt-6 flex flex-wrap items-center gap-2" style={{ animationDelay: "160ms" }}>
              <span className="grain inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] text-ink" style={{ background: nt.color }}>
                <span className="size-1.5 rounded-full bg-red-600" />
                {nt.label}
              </span>
              {meta.map((m) => (
                <span
                  key={m.text}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card/70 px-3 py-1 text-[13px] text-ink-soft"
                >
                  <m.icon className="size-3.5 text-muted" aria-hidden />
                  {m.text}
                </span>
              ))}
            </div>
            <p className="rise mt-4 font-mono text-[11px] break-all text-muted" style={{ animationDelay: "220ms" }}>
              {note.source.file} · {note.sharedBy} · {note.updated}
            </p>
          </div>
        </section>

        {/* Outputs */}
        <section className="px-5 py-12 md:py-16">
          <div className="mx-auto grid max-w-[1160px] grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Reveal>
              <div className="rounded-[28px] border border-line bg-card p-5 shadow-[0_40px_80px_-50px_rgba(60,20,10,0.45)] sm:p-8">
                <SharedTabs tabs={note.tabs} accent={nt.color} />
              </div>
            </Reveal>

            <Reveal delay={120} className="lg:sticky lg:top-24">
              <aside className="space-y-4">
                <div className="rounded-[22px] border border-line bg-card p-5">
                  <p className="eyebrow">TL;DR</p>
                  <p className="serif-accent mt-2 text-[20px] leading-snug text-ink">{note.summary}</p>
                </div>
                <div className="rounded-[22px] border border-line bg-card/60 p-5 text-sm text-ink-soft">
                  <p className="eyebrow">About this page</p>
                  <p className="mt-2 leading-relaxed">
                    Timestamps show where each line came from. The owner shared these outputs only; the recording and
                    transcript stay private.
                  </p>
                  <p className="mt-4 text-xs text-muted">A {nt.label.toLowerCase()} note can also include:</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {nt.optional.map((o) => (
                      <li key={o} className="rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-[11px]">
                        + {OUTPUT_LABELS[o]}
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </Reveal>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="px-3 pb-3 md:px-5 md:pb-5">
          <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[18px] bg-night text-night-text">
            <div aria-hidden className="dots-night absolute inset-y-0 left-0 w-4 md:w-10" />
            <div aria-hidden className="dots-night absolute inset-y-0 right-0 w-4 md:w-10" />
            <div aria-hidden className="dashed-rail absolute inset-y-0 left-4 w-px md:left-10" />
            <div aria-hidden className="dashed-rail absolute inset-y-0 right-4 w-px md:right-10" />
            <div aria-hidden className="absolute -bottom-40 left-1/2 size-[460px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#e5372b55_0%,transparent_65%)] blur-2xl" />
            <Reveal className="relative flex flex-col items-center px-8 py-20 text-center md:py-24">
              <p className="eyebrow !text-night-muted">Made with anything2note</p>
              <h2 className="h-section mt-4 max-w-[720px]">
                Notes like these, from <span className="serif-accent text-red-400">your own</span> lectures.
              </h2>
              <p className="mt-4 max-w-[460px] text-[16px] text-night-muted">
                Record a class, or upload a PDF, YouTube link or whiteboard photo. Free for 120 minutes and 50 pages a month.
              </p>
              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
                <Link href={makeHref} className="btn btn-cream btn-lg">
                  Make your own
                  <ArrowUpRight className="btn-arrow size-4" />
                </Link>
                <Link href="/" className="btn btn-night btn-lg">
                  How it works
                </Link>
              </div>
            </Reveal>
          </div>
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-3 py-5 text-[13px] text-muted">
            <p>© {new Date().getFullYear()} anything2note</p>
            <div className="flex gap-5">
              <Link href="/privacy" className="hover:text-ink">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-ink">
                Terms
              </Link>
              <a href="mailto:abuse@anything2note.com?subject=Report%20shared%20note" className="hover:text-ink">
                Report this page
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
