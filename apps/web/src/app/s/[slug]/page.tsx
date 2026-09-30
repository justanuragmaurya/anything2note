import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowUpRight, CalendarDays, Clock, Eye, FileText, UserRound } from "lucide-react";
import { PLANS, TRIAL, type SharedItem } from "@a2n/shared";
import { Logo } from "@/components/ui/logo";
import { Reveal } from "@/components/ui/reveal";
import { SourceIcon } from "@/components/app/ui";
import { fmtDuration, fmtTsDate, SOURCE_LABELS } from "@/lib/format";
import { noteType } from "@/lib/note-types";
import { OG_IMAGE } from "@/lib/og";
import { getShared } from "./data";
import { SharedView } from "./shared-view";

type Props = { params: Promise<{ slug: string }> };

/** A plain-text line for link previews: the TL;DR if there is one. */
function describe(item: SharedItem): string {
  const summary = item.outputs.find((o) => o.data.type === "summary")?.data;
  const text = summary?.type === "summary" ? summary.tldr : "";
  const plain = text.replace(/[*_`#>$]/g, "").replace(/\s+/g, " ").trim();
  if (plain) return plain.length > 200 ? `${plain.slice(0, 197)}…` : plain;
  return `${noteType(item.noteType).label} notes shared by ${item.sharedBy}, made with anything2note.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getShared((await params).slug);
  if (r.state !== "ok") return { title: "Shared note", robots: { index: false } };
  const description = describe(r.item);
  return {
    title: r.item.title,
    description,
    robots: { index: false, follow: true },
    openGraph: { title: r.item.title, description, type: "article", images: [OG_IMAGE] },
  };
}

const cheapest = Math.min(...PLANS.map((p) => p.price));

export default async function SharedNotePage({ params }: Props) {
  const r = await getShared((await params).slug);
  if (r.state === "missing") notFound();
  const item = r.state === "ok" ? r.item : null;
  const nt = noteType(item?.noteType ?? "general");
  const makeHref = `/sign-in?next=${encodeURIComponent(`/app/new${item ? `?type=${item.noteType}` : ""}`)}`;

  const meta = item
    ? [
        { key: "source", icon: <SourceIcon kind={item.source} className="size-3.5 text-muted" />, text: SOURCE_LABELS[item.source] },
        item.durationSec ? { key: "length", icon: <Clock className="size-3.5 text-muted" aria-hidden />, text: fmtDuration(item.durationSec) } : null,
        item.pages ? { key: "pages", icon: <FileText className="size-3.5 text-muted" aria-hidden />, text: `${item.pages} ${item.pages === 1 ? "page" : "pages"}` } : null,
        { key: "date", icon: <CalendarDays className="size-3.5 text-muted" aria-hidden />, text: fmtTsDate(item.createdAt) },
        { key: "by", icon: <UserRound className="size-3.5 text-muted" aria-hidden />, text: `Shared by ${item.sharedBy}` },
      ].filter((m) => m !== null)
    : [];

  return (
    <div className="min-h-dvh bg-paper">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-4 px-4 py-3 sm:px-5">
          <Logo />
          <p className="hidden font-mono text-[10px] tracking-[0.14em] text-muted uppercase md:block">Made with anything2note</p>
          <Link href={makeHref} className="btn btn-red btn-sm">
            Make your own
            <ArrowUpRight className="btn-arrow size-3.5" />
          </Link>
        </div>
      </header>

      <main>
        {item ? (
          <>
            {/* Title block */}
            <section className="paper-hero grain border-b border-line px-4 pt-12 pb-10 sm:px-5 md:pt-20 md:pb-12">
              <div className="mx-auto max-w-[1160px]">
                <p className="rise flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
                  <Eye className="size-3.5" /> Shared note · read-only
                </p>
                <h1 className="rise mt-4 max-w-[860px] text-[clamp(30px,5vw,60px)] leading-[1.04] font-normal tracking-[-0.04em] text-balance" style={{ animationDelay: "80ms" }}>
                  {item.title}
                </h1>
                <div className="rise mt-6 flex flex-wrap items-center gap-2" style={{ animationDelay: "160ms" }}>
                  <span className="grain inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] text-ink" style={{ background: nt.color }}>
                    <span className="size-1.5 rounded-full bg-red-600" />
                    {nt.label}
                  </span>
                  {meta.map((m) => (
                    <span key={m.key} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card/70 px-3 py-1 text-[13px] text-ink-soft">
                      {m.icon}
                      {m.text}
                    </span>
                  ))}
                </div>
                <p className="rise mt-4 font-mono text-[11px] break-all text-muted" style={{ animationDelay: "220ms" }}>
                  {item.sourceLabel}
                </p>
              </div>
            </section>

            <SharedView item={item} />
          </>
        ) : (
          <section className="px-4 py-24 text-center sm:px-5">
            <AlertCircle className="mx-auto size-7 text-red-500" />
            <h1 className="mt-4 text-[28px] tracking-[-0.035em]">This note couldn’t be loaded.</h1>
            <p className="mx-auto mt-2 max-w-[42ch] text-sm text-ink-soft">Something went wrong on our side. Refresh the page in a moment, or ask for the link again.</p>
          </section>
        )}

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
                Notes like these, from <span className="serif-accent text-red-400">your own</span> {item?.noteType === "lecture" ? "lectures" : "sources"}.
              </h2>
              <p className="mt-4 max-w-[480px] text-[16px] text-night-muted">
                Record a class, or drop in a PDF, a YouTube link or a whiteboard photo. Every plan starts with {TRIAL.days} days free, then from ${cheapest} a month. Cancel anytime.
              </p>
              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
                <Link href={makeHref} className="btn btn-cream btn-lg">
                  Start free trial
                  <ArrowUpRight className="btn-arrow size-4" />
                </Link>
                <Link href="/pricing" className="btn btn-night btn-lg">
                  See pricing
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
