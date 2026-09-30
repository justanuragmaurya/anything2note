"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";

/**
 * Fallback for a crashed route (error.tsx / global-error.tsx). `retry` re-fetches and re-renders
 * the segment; the digest matches the server log when the error came from a Server Component.
 */
export function ErrorView({
  error,
  retry,
  home = { href: "/app", label: "Back to library" },
  className = "py-16",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  home?: { href: string; label: string };
  className?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className={`rise mx-auto flex max-w-[520px] flex-col items-center text-center ${className}`}>
      <span className="grid size-16 place-items-center rounded-[20px] border border-red-200 bg-red-50 text-red-500 shadow-[0_18px_40px_-28px_rgba(200,35,26,0.6)]">
        <span className="serif-accent text-[34px] leading-none">!</span>
      </span>
      <p className="eyebrow mt-8">Error · something broke</p>
      <h1 className="mt-3 text-[34px] leading-tight tracking-[-0.04em] text-balance">
        This page didn’t <span className="serif-accent text-red-500">load</span>.
      </h1>
      <p className="mt-3 max-w-[42ch] text-sm text-ink-soft">
        Something went wrong on our side. Try again, and if it keeps happening, reload the page.
      </p>
      {error.digest && <p className="mt-3 font-mono text-[10px] tracking-[0.08em] text-muted uppercase">Ref · {error.digest}</p>}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => retry()} className="btn btn-red">
          <RotateCcw className="size-4" /> Try again
        </button>
        <Link href={home.href} className="btn btn-ghost">
          <ArrowLeft className="size-4" /> {home.label}
        </Link>
      </div>
    </div>
  );
}
