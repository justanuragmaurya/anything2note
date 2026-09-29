import { Check, Quote } from "lucide-react";
import { NOT_MENTIONED, TASK_KIND_LABELS, type SampleBlock } from "@/lib/mock/marketing-samples";
import { AnchorChip } from "./anchor-chip";
import { FlipCard } from "./flip-card";

const muted = (v: string) => (v === NOT_MENTIONED ? "italic text-muted" : "text-ink-soft");

function Block({ block, accent }: { block: SampleBlock; accent: string }) {
  switch (block.type) {
    case "fields":
      return (
        <dl className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-3 rounded-2xl border border-line bg-paper/60 p-4 sm:grid-cols-2">
          {block.rows.map((r) => (
            <div key={r.label} className="min-w-0">
              <dt className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">{r.label}</dt>
              <dd className={`mt-0.5 text-sm ${muted(r.value)}`}>{r.value}</dd>
            </div>
          ))}
        </dl>
      );

    case "heading":
      return (
        <h4 className="flex flex-wrap items-center gap-2 pt-2 text-[17px] font-medium tracking-[-0.02em] text-ink">
          {block.text}
          {block.anchor && <AnchorChip anchor={block.anchor} />}
        </h4>
      );

    case "paragraph":
      return (
        <p className="text-[15px] leading-relaxed text-ink-soft">
          {block.text} {block.anchor && <AnchorChip anchor={block.anchor} />}
        </p>
      );

    case "bullets":
      return (
        <ul className="space-y-2">
          {block.items.map((it) => (
            <li key={it.text} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
              <span className="mt-[9px] size-1.5 shrink-0 rounded-full" style={{ background: accent }} />
              <span>
                {it.text} {it.anchor && <AnchorChip anchor={it.anchor} />}
              </span>
            </li>
          ))}
        </ul>
      );

    case "numbered":
      return (
        <ol className="space-y-3">
          {block.items.map((it, i) => (
            <li
              key={it.title}
              className="rounded-2xl border border-line p-4 transition-colors duration-200 hover:border-line-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium tracking-[-0.01em] text-ink">
                  <span className="mr-2 font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                  {it.title}
                </p>
                {it.anchor && <AnchorChip anchor={it.anchor} />}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{it.body}</p>
            </li>
          ))}
        </ol>
      );

    case "tasks":
      return (
        <ul className="space-y-2">
          {block.items.map((a) => (
            <li key={a.task} className="flex items-start gap-3 rounded-2xl border border-line p-4">
              <span
                aria-hidden
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border ${
                  a.done ? "border-red-500 bg-red-500 text-cream" : "border-line-strong"
                }`}
              >
                {a.done && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${a.done ? "text-muted line-through" : "text-ink"}`}>
                  {a.task}
                  {a.done && <span className="sr-only"> (done)</span>}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] text-ink"
                    style={{ background: `color-mix(in oklab, ${accent} 55%, transparent)` }}
                  >
                    {TASK_KIND_LABELS[a.kind]}
                  </span>
                  <span className={muted(a.due)}>
                    <span className="not-italic text-muted">Due · </span>
                    {a.due}
                  </span>
                  {a.anchor && <AnchorChip anchor={a.anchor} />}
                </div>
              </div>
            </li>
          ))}
        </ul>
      );

    case "flashcards":
      return (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          {block.items.map((c, i) => (
            <FlipCard key={c.q} q={c.q} a={c.a} anchor={c.anchor} index={i} total={block.items.length} color={accent} />
          ))}
        </div>
      );

    case "qa":
      return (
        <div className="space-y-3">
          {block.items.map((it) => (
            <div key={it.q} className="rounded-2xl border border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium tracking-[-0.01em] text-ink">
                  <span className="mr-2 font-mono text-xs text-red-600">Q</span>
                  {it.q}
                </p>
                {it.anchor && <AnchorChip anchor={it.anchor} />}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                <span className="mr-2 font-mono text-xs text-muted">A</span>
                {it.speaker && <span className="font-medium text-ink">{it.speaker}: </span>}
                {it.a}
              </p>
            </div>
          ))}
        </div>
      );

    case "chapters":
      return (
        <ol className="relative ml-2 border-l border-dashed border-line-strong">
          {block.items.map((c) => (
            <li key={c.title} className="group relative pb-5 pl-6 last:pb-0">
              <span
                aria-hidden
                className="absolute top-1.5 -left-[5px] size-[9px] rounded-full border border-line-strong bg-card transition-colors duration-200 group-hover:border-red-400 group-hover:bg-red-500"
              />
              <div className="flex flex-wrap items-center gap-2">
                <AnchorChip anchor={c.anchor} />
                <p className="font-medium tracking-[-0.01em] text-ink">{c.title}</p>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{c.summary}</p>
            </li>
          ))}
        </ol>
      );

    case "quote":
      return (
        <figure className="relative rounded-2xl border border-line bg-paper/70 p-5 pl-12">
          <Quote aria-hidden className="absolute top-5 left-4 size-4 text-red-500" />
          <blockquote className="serif-accent text-[21px] leading-snug text-ink">{block.text}</blockquote>
          <figcaption className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
            {block.speaker}
            {block.anchor && <AnchorChip anchor={block.anchor} />}
          </figcaption>
        </figure>
      );

    case "callout":
      return (
        <div className="rounded-2xl bg-night p-4 text-night-text">
          <p className="font-mono text-[10px] tracking-[0.14em] text-red-300 uppercase">{block.label}</p>
          <p className="mt-1.5 text-sm leading-relaxed">{block.text}</p>
        </div>
      );

    case "glossary":
      return (
        <dl className="divide-y divide-line rounded-2xl border border-line">
          {block.items.map((g) => (
            <div key={g.term} className="grid grid-cols-[minmax(0,1fr)] gap-1 p-4 sm:grid-cols-[160px_1fr] sm:gap-4">
              <dt className="serif-accent text-[18px] leading-tight text-ink">{g.term}</dt>
              <dd className="text-sm leading-relaxed text-ink-soft">{g.def}</dd>
            </div>
          ))}
        </dl>
      );
  }
}

/** Renders a list of read-only sample output blocks. */
export function SampleBlocks({ blocks, accent = "var(--nt-general)" }: { blocks: SampleBlock[]; accent?: string }) {
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => (
        <Block key={i} block={b} accent={accent} />
      ))}
    </div>
  );
}
