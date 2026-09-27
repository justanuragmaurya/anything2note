"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

const LEN = 6;

/**
 * Six single-digit boxes: auto-advance, backspace walks back, arrow keys move,
 * paste (or iOS/Android one-time-code autofill) fills every box.
 * Shakes when `errorKey` changes to a new non-zero value.
 */
export function OtpInput({
  onComplete,
  disabled,
  errorKey,
  invalid,
  describedBy,
}: {
  onComplete: (code: string) => void;
  disabled?: boolean;
  errorKey: number;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [digits, setDigits] = useState<string[]>(() => Array(LEN).fill(""));
  const [shaking, setShaking] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  // On a new error: shake, clear and refocus the first box.
  useEffect(() => {
    if (errorKey === 0) return;
    const t = setTimeout(() => {
      setShaking(true);
      setDigits(Array(LEN).fill(""));
      refs.current[0]?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [errorKey]);

  const focus = (i: number) => refs.current[Math.max(0, Math.min(LEN - 1, i))]?.focus();

  const commit = (next: string[]) => {
    setDigits(next);
    if (next.every((d) => d !== "")) onComplete(next.join(""));
  };

  const fillFrom = (start: number, raw: string) => {
    const incoming = raw.replace(/\D/g, "").slice(0, LEN - start).split("");
    if (!incoming.length) return;
    const next = [...digits];
    incoming.forEach((d, k) => (next[start + k] = d));
    commit(next);
    focus(start + incoming.length);
  };

  const onChange = (i: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length > 1) return fillFrom(i, clean);
    const next = [...digits];
    next[i] = clean;
    commit(next);
    if (clean) focus(i + 1);
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
      focus(i - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(i + 1);
    }
  };

  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    fillFrom(i, e.clipboardData.getData("text"));
  };

  return (
    <div
      role="group"
      aria-label="6-digit sign-in code"
      className={`flex gap-2 sm:gap-2.5 ${shaking ? "animate-[wiggle_0.3s_ease-in-out_2]" : ""}`}
      onAnimationEnd={() => setShaking(false)}
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={(e) => onPaste(i, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={i === 0 ? LEN : 1}
          aria-label={`Digit ${i + 1} of ${LEN}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`h-14 w-full min-w-0 rounded-xl border bg-card text-center font-mono text-[22px] text-ink tabular-nums caret-red-500 transition-all duration-200 outline-none focus:-translate-y-px focus:border-red-400 focus:shadow-[0_0_0_4px_var(--red-50)] disabled:opacity-60 ${
            invalid ? "border-red-400" : d ? "border-ink/40" : "border-line-strong"
          }`}
        />
      ))}
    </div>
  );
}
