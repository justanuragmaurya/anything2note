import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { NOTE_TYPES, OUTPUT_LABELS } from "@/lib/mock/note-types";
import { NoteTypeShape } from "./note-type-shape";
import { Reveal } from "@/components/ui/reveal";

const SEO: Record<string, string> = {
  lecture: "/lecture-notes",
  meeting: "/meeting-minutes",
  podcast: "/podcast-summary",
  reading: "/pdf-to-notes",
};

export function NoteTypeCards() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {NOTE_TYPES.map((nt, i) => (
        <Reveal key={nt.key} delay={i * 60}>
          <Link
            href={SEO[nt.key] ?? "/sign-in?next=/app/new"}
            className="group lift grain relative flex h-full min-h-[300px] flex-col rounded-[6px] p-5 shadow-[0_1px_2px_rgba(60,20,10,0.12)]"
            style={{ background: nt.color }}
          >
            <div className="h-[88px] origin-bottom transition-transform duration-500 ease-[var(--ease-spring)] group-hover:scale-y-[1.08]">
              <NoteTypeShape type={nt.key} />
            </div>
            <div className="mt-4 border-t border-ink/15 pt-4">
              <h3 className="serif-accent text-[30px] leading-none text-ink not-italic">{nt.label}</h3>
              <p className="mt-2 text-sm text-ink-soft">{nt.blurb}</p>
            </div>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {nt.defaults.map((o) => (
                <li key={o} className="rounded-full bg-cream/60 px-2.5 py-1 text-[11px] text-ink">
                  {OUTPUT_LABELS[o]}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex items-center justify-between pt-5 font-mono text-[10px] tracking-[0.12em] text-ink/70 uppercase">
              <span>
                {nt.defaults.length} outputs · +{nt.optional.length} extras
              </span>
              <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>
        </Reveal>
      ))}

      {/* Auto-detect card */}
      <Reveal delay={NOTE_TYPES.length * 60}>
        <Link
          href="/sign-in?next=/app/new"
          className="group lift relative flex h-full min-h-[300px] flex-col justify-between overflow-hidden rounded-[6px] bg-night p-5 text-night-text"
        >
          <div className="dots-night absolute inset-0 opacity-60" aria-hidden />
          <div className="relative">
            <Sparkles className="size-6 text-red-400 transition-transform duration-500 group-hover:rotate-45" />
            <h3 className="serif-accent mt-6 text-[34px] leading-none">Not sure?</h3>
            <p className="mt-3 max-w-[22ch] text-sm text-night-muted">
              Pick <span className="text-night-text">Auto-detect</span>. We read the first few minutes and suggest the right
              type. Change it any time.
            </p>
          </div>
          <span className="relative btn btn-cream btn-sm self-start">
            Try auto-detect
            <ArrowUpRight className="btn-arrow size-3.5" />
          </span>
        </Link>
      </Reveal>
    </div>
  );
}
