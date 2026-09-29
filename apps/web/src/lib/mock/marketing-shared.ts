/**
 * Mock data for read-only shared notes at /s/[slug].
 * Replace with `GET /share/:slug` once the API exists. Only `demo` resolves.
 */

import type { NoteTypeKey } from "@/lib/note-types";
import { NOT_MENTIONED, type SampleBlock } from "@/lib/mock/marketing-samples";

export type SharedTab = { value: string; label: string; blocks: SampleBlock[] };

export type SharedNote = {
  slug: string;
  title: string;
  noteType: NoteTypeKey;
  source: { kind: string; file: string; duration: string; recorded: string; speakers: string };
  sharedBy: string;
  updated: string;
  summary: string;
  tabs: SharedTab[];
};

const m = (min: number, sec = 0) => min * 60 + sec;

const DEMO: SharedNote = {
  slug: "demo",
  title: "PSY 101 · Lecture 6: Classical and operant conditioning",
  noteType: "lecture",
  source: {
    kind: "Class recording",
    file: "psy101-lecture-06-2026-09-24.m4a",
    duration: "51 min",
    recorded: "Thu, 24 Sep 2026",
    speakers: "Lecturer + 2 students",
  },
  sharedBy: "Shared by Aditi",
  updated: "Updated 25 Sep 2026",
  summary:
    "Pavlov's classical conditioning, Skinner's operant conditioning and why variable-ratio schedules are so hard to quit. Quiz 2 is on Tuesday; the reflection essay is due 9 October.",
  tabs: [
    {
      value: "notes",
      label: "Detailed notes",
      blocks: [
        { type: "heading", text: "1. Classical conditioning", anchor: { kind: "time", at: m(2, 10) } },
        {
          type: "paragraph",
          text: "Learning by association: a neutral stimulus paired with one that already triggers a response starts to trigger that response on its own. Pavlov's dogs began salivating at a bell that had been rung before feeding.",
        },
        {
          type: "bullets",
          items: [
            { text: "Unconditioned stimulus (food) → unconditioned response (salivation). No learning needed.", anchor: { kind: "time", at: m(4, 30) } },
            { text: "After pairing, the bell is a conditioned stimulus and salivating at it is a conditioned response.", anchor: { kind: "time", at: m(7, 15) } },
            { text: "Extinction: ring the bell without food often enough and the response fades. It can return after a break (spontaneous recovery).", anchor: { kind: "time", at: m(13, 40) } },
          ],
        },
        { type: "heading", text: "2. Operant conditioning", anchor: { kind: "time", at: m(19, 5) } },
        {
          type: "bullets",
          items: [
            { text: "Behaviour is shaped by its consequences: reinforcement makes it more likely, punishment makes it less likely.", anchor: { kind: "time", at: m(19, 50) } },
            { text: "Positive means something is added; negative means something is taken away. Negative reinforcement is not punishment.", anchor: { kind: "time", at: m(23, 25) } },
            { text: "Student question: is taking a painkiller for a headache negative reinforcement? Yes. The pain is removed, so you're more likely to reach for one next time.", anchor: { kind: "time", at: m(27, 10) } },
          ],
        },
        {
          type: "quote",
          text: "If you remember one thing from today: negative reinforcement still makes the behaviour more likely.",
          speaker: "Lecturer",
          anchor: { kind: "time", at: m(24, 40) },
        },
        { type: "heading", text: "3. Schedules of reinforcement", anchor: { kind: "time", at: m(33, 30) } },
        {
          type: "bullets",
          items: [
            { text: "Continuous reinforcement is the fastest to learn and the fastest to extinguish.", anchor: { kind: "time", at: m(34, 15) } },
            { text: "Variable-ratio schedules, like slot machines, give the highest and steadiest response rates.", anchor: { kind: "time", at: m(38, 50) } },
          ],
        },
        {
          type: "callout",
          label: "Flagged by the lecturer",
          text: "“Expect one question where you have to name the schedule from a real-life example.” Practise with the flashcards.",
        },
      ],
    },
    {
      value: "tasks",
      label: "Tasks & deadlines",
      blocks: [
        {
          type: "tasks",
          items: [
            { task: "Read Myers ch. 7, pp. 262–281", kind: "reading", due: "Mon, 28 Sep", anchor: { kind: "time", at: m(47, 5) }, done: true },
            { task: "Quiz 2: classical and operant conditioning", kind: "exam", due: "Tue, 29 Sep", anchor: { kind: "time", at: m(47, 40) } },
            { task: "Reflection essay: one conditioned habit of your own, 800 words", kind: "homework", due: "Fri, 9 Oct", anchor: { kind: "time", at: m(48, 55) } },
            { task: "Form groups of four for the observation project", kind: "project", due: NOT_MENTIONED, anchor: { kind: "time", at: m(50, 10) } },
          ],
        },
      ],
    },
    {
      value: "revision",
      label: "Revision points",
      blocks: [
        {
          type: "bullets",
          items: [
            { text: "Classical: involuntary responses learned by association. Operant: voluntary behaviour shaped by consequences.", anchor: { kind: "time", at: m(19, 5) } },
            { text: "Reinforcement always increases a behaviour; punishment always decreases it.", anchor: { kind: "time", at: m(19, 50) } },
            { text: "Positive = add something. Negative = take something away.", anchor: { kind: "time", at: m(23, 25) } },
            { text: "Variable-ratio: highest response rate and the most resistant to extinction.", anchor: { kind: "time", at: m(38, 50) } },
          ],
        },
      ],
    },
    {
      value: "glossary",
      label: "Glossary",
      blocks: [
        {
          type: "glossary",
          items: [
            { term: "Conditioned stimulus", def: "A once-neutral stimulus that triggers a response after being paired with an unconditioned stimulus." },
            { term: "Extinction", def: "The fading of a learned response when it's no longer paired with, or followed by, what reinforced it." },
            { term: "Negative reinforcement", def: "Removing something unpleasant after a behaviour, making that behaviour more likely." },
            { term: "Variable-ratio schedule", def: "Reinforcement after an unpredictable number of responses." },
          ],
        },
      ],
    },
    {
      value: "flashcards",
      label: "Flashcards",
      blocks: [
        {
          type: "flashcards",
          items: [
            { q: "In Pavlov's experiment, what was the conditioned stimulus?", a: "The bell, once it had been paired with food.", anchor: { kind: "time", at: m(7, 15) } },
            { q: "Is negative reinforcement a kind of punishment?", a: "No. It removes something unpleasant, so the behaviour becomes more likely.", anchor: { kind: "time", at: m(23, 25) } },
            { q: "What is spontaneous recovery?", a: "An extinguished response returning after a break.", anchor: { kind: "time", at: m(13, 40) } },
            { q: "Which schedule gives the highest response rate?", a: "Variable-ratio, the slot-machine schedule.", anchor: { kind: "time", at: m(38, 50) } },
          ],
        },
      ],
    },
  ],
};

const SHARED: Record<string, SharedNote> = { demo: DEMO };

export const SHARED_SLUGS = Object.keys(SHARED);

export function getSharedNote(slug: string): SharedNote | undefined {
  return Object.hasOwn(SHARED, slug) ? SHARED[slug] : undefined;
}
