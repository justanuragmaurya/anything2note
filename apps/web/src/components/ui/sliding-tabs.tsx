"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type TabItem<T extends string> = { value: T; label: ReactNode; icon?: ReactNode };

type Props<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** paper: cream track, red pill · night: dark track, red pill · ink: paper track, ink pill */
  tone?: "paper" | "night" | "ink";
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
};

const tones = {
  paper: {
    track: "bg-panel/70 border-line",
    pill: "bg-[image:var(--button-red)] shadow-[var(--button-shadow)] border border-[#a51d15]",
    active: "text-[#fff7f2]",
    idle: "text-ink-soft hover:text-ink",
  },
  ink: {
    track: "bg-card border-line",
    pill: "bg-[image:var(--button-ink)] shadow-[var(--button-shadow)] border border-[#5e4b47]",
    active: "text-[#f6ece8]",
    idle: "text-ink-soft hover:text-ink",
  },
  night: {
    track: "bg-night-2 border-night-line",
    pill: "bg-[image:var(--button-red)] border border-[#a51d15]",
    active: "text-[#fff7f2]",
    idle: "text-night-muted hover:text-night-text",
  },
} as const;

/** Pill tab group with a sliding indicator (Cloudflare pricing tabs). */
export function SlidingTabs<T extends string>({
  items,
  value,
  onChange,
  tone = "paper",
  size = "md",
  className = "",
  ariaLabel,
}: Props<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const t = tones[tone];

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const btn = track.querySelector<HTMLButtonElement>(`[data-value="${CSS.escape(value)}"]`);
      if (btn) setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [value, items.length]);

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`relative inline-flex items-center gap-1 rounded-full border p-1 ${t.track} ${className}`}
    >
      {indicator && (
        <span
          aria-hidden
          className={`absolute top-1 bottom-1 rounded-full transition-[left,width] duration-300 ease-[var(--ease-spring)] ${t.pill}`}
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-value={item.value}
            onClick={() => onChange(item.value)}
            className={`relative z-10 inline-flex items-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors duration-200 ${
              size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2 text-sm"
            } ${active ? t.active : t.idle}`}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
