import Link from "next/link";

/** Mark: a red page with a folded corner, an arrow slipping into it. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M6 3h14l7 7v16a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" fill="var(--red-500)" />
      <path d="M20 3v5a2 2 0 0 0 2 2h5" fill="var(--red-700)" />
      <path
        d="M9 21.5c2.2-4 5.4-6 9.5-6m0 0-3.2-3m3.2 3-3.2 3"
        fill="none"
        stroke="var(--cream)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ tone = "paper", href = "/" }: { tone?: "paper" | "night"; href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2" aria-label="anything2note home">
      <span className="transition-transform duration-300 ease-[var(--ease-spring)] group-hover:-rotate-6">
        <LogoMark />
      </span>
      <span
        className={`text-[19px] font-medium tracking-[-0.04em] ${tone === "night" ? "text-night-text" : "text-ink"}`}
      >
        anything<span className="serif-accent text-[22px] text-red-500">2</span>note
      </span>
    </Link>
  );
}
