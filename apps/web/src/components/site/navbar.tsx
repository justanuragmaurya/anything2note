"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#note-types", label: "Note types" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

/**
 * Yield Theory's centred blurred-paper bar that, once you scroll, condenses
 * into a floating pill (Cloudflare's collapsing nav).
 */
export function Navbar() {
  const [condensed, setCondensed] = useState(false);
  const [overNight, setOverNight] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setCondensed(window.scrollY > 80);
      // Flip the pill to its night variant while it floats over a dark section.
      const probe = 40;
      const dark = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-tone='night']")).some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= probe && r.bottom >= probe;
      });
      setOverNight(dark);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-3">
      <nav
        aria-label="Main"
        className={`flex w-full items-center justify-between gap-6 transition-all duration-500 ease-[var(--ease-out)] ${
          condensed
            ? `mt-3 max-w-[760px] rounded-full border py-2 pr-2 pl-5 shadow-[0_10px_30px_-12px_rgba(60,20,10,0.25)] backdrop-blur-xl ${
                overNight ? "night-nav border-night-line bg-night-2/80" : "border-line bg-paper/85"
              }`
            : "mt-0 max-w-[1200px] border-b border-transparent bg-transparent px-2 py-4"
        }`}
      >
        <Logo tone={condensed && overNight ? "night" : "paper"} />

        <ul className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="relative text-sm text-ink-soft transition-colors duration-150 hover:text-ink [.night-nav_&]:text-night-muted [.night-nav_&]:hover:text-night-text after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-red-500 after:transition-transform after:duration-300 hover:after:scale-x-100"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/sign-in" className="px-3 text-sm text-ink-soft transition-colors hover:text-ink [.night-nav_&]:text-night-muted [.night-nav_&]:hover:text-night-text">
            Sign in
          </Link>
          <Link href="/sign-in?next=/app/new" className="btn btn-red btn-sm">
            Try free
            <ArrowUpRight className="btn-arrow size-3.5" />
          </Link>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </nav>

      {/* Mobile sheet */}
      <div
        className={`fixed inset-x-3 top-20 rounded-3xl border border-line bg-card p-6 shadow-2xl transition-all duration-300 md:hidden ${
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <ul className="flex flex-col gap-1">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-3 text-lg tracking-tight hover:bg-panel"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-col gap-2">
          <Link href="/sign-in?next=/app/new" className="btn btn-red w-full">
            Try free
          </Link>
          <Link href="/sign-in" className="btn btn-ghost w-full">
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
