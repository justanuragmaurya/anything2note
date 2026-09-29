import Link from "next/link";
import { ArrowUpRight, Check, Minus } from "lucide-react";
import { PLANS, type PlanKey } from "@a2n/shared";
import { planHref } from "@/components/site/pricing";
import { COMPARISON, type Cell } from "@/lib/mock/marketing-pricing";

const FEATURED: PlanKey = "plus";

function Value({ cell, featured }: { cell: Cell; featured?: boolean }) {
  if (cell === true)
    return (
      <span className="inline-flex items-center justify-center">
        <Check className={`size-4 ${featured ? "text-red-500" : "text-ink-soft"}`} strokeWidth={2.2} aria-hidden />
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
  return <span className={`text-[13px] tabular-nums sm:text-sm ${featured ? "font-medium text-ink" : "text-ink-soft"}`}>{cell}</span>;
}

const headCls = "sticky top-[72px] z-20 border-b border-line-strong bg-paper shadow-[0_-72px_0_0_var(--paper)] py-4 align-bottom backdrop-blur";

/** Starter vs Plus vs Pro, feature by feature: sticky header, grouped zebra rows on paper. */
export function ComparisonTable() {
  return (
    <table className="w-full border-separate border-spacing-0 text-left">
      <caption className="sr-only">Starter, Plus and Pro plans compared, feature by feature</caption>
      <colgroup>
        <col />
        {PLANS.map((p) => (
          <col key={p.key} className="w-[72px] sm:w-[150px]" />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th scope="col" className={`${headCls} pr-3`}>
            <span className="eyebrow">Compare plans</span>
          </th>
          {PLANS.map((p) => (
            <th key={p.key} scope="col" className={`${headCls} px-1.5 text-center`}>
              <span className="flex items-center justify-center gap-1.5 text-[15px] font-normal tracking-[-0.03em] sm:text-[17px]">
                {p.key === FEATURED && <span aria-hidden className="size-2 rounded-full bg-red-500 shadow-[0_0_8px_#f65f48aa]" />}
                {p.name}
              </span>
              <span className="mt-0.5 block font-mono text-[11px] text-muted">${p.price}/mo</span>
              <Link href={planHref(p.key)} className={`btn btn-sm mt-2 hidden sm:inline-flex ${p.key === FEATURED ? "btn-red" : "btn-ghost bg-card/50"}`}>
                Try free
                {p.key === FEATURED && <ArrowUpRight className="btn-arrow size-3.5" />}
              </Link>
            </th>
          ))}
        </tr>
      </thead>
      {COMPARISON.map((group) => (
        <tbody key={group.title}>
          <tr>
            <th scope="colgroup" colSpan={PLANS.length + 1} className="pt-10 pb-3 text-left">
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
                {PLANS.map((p, j) => (
                  <td
                    key={p.key}
                    className={`px-1.5 py-3.5 text-center transition-colors duration-200 group-hover:bg-panel/70 ${j === PLANS.length - 1 ? "rounded-r-xl" : ""} ${zebra}`}
                  >
                    <Value cell={row[p.key]} featured={p.key === FEATURED} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      ))}
    </table>
  );
}
