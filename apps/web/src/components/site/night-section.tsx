import { Check, Clock, Globe2, Lock, MessageSquareText, Timer, Languages } from "lucide-react";
import { CornerFrame } from "@/components/ui/corner-frame";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";

const SCRAPS = [
  { tag: "P0", title: "When is the essay due??", body: "Said on the way out. Again.", x: "4%", y: "18%", r: -3 },
  { tag: "P1", title: "Rewatching at 2×", body: "Lecture 7, for the third time.", x: "34%", y: "8%", r: 2 },
  { tag: "P0", title: "What did she say at 23:14?", body: "Scrubbing a 90-min class recording…", x: "18%", y: "46%", r: 1 },
  { tag: "P2", title: "47 open tabs", body: "Papers you'll 'read later'.", x: "50%", y: "40%", r: -2 },
  { tag: "P1", title: "Whiteboard wiped", body: "The photo is blurry.", x: "8%", y: "72%", r: 2 },
  { tag: "P0", title: "Exam on Friday", body: "No flashcards. No summary.", x: "44%", y: "70%", r: -1 },
];

const FEATURES = [
  { icon: Timer, title: "Anchored to the second", body: "Every note, card and task links back to the timestamp or page it came from. Click to jump." },
  { icon: Lock, title: "Private by default", body: "Uploads, recordings and documents are yours alone. Turn on one setting and originals are deleted once your notes are made." },
  { icon: MessageSquareText, title: "Chat with every item", body: "Ask follow-ups. The assistant cites exact moments and pages, and never makes up facts or dates." },
  { icon: Languages, title: "Notes in your language", body: "Source in Hindi, notes in English — or any mix. Output language is a toggle, not a workaround." },
  { icon: Clock, title: "First output in minutes", body: "The primary output streams in first, the rest follow. Captions-first for YouTube keeps it fast." },
  { icon: Globe2, title: "Web, iOS and Android", body: "Record on your phone, review on your laptop. Flashcards and tasks work offline." },
];

export function NightSection() {
  return (
    <section data-nav-tone="night" className="relative overflow-hidden bg-night text-night-text">
      <div className="dots-night absolute inset-y-0 left-0 w-4 md:w-10" aria-hidden />
      <div className="dots-night absolute inset-y-0 right-0 w-4 md:w-10" aria-hidden />
      <div aria-hidden className="dashed-rail absolute inset-y-0 left-4 w-px md:left-10" />
      <div aria-hidden className="dashed-rail absolute inset-y-0 right-4 w-px md:right-10" />

      <div className="mx-auto max-w-[1200px] px-6 py-28 md:px-16">
        <Reveal className="text-center">
          <p className="eyebrow !text-night-muted">Before · after</p>
          <h2 className="h-section mx-auto mt-4 max-w-[760px]">
            Stop re-watching. Start <span className="serif-accent text-red-400">remembering.</span>
          </h2>
        </Reveal>

        <Reveal delay={120} className="mt-16">
          <CornerFrame className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-2">
            {/* Chaos side */}
            <div className="relative min-h-[420px] overflow-hidden border-b border-night-line p-8 md:border-r md:border-b-0">
              <h3 className="relative z-10 text-center text-[28px] leading-tight tracking-[-0.03em] md:text-[34px]">
                Taking notes <span className="serif-accent">by hand</span>
              </h3>
              {/* dithered bars */}
              <div aria-hidden className="absolute inset-x-6 top-1/2 flex h-24 -translate-y-1/2 items-end gap-[3px] opacity-40">
                {Array.from({ length: 60 }).map((_, i) => (
                  <span
                    key={i}
                    className="flex-1 bg-[radial-gradient(var(--red-400)_1px,transparent_1.2px)] bg-[length:4px_4px]"
                    style={{ height: `${Math.round(20 + Math.abs(Math.sin(i * 1.7)) * 80)}%` }}
                  />
                ))}
              </div>
              <div className="relative mt-6 h-[320px]">
                {SCRAPS.map((s, i) => (
                  <div
                    key={s.title}
                    className="absolute w-[190px] rounded-lg border border-dashed border-night-line bg-night-2/90 p-3 text-[13px] backdrop-blur-sm transition-transform duration-300 hover:z-10 hover:scale-105"
                    style={{ left: s.x, top: s.y, rotate: `${s.r}deg`, animationDelay: `${i * 400}ms` }}
                  >
                    <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-[10px] text-red-300">{s.tag}</span>
                    <p className="mt-1.5 text-night-text">{s.title}</p>
                    <p className="text-night-muted">{s.body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Calm side */}
            <div className="relative flex min-h-[420px] flex-col items-center overflow-hidden bg-red-500 p-8 text-cream">
              <div
                aria-hidden
                className="absolute inset-0 opacity-30 mix-blend-overlay"
                style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1.2px)", backgroundSize: "5px 5px" }}
              />
              <div aria-hidden className="absolute -bottom-40 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#ffd6a8_0%,#ff8a5c55_40%,transparent_70%)] blur-2xl" />
              <h3 className="relative text-center text-[28px] leading-tight tracking-[-0.03em] md:text-[34px]">
                Letting <span className="serif-accent">anything2note</span> do it
              </h3>
              <div aria-hidden className="absolute top-1/2 right-0 left-[-1px] border-t border-dotted border-cream/50" />
              <div className="relative my-auto flex items-center gap-3 rounded-xl border border-cream/30 bg-cream/15 px-5 py-3.5 text-[15px] backdrop-blur">
                <Check className="size-4" />
                <span>
                  One 52-min lecture → <CountUp to={14} className="font-medium" /> outputs, all linked to the minute
                </span>
              </div>
              <ul className="relative grid w-full max-w-sm grid-cols-2 gap-2 text-[13px]">
                {["Detailed notes", "3 deadlines caught", "42 flashcards", "Quiz: 9/10"].map((t) => (
                  <li key={t} className="flex items-center gap-2 rounded-lg bg-cream/10 px-3 py-2">
                    <span className="size-1.5 rounded-full bg-cream" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </CornerFrame>
        </Reveal>

        <Reveal delay={100} className="mt-20">
          <CornerFrame className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`group relative p-8 transition-colors duration-300 hover:bg-night-2 ${
                    i % 3 !== 2 ? "lg:border-r" : ""
                  } ${i < 3 ? "lg:border-b" : ""} border-night-line max-lg:border-b sm:max-lg:odd:border-r`}
                >
                  <Icon className="size-6 text-night-text transition-all duration-300 group-hover:-translate-y-0.5 group-hover:text-red-400" strokeWidth={1.4} />
                  <h4 className="mt-6 text-lg font-medium tracking-[-0.02em]">{f.title}</h4>
                  <p className="mt-2 text-[15px] leading-relaxed text-night-muted">{f.body}</p>
                </div>
              );
            })}
          </CornerFrame>
        </Reveal>
      </div>
    </section>
  );
}
