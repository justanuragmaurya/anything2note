import type { SampleDoc } from "@/lib/mock/marketing-samples";
import { SampleBlocks } from "./sample-blocks";

/** A sample output presented as a document window, like the workspace preview. */
export function SampleDocument({
  doc,
  accent,
  typeLabel,
  className = "",
}: {
  doc: SampleDoc;
  accent: string;
  typeLabel: string;
  className?: string;
}) {
  return (
    <article
      aria-label={`Sample output: ${doc.output}`}
      className={`overflow-hidden rounded-[28px] border border-line bg-card shadow-[0_40px_80px_-40px_rgba(60,20,10,0.45)] ${className}`}
    >
      <header className="flex items-center justify-between gap-4 border-b border-line bg-paper/60 px-5 py-3">
        <div className="flex items-center gap-3">
          <div aria-hidden className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </div>
          <span
            className="rounded-full px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] text-ink uppercase"
            style={{ background: accent }}
          >
            {typeLabel}
          </span>
        </div>
        <span className="hidden truncate font-mono text-[10px] tracking-[0.12em] text-muted uppercase sm:block">Read-only sample</span>
      </header>

      <div className="px-5 pt-6 pb-2 sm:px-8">
        <p className="eyebrow">{doc.output}</p>
        <p className="mt-2 font-mono text-[12px] break-words text-ink-soft">{doc.file}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {doc.meta.map((m) => (
            <li key={m} className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-muted uppercase">
              {m}
            </li>
          ))}
        </ul>
      </div>

      <div className="px-5 pt-4 pb-8 sm:px-8">
        <SampleBlocks blocks={doc.blocks} accent={accent} />
      </div>
    </article>
  );
}
