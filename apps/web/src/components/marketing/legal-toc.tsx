"use client";

import { useEffect, useState } from "react";

type Item = { id: string; heading: string };

/** Sticky table of contents that tracks the section in view. */
export function LegalToc({ items }: { items: Item[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav aria-label="On this page">
      <p className="eyebrow">On this page</p>
      <ol className="mt-4 space-y-0.5 border-l border-line">
        {items.map((it, i) => {
          const on = it.id === active;
          return (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                aria-current={on ? "location" : undefined}
                className={`relative -ml-px flex gap-2.5 border-l py-1.5 pl-4 text-[13px] leading-snug transition-colors duration-200 ${
                  on ? "border-red-500 text-ink" : "border-transparent text-muted hover:border-line-strong hover:text-ink-soft"
                }`}
              >
                <span className={`font-mono text-[10px] leading-[18px] ${on ? "text-red-500" : "text-line-strong"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {it.heading}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
