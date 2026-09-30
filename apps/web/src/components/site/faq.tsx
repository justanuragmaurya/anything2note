"use client";

import { useState } from "react";
import { ChevronDown, CreditCard, FileQuestion, HelpCircle, Lock, Sparkles } from "lucide-react";
import { SlidingTabs } from "@/components/ui/sliding-tabs";

type Cat = "general" | "privacy" | "outputs" | "billing";

const FAQS: Record<Cat, { q: string; a: string }[]> = {
  general: [
    { q: "What can I upload?", a: "YouTube links, audio (mp3, m4a, wav…) and video (mp4, mov…) up to 2 GB, in-app recordings of your classes, PDFs with a text layer, Word and PowerPoint files, photos of whiteboards or handwritten notes (PNG, JPEG or WebP), web articles and pasted text. Scanned PDFs and HEIC photos aren’t supported yet: upload a photo of each page, or export HEIC as JPEG." },
    { q: "How long does it take?", a: "Your first output usually lands within a couple of minutes; the rest stream in right after. Captioned YouTube videos are the fastest." },
    { q: "Does it work for Hindi and other languages?", a: "Yes. Transcription handles most major languages, and you can pick a different output language — Hindi lecture, English notes." },
  ],
  privacy: [
    { q: "Who can see my recordings and documents?", a: "Only you. Uploads, recordings, documents, URLs and pasted text are private and never shared or reused across users. Only public YouTube videos are processed once and cached." },
    { q: "Can originals be deleted automatically?", a: "Yes. Turn on “Delete originals after processing” in Settings and uploaded files and recordings are deleted once their notes are made. It’s off until you turn it on. Your notes, transcript and flashcards stay." },
    { q: "Do you train models on my data?", a: "No. Your content is sent to AI providers only to generate your outputs." },
  ],
  outputs: [
    { q: "What if it gets a due date wrong?", a: "Tasks & deadlines say “not mentioned” instead of guessing a date, every item links to the exact moment it came from, and everything is editable." },
    { q: "Can I add outputs after the fact?", a: "Anytime. Open an item, hit “+ Add output” and pick key formulas for a lecture, a quiz for a podcast — whatever you need." },
    { q: "Can I export?", a: "Yes, on every plan: PDF, Word or Markdown for notes, and Anki CSV for flashcards and tasks. You can also share a read-only link." },
  ],
  billing: [
    { q: "What currency do you charge in?", a: "USD, at the same price everywhere. Your bank converts it to your local currency if needed." },
    { q: "Can I cancel anytime?", a: "Yes, even during the 7-day trial. Your plan keeps working until the end of the period you paid for." },
    { q: "I subscribed on my phone. Does it work on web?", a: "Yes — one account, one plan, across web, iOS and Android." },
  ],
};

const ICONS = [HelpCircle, FileQuestion, Sparkles, Lock, CreditCard];

/** Pill category tabs + accordion (Yield Theory FAQ). */
export function Faq() {
  const [cat, setCat] = useState<Cat>("general");
  const [open, setOpen] = useState<number>(0);

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="flex justify-center overflow-x-auto pb-1">
        <SlidingTabs
          tone="ink"
          value={cat}
          onChange={(c) => {
            setCat(c);
            setOpen(0);
          }}
          ariaLabel="FAQ category"
          items={[
            { value: "general", label: "General" },
            { value: "privacy", label: "Privacy" },
            { value: "outputs", label: "Outputs" },
            { value: "billing", label: "Billing" },
          ]}
        />
      </div>

      <ul key={cat} className="mt-10">
        {FAQS[cat].map((f, i) => {
          const Icon = ICONS[i % ICONS.length]!;
          const isOpen = open === i;
          return (
            <li key={f.q} className="rise border-b border-line" style={{ animationDelay: `${i * 60}ms` }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="group flex w-full items-center gap-4 py-5 text-left"
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-lg border transition-colors duration-300 ${
                    isOpen ? "border-red-300 bg-red-50 text-red-600" : "border-line-strong text-ink-soft"
                  }`}
                >
                  <Icon className="size-4" strokeWidth={1.5} />
                </span>
                <span className="flex-1 text-[15px] font-medium tracking-[-0.01em]">{f.q}</span>
                <ChevronDown
                  className={`size-4 text-muted transition-transform duration-300 ${isOpen ? "rotate-180" : "group-hover:translate-y-0.5"}`}
                />
              </button>
              <div className="accordion-body" data-open={isOpen}>
                <div>
                  <p className="pr-8 pb-6 pl-[52px] text-[15px] leading-relaxed text-ink-soft">{f.a}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
