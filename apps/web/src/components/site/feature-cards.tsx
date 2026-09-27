import { Art } from "@/components/ui/art";
import { Reveal } from "@/components/ui/reveal";
import type { ArtId } from "@/lib/art";

const CARDS: { art: ArtId; bg: string; kicker: string; title: React.ReactNode; body: string; footer: string }[] = [
  {
    art: "feature-study",
    bg: "var(--nt-lecture)",
    kicker: "01 · Study",
    title: (
      <>
        Learn it <span className="serif-accent">once.</span>
      </>
    ),
    body: "Detailed notes, revision bullets and glossary — then flashcards on a spaced-repetition schedule and quizzes that find your weak spots.",
    footer: "Flashcards · Quizzes · FSRS reviews",
  },
  {
    art: "feature-meeting",
    bg: "var(--nt-meeting)",
    kicker: "02 · Meet",
    title: (
      <>
        Leave with <span className="serif-accent">minutes.</span>
      </>
    ),
    body: "Proper minutes of meeting, decisions and action items with owners — tracked across every meeting, tickable, and ready to email.",
    footer: "Minutes · Action items · Speakers",
  },
  {
    art: "feature-assistant",
    bg: "var(--nt-interview)",
    kicker: "03 · Ask",
    title: (
      <>
        Talk to your <span className="serif-accent">notes.</span>
      </>
    ),
    body: "Every item comes with an assistant that answers with timestamps and page numbers — a tutor for lectures, a chief of staff for meetings.",
    footer: "Cited answers · Any language",
  },
];

export function FeatureCards() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
      {CARDS.map((c, i) => (
        <Reveal key={c.kicker} delay={i * 90}>
          <article className="group lift grain flex h-full flex-col p-7" style={{ background: c.bg }}>
            <p className="font-mono text-[10px] tracking-[0.14em] text-ink/60 uppercase">{c.kicker}</p>
            <h3 className="mt-3 text-[34px] leading-[1.05] tracking-[-0.04em]">{c.title}</h3>
            <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-ink-soft">{c.body}</p>
            <div className="my-8 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-translate-y-1 group-hover:scale-[1.03]">
              <Art id={c.art} tint={c.bg} sizes="400px" />
            </div>
            <p className="mt-auto font-mono text-[10px] tracking-[0.14em] text-ink/70 uppercase">{c.footer}</p>
          </article>
        </Reveal>
      ))}
    </div>
  );
}
