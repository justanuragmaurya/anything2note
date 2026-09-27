import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Art } from "@/components/ui/art";
import { USE_CASES } from "@/lib/mock/marketing-use-cases";

const SUGGESTIONS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/meeting-minutes", label: USE_CASES["meeting-minutes"].name },
  { href: "/lecture-notes", label: USE_CASES["lecture-notes"].name },
  { href: "/pdf-to-notes", label: USE_CASES["pdf-to-notes"].name },
];

export default function NotFound() {
  return (
    <section className="paper-hero grain relative overflow-hidden px-6 pt-[140px] pb-28">
      <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-[1080px] items-center gap-14 md:grid-cols-[1.15fr_1fr]">
        <div className="text-center md:text-left">
          <p className="rise font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Error 404 · page not found</p>
          <h1
            className="serif-accent rise mt-4 text-[clamp(72px,11vw,148px)] leading-[0.92] tracking-[-0.03em] text-ink"
            style={{ animationDelay: "100ms" }}
          >
            Not <span className="text-red-500">noted.</span>
          </h1>
          <p className="rise mx-auto mt-6 max-w-[440px] text-[17px] leading-relaxed text-ink-soft md:mx-0" style={{ animationDelay: "200ms" }}>
            We checked every timestamp and every page. Whatever was here was never said, or it&apos;s been wiped like last
            week&apos;s whiteboard.
          </p>

          {/* The page's own action item */}
          <div
            className="rise mx-auto mt-8 flex max-w-[400px] items-start gap-3 rounded-2xl border border-line bg-card p-4 text-left shadow-[0_18px_40px_-28px_rgba(60,20,10,0.45)] md:mx-0"
            style={{ animationDelay: "300ms" }}
          >
            <span aria-hidden className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border border-line-strong" />
            <div>
              <p className="text-sm text-ink">Find the page you were looking for</p>
              <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-muted">
                <span>
                  Owner · <span className="italic">Not mentioned</span>
                </span>
                <span>
                  Due · <span className="italic">Not mentioned</span>
                </span>
              </p>
            </div>
          </div>

          <div className="rise mt-10 flex flex-wrap items-center justify-center gap-6 md:justify-start" style={{ animationDelay: "400ms" }}>
            <Link href="/" className="link-arrow text-[15px] text-ink">
              Back to the home page
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/sign-in?next=/app/new" className="btn btn-red btn-sm">
              Make a note instead
              <ArrowUpRight className="btn-arrow size-3.5" />
            </Link>
          </div>

          <ul className="rise mt-10 flex flex-wrap justify-center gap-2 md:justify-start" style={{ animationDelay: "500ms" }}>
            {SUGGESTIONS.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="inline-flex rounded-full border border-line bg-card/70 px-3 py-1.5 text-[13px] text-ink-soft transition-all duration-200 hover:-translate-y-px hover:border-ink/40 hover:text-ink"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto w-[min(420px,80vw)]">
          <div className="drop-in" style={{ animationDelay: "250ms" }}>
            <div className="bob" style={{ animationDuration: "6s" }}>
              <div style={{ rotate: "-5deg" }} className="drop-shadow-[0_24px_30px_rgba(60,20,10,0.2)]">
                <Art id="empty-library" tint="var(--red-100)" sizes="420px" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
