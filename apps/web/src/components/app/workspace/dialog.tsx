"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Modal in the command palette's style: a bottom sheet on phones, a centred card from `sm` up.
 * Escape and the backdrop close it; focus moves in on open and back to the opener on close.
 */
export function Dialog({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
  width = "sm:max-w-[520px]",
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  /** While a request is in flight the dialog can't be dismissed */
  busy?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  const locked = useRef(busy);

  useEffect(() => {
    close.current = onClose;
    locked.current = busy;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const id = requestAnimationFrame(() => {
      const root = ref.current;
      const el = root?.querySelector<HTMLElement>("[data-autofocus]") ?? root?.querySelector<HTMLElement>("input, textarea, select, button:not([data-dialog-close])");
      (el ?? root)?.focus();
    });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !locked.current) {
        e.stopPropagation();
        close.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label="Close" tabIndex={-1} onClick={() => !busy && onClose()} className="palette-fade absolute inset-0 cursor-default bg-ink/25 backdrop-blur-[3px]" />
      <div
        ref={ref}
        tabIndex={-1}
        className={`palette-pop relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[26px] border border-line-strong bg-card shadow-[0_40px_80px_-30px_rgba(60,20,10,0.55)] focus:outline-none sm:rounded-[26px] ${width}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 pt-4 pb-3.5 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[18px] font-medium tracking-[-0.02em]">
              {title}
            </h2>
            {sub && <p className="mt-0.5 text-[13px] text-ink-soft">{sub}</p>}
          </div>
          <button
            type="button"
            data-dialog-close
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="-mr-1.5 grid size-8 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-panel hover:text-ink disabled:opacity-40"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-paper/60 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}
