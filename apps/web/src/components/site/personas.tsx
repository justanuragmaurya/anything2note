import { Art } from "@/components/ui/art";
import { Reveal } from "@/components/ui/reveal";
import type { ArtId } from "@/lib/art";

const PEOPLE: { art: ArtId; place: string; who: string; line: string; rotate: number; uses: string[] }[] = [
  {
    art: "persona-student",
    place: "Lecture hall · semester 3",
    who: "The student",
    line: "Four lectures a day, exams every month.",
    rotate: -4,
    uses: ["Lecture notes", "Flashcards", "Quiz"],
  },
  {
    art: "persona-teamlead",
    place: "Conference room · Tuesday",
    who: "The team lead",
    line: "Back-to-back calls, one person taking notes.",
    rotate: 1.5,
    uses: ["Minutes", "Action items", "Follow-up email"],
  },
  {
    art: "persona-researcher",
    place: "Library · 47 open tabs",
    who: "The researcher",
    line: "Papers, interviews and talks — all at once.",
    rotate: 3.5,
    uses: ["Summaries", "Key concepts", "Citations"],
  },
];

/** Polaroid row (Yield Theory "Everyone starts somewhere"). */
export function Personas() {
  return (
    <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-center md:gap-0">
      {PEOPLE.map((p, i) => (
        <Reveal key={p.who} delay={i * 100} className="md:-mx-2">
          <figure
            className="w-[280px] bg-card p-3.5 pb-6 shadow-[0_18px_40px_-20px_rgba(60,20,10,0.4)] transition-all duration-500 ease-[var(--ease-spring)] hover:z-10 hover:!rotate-0 hover:scale-[1.04]"
            style={{ rotate: `${p.rotate}deg`, marginTop: i === 1 ? 0 : 18 }}
          >
            <Art id={p.art} tint="var(--panel)" className="!rounded-none" sizes="280px" />
            <figcaption className="mt-4 text-center">
              <p className="font-mono text-[9px] tracking-[0.16em] text-muted uppercase">{p.place}</p>
              <p className="serif-accent mt-1.5 text-2xl not-italic">{p.who}</p>
              <p className="serif-accent text-[15px] text-ink-soft">{p.line}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-1">
                {p.uses.map((u) => (
                  <span key={u} className="rounded-full border border-line px-2 py-0.5 text-[10px] text-ink-soft">
                    {u}
                  </span>
                ))}
              </div>
            </figcaption>
          </figure>
        </Reveal>
      ))}
    </div>
  );
}
