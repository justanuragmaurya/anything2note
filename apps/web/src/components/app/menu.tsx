"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/** Minimal dropdown: trigger + popover, closes on outside click and Escape. */
export function Menu({
  trigger,
  children,
  align = "right",
  label,
  triggerClassName = "",
  width = "w-56",
}: {
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  label: string;
  triggerClassName?: string;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          className={`menu-pop absolute top-full z-40 mt-2 overflow-hidden rounded-2xl border border-line-strong bg-card p-1.5 shadow-[0_24px_50px_-24px_rgba(60,20,10,0.5)] ${width} ${align === "right" ? "right-0" : "left-0 origin-top-left"}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ children, onSelect, hint }: { children: ReactNode; onSelect: () => void; hint?: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-ink-soft transition-colors hover:bg-panel hover:text-ink focus-visible:bg-panel focus-visible:outline-none"
    >
      <span className="flex flex-1 items-center gap-2.5">{children}</span>
      {hint && <span className="font-mono text-[10px] text-muted">{hint}</span>}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="eyebrow px-3 pt-2 pb-1 text-[9px]">{children}</p>;
}
