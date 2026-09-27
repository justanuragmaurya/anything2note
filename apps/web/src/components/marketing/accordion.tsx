"use client";

import { useId, useState } from "react";
import { ChevronDown, CreditCard, FileQuestion, HelpCircle, Lock, Sparkles, type LucideIcon } from "lucide-react";

const ICONS: LucideIcon[] = [HelpCircle, FileQuestion, Sparkles, Lock, CreditCard];

export type AccordionItem = { q: string; a: string };

/**
 * Same accordion as the landing FAQ, for any list of questions.
 * Items must be plain strings so server pages can pass them in.
 */
export function Accordion({
  items,
  defaultOpen = 0,
  className = "",
}: {
  items: AccordionItem[];
  defaultOpen?: number;
  className?: string;
}) {
  const [open, setOpen] = useState<number>(defaultOpen);
  const base = useId();

  return (
    <ul className={`mx-auto max-w-[680px] ${className}`}>
      {items.map((f, i) => {
        const Icon = ICONS[i % ICONS.length]!;
        const isOpen = open === i;
        const btnId = `${base}-q${i}`;
        const panelId = `${base}-a${i}`;
        return (
          <li key={f.q} className="border-b border-line">
            <h3>
              <button
                id={btnId}
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="group flex w-full items-center gap-4 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-lg border transition-colors duration-300 ${
                    isOpen ? "border-red-300 bg-red-50 text-red-600" : "border-line-strong text-ink-soft group-hover:border-ink/40"
                  }`}
                >
                  <Icon className="size-4" strokeWidth={1.5} />
                </span>
                <span className="flex-1 text-[15px] font-medium tracking-[-0.01em]">{f.q}</span>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted transition-transform duration-300 ${isOpen ? "rotate-180" : "group-hover:translate-y-0.5"}`}
                />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={btnId} className="accordion-body" data-open={isOpen}>
              <div>
                <p className="pr-2 pb-6 pl-[52px] text-[15px] leading-relaxed text-ink-soft sm:pr-8">{f.a}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
