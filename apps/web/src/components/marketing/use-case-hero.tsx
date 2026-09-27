import Link from "next/link";
import { ArrowDown, ArrowLeft } from "lucide-react";
import { Art } from "@/components/ui/art";
import type { UseCase } from "@/lib/mock/marketing-use-cases";
import { noteType } from "@/lib/mock/note-types";
import { DropBar } from "./drop-bar";

/** Simpler paper hero for use-case pages: one floating object, the drop bar. */
export function UseCaseHero({ uc }: { uc: UseCase }) {
  const next = `/app/new?type=${uc.noteType}`;
  const nt = noteType(uc.noteType);
  return (
    <section className="paper-hero grain relative overflow-hidden">
      <div className="relative mx-auto max-w-[1400px]">
        {/* One floating source object (desktop only) */}
        <div aria-hidden className="pointer-events-none absolute top-[150px] right-[3%] hidden w-[190px] xl:block">
          <div className="drop-in" style={{ animationDelay: "500ms" }}>
            <div className="bob" style={{ animationDuration: "6s" }}>
              <div style={{ rotate: "9deg" }} className="drop-shadow-[0_18px_24px_rgba(60,20,10,0.18)]">
                <Art id={uc.art} tint={uc.artTint} sizes="200px" priority />
              </div>
            </div>
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute bottom-[70px] left-[4%] hidden w-[120px] xl:block">
          <div className="drop-in" style={{ animationDelay: "700ms" }}>
            <div className="drift">
              <div
                style={{ rotate: "-8deg", background: nt.color }}
                className="grain rounded-[6px] p-3 shadow-[0_18px_30px_-16px_rgba(60,20,10,0.35)]"
              >
                <span className="font-mono text-[9px] tracking-[0.14em] text-ink/60 uppercase">Note type</span>
                <span className="serif-accent mt-1 block text-[22px] leading-none text-ink not-italic">{nt.label}</span>
                <span className="mt-2 block font-mono text-[9px] tracking-[0.12em] text-ink/60 uppercase">{nt.defaults.length} outputs</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-6 pt-[132px] pb-24 text-center md:pt-[150px] md:pb-28">
          <Link
            href="/#note-types"
            className="rise group inline-flex items-center gap-2.5 rounded-full border border-line bg-card/80 py-1.5 pr-4 pl-1.5 text-[13px] text-ink-soft backdrop-blur transition-colors hover:border-red-300"
          >
            <span className="grid size-6 place-items-center rounded-full bg-panel text-ink transition-transform duration-300 group-hover:-translate-x-0.5">
              <ArrowLeft className="size-3.5" />
            </span>
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase">{uc.eyebrow}</span>
          </Link>

          <h1 className="display rise mx-auto mt-8 max-w-[940px]" style={{ animationDelay: "120ms" }}>
            {uc.title.before} <span className="serif-accent text-red-500">{uc.title.accent}</span>
            {uc.title.after ? ` ${uc.title.after}` : ""}
          </h1>

          <p className="rise mx-auto mt-6 max-w-[580px] text-[17px] leading-relaxed text-ink-soft" style={{ animationDelay: "240ms" }}>
            {uc.sub}
          </p>

          <div className="rise mx-auto mt-10 max-w-[620px]" style={{ animationDelay: "360ms" }}>
            <DropBar
              placeholders={uc.source.placeholders}
              source={uc.source.icon}
              sourceLabel={uc.source.kind}
              href={`/sign-in?next=${encodeURIComponent(next)}`}
            />
          </div>

          <div className="rise mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-3" style={{ animationDelay: "480ms" }}>
            <a href="#sample" className="link-arrow text-ink">
              See a real sample
              <ArrowDown className="size-4" />
            </a>
            <span className="hidden h-4 w-px bg-line-strong sm:block" />
            <span className="text-sm text-muted">Free · no card needed</span>
          </div>
        </div>
      </div>
    </section>
  );
}
