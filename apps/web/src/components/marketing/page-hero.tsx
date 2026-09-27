import type { ReactNode } from "react";

/** Compact paper hero with an h1, for standalone marketing pages. */
export function PageHero({
  eyebrow,
  title,
  sub,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`paper-hero grain relative overflow-hidden px-6 pt-[132px] pb-16 text-center md:pt-[160px] ${className}`}>
      {eyebrow && (
        <span className="rise inline-flex items-center gap-2 rounded-md border border-line bg-card px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
          <span className="size-1 rounded-full bg-red-500" />
          {eyebrow}
        </span>
      )}
      <h1 className="display rise mx-auto mt-6 max-w-[900px]" style={{ animationDelay: "120ms" }}>
        {title}
      </h1>
      {sub && (
        <p className="rise mx-auto mt-6 max-w-[560px] text-[17px] leading-relaxed text-ink-soft" style={{ animationDelay: "240ms" }}>
          {sub}
        </p>
      )}
      {children && (
        <div className="rise" style={{ animationDelay: "360ms" }}>
          {children}
        </div>
      )}
    </section>
  );
}
