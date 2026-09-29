"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Paperclip, Mic } from "lucide-react";
import { Art } from "@/components/ui/art";
import type { ArtId } from "@/lib/art";

type Floater = {
  id: ArtId;
  className: string;
  width: string;
  rotate: number;
  delay: number;
  motion: "drift" | "bob";
  depth: number;
  tint: string;
};

// Positions echo Yield Theory's scattered bills; each object is a "source".
const FLOATERS: Floater[] = [
  { id: "hero-cassette", className: "left-[3%] top-[14%]", width: "w-[190px]", rotate: -14, delay: 100, motion: "drift", depth: 18, tint: "var(--red-100)" },
  { id: "hero-tv", className: "right-[4%] top-[12%]", width: "w-[170px]", rotate: 9, delay: 250, motion: "bob", depth: 14, tint: "var(--nt-tutorial)" },
  { id: "hero-mic", className: "left-[17%] top-[50%] hidden lg:block", width: "w-[92px]", rotate: 18, delay: 400, motion: "bob", depth: 26, tint: "var(--red-200)" },
  { id: "hero-pdf", className: "left-[4%] bottom-[4%] hidden md:block", width: "w-[170px]", rotate: -8, delay: 550, motion: "drift", depth: 12, tint: "var(--nt-reading)" },
  { id: "hero-polaroid", className: "right-[6%] bottom-[6%] hidden md:block", width: "w-[180px]", rotate: 12, delay: 700, motion: "drift", depth: 16, tint: "var(--card)" },
  { id: "hero-slides", className: "right-[19%] top-[46%] hidden lg:block", width: "w-[120px]", rotate: -10, delay: 850, motion: "bob", depth: 22, tint: "var(--nt-lecture)" },
];

const SOURCES = [
  "Record today's lecture in class…",
  "Paste a YouTube lecture link…",
  "Upload a 40-page research PDF…",
  "Snap the whiteboard before it's wiped…",
  "Add a podcast episode…",
  "Paste an article URL…",
];

function useTypewriter(lines: string[]) {
  const [text, setText] = useState("");
  useEffect(() => {
    let line = 0;
    let i = 0;
    let deleting = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = lines[line]!;
      if (!deleting) {
        i++;
        setText(full.slice(0, i));
        if (i === full.length) {
          deleting = true;
          t = setTimeout(tick, 1800);
          return;
        }
        t = setTimeout(tick, 38 + Math.random() * 40);
      } else {
        i--;
        setText(full.slice(0, i));
        if (i === 0) {
          deleting = false;
          line = (line + 1) % lines.length;
          t = setTimeout(tick, 300);
          return;
        }
        t = setTimeout(tick, 18);
      }
    };
    t = setTimeout(tick, 900);
    return () => clearTimeout(t);
  }, [lines]);
  return text;
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const typed = useTypewriter(SOURCES);

  // Gentle pointer parallax on the floating objects.
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        el.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
    };
    el.addEventListener("pointermove", onMove);
    return () => {
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={ref} className="paper-hero grain relative overflow-hidden">
      <div className="relative mx-auto min-h-[880px] max-w-[1600px]">
        {/* Floating sources */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {FLOATERS.map((f) => (
            <div
              key={f.id}
              className={`absolute ${f.className} ${f.width}`}
              style={{
                transform: `translate(calc(var(--px, 0) * ${f.depth}px), calc(var(--py, 0) * ${f.depth}px))`,
                transition: "transform 0.6s var(--ease-out)",
              }}
            >
              <div className="drop-in" style={{ animationDelay: `${f.delay}ms` }}>
                <div className={f.motion} style={{ animationDelay: `${f.delay}ms` }}>
                  <div style={{ rotate: `${f.rotate}deg` }} className="drop-shadow-[0_18px_24px_rgba(60,20,10,0.18)]">
                    <Art id={f.id} tint={f.tint} bare={false} sizes="200px" priority />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 px-6 pt-[140px] text-center">
          <Link
            href="/record-lectures"
            className="rise group inline-flex items-center gap-3 rounded-full border border-line bg-card/80 py-1.5 pr-1.5 pl-4 text-[13px] text-ink-soft backdrop-blur transition-colors hover:border-red-300"
            style={{ animationDelay: "0ms" }}
          >
            <span className="size-1.5 rounded-full bg-red-500 pulse-dot" />
            New · Record a lecture, get the notes
            <span className="grid size-6 place-items-center rounded-full bg-red-500 text-cream transition-transform duration-300 group-hover:translate-x-0.5">
              <ArrowRight className="size-3.5" />
            </span>
          </Link>

          <h1 className="display rise mx-auto mt-8 max-w-[900px]" style={{ animationDelay: "120ms" }}>
            Turn <span className="serif-accent text-red-500">anything</span> into notes worth keeping
          </h1>

          <p className="rise mx-auto mt-6 max-w-[560px] text-[17px] leading-relaxed text-ink-soft" style={{ animationDelay: "240ms" }}>
            Record a lecture in class, or drop in a YouTube link, PDF, slides or a whiteboard photo. Get detailed notes,
            flashcards, quizzes and every deadline mentioned — and an assistant that knows every word.
          </p>

          {/* Drop bar */}
          <div className="rise mx-auto mt-10 max-w-[620px]" style={{ animationDelay: "360ms" }}>
            <Link
              href="/sign-in?next=/app/new"
              className="group flex items-center gap-2 rounded-full border border-line-strong bg-card p-2 pl-5 text-left shadow-[0_18px_40px_-24px_rgba(60,20,10,0.45)] transition-all duration-300 hover:border-red-300 hover:shadow-[0_24px_50px_-24px_rgba(200,35,26,0.45)]"
            >
              <Paperclip className="size-4 shrink-0 text-muted transition-transform duration-300 group-hover:-rotate-12" />
              <span className="caret min-w-0 flex-1 truncate text-[15px] text-muted">{typed}</span>
              <span className="hidden items-center gap-1 rounded-full border border-line px-3 py-2 text-xs text-ink-soft sm:inline-flex">
                <Mic className="size-3.5 text-red-500" /> Record
              </span>
              <span className="btn btn-red">
                Make notes
                <ArrowUpRight className="btn-arrow size-4" />
              </span>
            </Link>
          </div>

          <div className="rise mt-6 flex items-center justify-center gap-7" style={{ animationDelay: "480ms" }}>
            <Link href="/#how" className="link-arrow text-ink">
              See how it works
              <ArrowRight className="size-4" />
            </Link>
            <span className="h-4 w-px bg-line-strong" />
            <span className="text-sm text-muted">7 days free · cancel anytime</span>
          </div>
        </div>

        {/* Centre art: sources landing in the notebook */}
        <div className="relative z-0 mx-auto mt-16 w-[min(560px,86vw)]">
          <div className="drop-in" style={{ animationDelay: "650ms" }}>
            <div className="bob" style={{ animationDuration: "7s" }}>
              <Art id="hero-notebook" tint="var(--red-100)" sizes="560px" priority />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
