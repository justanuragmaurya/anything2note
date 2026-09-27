import Link from "next/link";
import { ArrowUpRight, Check, Minus } from "lucide-react";
import { COMPARISON, type Cell } from "@/lib/mock/marketing-pricing";

function Value({ cell, pro }: { cell: Cell; pro?: boolean }) {
  if (cell === true)
    return (
      <span className="inline-flex items-center justify-center">
        <Check className={`size-4 ${pro ? "text-red-500" : "text-ink-soft"}`} strokeWidth={2.2} aria-hidden />
        <span className="sr-only">Included</span>
      </span>
    );
  if (cell === false)
    return (
      <span className="inline-flex items-center justify-center text-line-strong">
        <Minus className="size-4" aria-hidden />
        <span className="sr-only">Not included</span>
      </span>
    );
  return <span className={`text-[13px] tabular-nums sm:text-sm ${pro ? "font-medium text-ink" : "text-ink-soft"}`}>{cell}</span>;
}

/** Free vs Pro feature comparison: sticky header, grouped zebra rows on paper. */
export function ComparisonTable() {
  return (
    <table className="w-full border-separate border-spacing-0 text-left">
      <caption className="sr-only">Free and Pro plans compared, feature by feature</caption>
      <colgroup>
        <col />
        <col className="w-[92px] sm:w-[190px]" />
        <col className="w-[92px] sm:w-[190px]" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col" className="sticky top-[72px] z-20 border-b border-line-strong bg-paper shadow-[0_-72px_0_0_var(--paper)] py-4 pr-3 align-bottom backdrop-blur">
            <span className="eyebrow">Compare plans</span>
          </th>
          <th scope="col" className="sticky top-[72px] z-20 border-b border-line-strong bg-paper shadow-[0_-72px_0_0_var(--paper)] px-2 py-4 text-center align-bottom backdrop-blur">
            <span className="block text-[17px] font-normal tracking-[-0.03em]">Free</span>
            <Link href="/sign-in?next=/app/new" className="btn btn-ghost btn-sm mt-2 hidden bg-card/50 sm:inline-flex">
              Start free
            </Link>
          </th>
          <th scope="col" className="sticky top-[72px] z-20 border-b border-line-strong bg-paper shadow-[0_-72px_0_0_var(--paper)] px-2 py-4 text-center align-bottom backdrop-blur">
            <span className="flex items-center justify-center gap-1.5 text-[17px] font-normal tracking-[-0.03em]">
              <span aria-hidden className="size-2 rounded-full bg-red-500 shadow-[0_0_8px_#f65f48aa]" />
              Pro
            </span>
            <Link href="/sign-in?next=/app/settings%3Ftab%3Dbilling" className="btn btn-red btn-sm mt-2 hidden sm:inline-flex">
              Go Pro
              <ArrowUpRight className="btn-arrow size-3.5" />
            </Link>
          </th>
        </tr>
      </thead>
      {COMPARISON.map((group) => (
        <tbody key={group.title}>
          <tr>
            <th scope="colgroup" colSpan={3} className="pt-10 pb-3 text-left">
              <span className="inline-flex items-center gap-2 font-mono text-[10px] font-normal tracking-[0.14em] text-muted uppercase">
                <span className="size-1 rounded-full bg-red-500" />
                {group.title}
              </span>
            </th>
          </tr>
          {group.rows.map((row, i) => {
            const zebra = i % 2 === 0 ? "bg-card/80" : "";
            return (
              <tr key={row.feature} className="group">
                <th
                  scope="row"
                  className={`rounded-l-xl py-3.5 pr-3 pl-4 text-left font-normal transition-colors duration-200 group-hover:bg-panel/70 ${zebra}`}
                >
                  <span className="block text-[14px] leading-snug text-ink sm:text-[15px]">{row.feature}</span>
                  {row.hint && <span className="mt-0.5 block text-xs text-muted">{row.hint}</span>}
                </th>
                <td className={`px-2 py-3.5 text-center transition-colors duration-200 group-hover:bg-panel/70 ${zebra}`}>
                  <Value cell={row.free} />
                </td>
                <td className={`rounded-r-xl px-2 py-3.5 text-center transition-colors duration-200 group-hover:bg-panel/70 ${zebra}`}>
                  <Value cell={row.pro} pro />
                </td>
              </tr>
            );
          })}
        </tbody>
      ))}
    </table>
  );
}
