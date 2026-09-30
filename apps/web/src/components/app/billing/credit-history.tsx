"use client";

import Link from "next/link";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { TRIAL, type CreditEntry } from "@a2n/shared";
import { errorMessage } from "@/lib/api";
import { fmtTsDate } from "@/lib/format";
import { useCreditHistory } from "@/lib/queries";

/* Credit history (GET /api/billing/credits): what each change was for, in words. */

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** "42 min · 3 pages" for what an item charge (or refund) covered. */
export function boughtLabel(e: Pick<CreditEntry, "minutes" | "pages">): string | null {
  const parts = [e.minutes ? plural(e.minutes, "min", "min") : null, e.pages ? plural(e.pages, "page") : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function creditReason(e: CreditEntry): { title: string; detail: string | null; href: string | null } {
  const note = e.itemTitle ? `“${e.itemTitle}”` : "a note you’ve since deleted";
  const href = e.itemId && e.itemTitle ? `/app/i/${e.itemId}` : null;
  switch (e.reason) {
    case "grant":
      return { title: e.delta === TRIAL.credits ? "Trial credits added" : "Plan credits added", detail: "This billing cycle’s allowance", href: null };
    case "item":
      return { title: `Notes for ${note}`, detail: boughtLabel(e), href };
    case "item_refund":
      return { title: `Refund for ${note}`, detail: boughtLabel(e) ?? "Credits given back", href };
    case "chat":
      return { title: "AI chat message", detail: e.itemTitle ? `About ${note}, after the included messages ran out` : "After the included messages ran out", href };
    case "expire":
      return { title: "Unused credits expired", detail: "Credits don’t roll over to the next cycle", href: null };
    case "topup":
      return { title: "Top-up credits added", detail: null, href: null };
  }
}

export const fmtDelta = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("en-US")}`;

function EntryRow({ e }: { e: CreditEntry }) {
  const r = creditReason(e);
  const d = new Date(e.at);
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="w-[52px] shrink-0 font-mono text-[10px] tracking-[0.06em] text-muted uppercase">{fmtTsDate(e.at)}</span>
      <div className="min-w-0 flex-1">
        {r.href ? (
          <Link href={r.href} className="block truncate text-[14px] text-ink underline-offset-4 hover:underline">
            {r.title}
          </Link>
        ) : (
          <p className="truncate text-[14px] text-ink">{r.title}</p>
        )}
        {r.detail && <p className="truncate text-[12px] text-muted">{r.detail}</p>}
      </div>
      <span className={`shrink-0 font-mono text-[13px] tabular-nums ${e.delta > 0 ? "text-green-800" : "text-ink"}`} title={d.toISOString()}>
        {fmtDelta(e.delta)}
      </span>
    </li>
  );
}

/** Newest first, 50 at a time. */
export function CreditHistory() {
  const q = useCreditHistory();
  const entries = q.data?.pages.flatMap((p) => p.entries) ?? [];
  if (!q.data)
    return q.error ? (
      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-red-700" role="alert">
        <span className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {errorMessage(q.error)}
        </span>
        <button type="button" onClick={() => q.refetch()} disabled={q.isFetching} className="btn btn-ghost btn-sm">
          {q.isFetching ? <Loader2 className="spin size-3.5" /> : <RotateCcw className="size-3.5" />} Try again
        </button>
      </div>
    ) : (
      <div className="space-y-3" aria-busy="true" aria-label="Loading credit history">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-9 rounded-xl" />
        ))}
      </div>
    );
  if (!entries.length) return <p className="text-[13px] text-muted">No credit changes yet. Credits you’re given and spend show up here.</p>;
  return (
    <div>
      <ul className="divide-y divide-line">
        {entries.map((e) => (
          <EntryRow key={e.id} e={e} />
        ))}
      </ul>
      {q.hasNextPage && (
        <button type="button" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage} className="btn btn-ghost btn-sm mt-4">
          {q.isFetchingNextPage && <Loader2 className="spin size-3.5" />} Show older
        </button>
      )}
      {q.isFetchNextPageError && <p className="mt-2 text-[12px] text-red-600">{errorMessage(q.error)}</p>}
    </div>
  );
}
