import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#how", label: "How it works" },
      { href: "/#note-types", label: "Note types" },
      { href: "/pricing", label: "Pricing" },
      { href: "/app", label: "Open the app" },
    ],
  },
  {
    title: "Use cases",
    links: [
      { href: "/meeting-minutes", label: "Meeting minutes" },
      { href: "/lecture-notes", label: "Lecture notes" },
      { href: "/youtube-to-notes", label: "YouTube to notes" },
      { href: "/pdf-to-notes", label: "PDF to notes" },
      { href: "/podcast-summary", label: "Podcast summary" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/refunds", label: "Refund policy" },
      { href: "mailto:hello@anything2note.com", label: "Contact" },
    ],
  },
];

/** Cloudflare-style night footer with dashed side rails. */
export function Footer() {
  return (
    <footer data-nav-tone="night" className="relative bg-night text-night-text">
      <div aria-hidden className="dashed-rail pointer-events-none absolute inset-y-0 left-4 w-px md:left-10" />
      <div aria-hidden className="dashed-rail pointer-events-none absolute inset-y-0 right-4 w-px md:right-10" />

      <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-[1200px] gap-12 px-8 pt-20 pb-16 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-16">
        <div className="max-w-xs">
          <Logo tone="night" />
          <p className="mt-4 text-sm leading-relaxed text-night-muted">
            Upload anything. Get notes you&apos;d actually want to reread.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-sm text-night-muted">{col.title}</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[15px] text-night-text/90 transition-colors duration-150 hover:text-red-300"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-night-line">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-3 px-8 py-6 text-sm text-night-muted md:flex-row md:items-center md:px-16">
          <p>© {new Date().getFullYear()} anything2note</p>
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase">Made for people who take notes seriously</p>
        </div>
      </div>
    </footer>
  );
}
