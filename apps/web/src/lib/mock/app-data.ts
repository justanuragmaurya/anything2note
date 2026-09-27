/**
 * Mock data for the logged-in app (/app/*). Shapes loosely follow plan.md §2 and §6
 * so they can be swapped for `api-client` calls later.
 */

import { noteType, type NoteTypeKey, type OutputKey } from "./note-types";

/** Fixed "now" so server and client render the same relative dates. */
export const NOW = new Date("2026-09-27T10:30:00+05:30").getTime();

/* ─────────────────────────── Types ─────────────────────────── */

export type SourceKind = "youtube" | "audio" | "video" | "recording" | "pdf" | "slides" | "image" | "text" | "web";

export const SOURCE_LABELS: Record<SourceKind, string> = {
  youtube: "YouTube",
  audio: "Audio",
  video: "Video",
  recording: "Recording",
  pdf: "PDF",
  slides: "Slides",
  image: "Image",
  text: "Text",
  web: "Web page",
};

export type ProcessingStep = "extracting" | "transcribing" | "generating";

export type ItemStatus =
  | { state: "ready" }
  | { state: "processing"; step: ProcessingStep; progress: number }
  | { state: "failed"; error: string };

export type LibraryItem = {
  id: string;
  title: string;
  noteType: NoteTypeKey;
  source: SourceKind;
  /** File name, channel or domain */
  sourceLabel: string;
  durationSec?: number;
  pages?: number;
  createdAt: number;
  folder?: string;
  outputs: OutputKey[];
  status: ItemStatus;
  flashcardsDue?: number;
};

export type Anchor = { kind: "time"; at: number } | { kind: "page"; page: number };

export const t = (at: number): Anchor => ({ kind: "time", at });
export const p = (page: number): Anchor => ({ kind: "page", page });

export type ActionItem = {
  id: string;
  task: string;
  /** null → "Not mentioned" */
  owner: string | null;
  /** ISO date (yyyy-mm-dd) or null → "Not mentioned" */
  due: string | null;
  anchor: Anchor;
  done: boolean;
};

export type Minutes = {
  title: string;
  date: string;
  duration: string;
  attendees: string[];
  agenda: { title: string; anchor: Anchor; discussion: string[] }[];
  decisions: { text: string; anchor: Anchor }[];
  actions: ActionItem[];
  openQuestions: { text: string; anchor: Anchor }[];
  nextSteps: string[];
  nextMeeting: string | null;
};

export type NoteSection = { heading: string; anchor: Anchor; body: string[]; bullets?: string[] };

export type Flashcard = { id: string; front: string; back: string; anchor: Anchor; topic: string };

export type QuizQuestion = {
  id: string;
  q: string;
  options: string[];
  correct: number;
  explanation: string;
  anchor: Anchor;
  topic: string;
};

export type GenericBlock = { title?: string; text: string; anchor?: Anchor };

export type OutputData =
  | { type: "minutes"; data: Minutes }
  | { type: "actions"; items: ActionItem[] }
  | { type: "decisions"; items: { text: string; context: string; anchor: Anchor }[] }
  | { type: "notes"; sections: NoteSection[] }
  | { type: "summary"; tldr: string; points: { text: string; anchor: Anchor }[] }
  | { type: "flashcards"; cards: Flashcard[] }
  | { type: "quiz"; questions: QuizQuestion[] }
  | { type: "generic"; intro?: string; blocks: GenericBlock[] };

export type TranscriptLine = { id: string; speaker: string; anchor: Anchor; text: string };

export type PdfPage = { page: number; heading: string; lines: string[] };

export type ChatReply = { keywords: string[]; text: string; citations: Anchor[] };

export type Workspace = {
  item: LibraryItem;
  viewer: { kind: "media"; durationSec: number; label: string; video: boolean } | { kind: "pdf"; pages: PdfPage[]; label: string };
  speakers: Record<string, string>;
  transcript: TranscriptLine[];
  outputs: Partial<Record<OutputKey, OutputData>>;
  chat: { suggestions: string[]; replies: ChatReply[]; fallback: Omit<ChatReply, "keywords"> };
};

/* ─────────────────────────── User & usage ─────────────────────────── */

export const USER = {
  name: "Anurag",
  fullName: "Anurag Maurya",
  email: "anurag@example.com",
  plan: "Free" as "Free" | "Pro",
  streak: 12,
  usage: {
    mediaMin: 84,
    mediaLimit: 120,
    pages: 31,
    pagesLimit: 50,
    chatToday: 14,
    chatLimit: 30,
    resetsOn: "1 Oct",
  },
};

export const FOLDERS = [
  { id: "all", name: "All items" },
  { id: "product", name: "Product syncs" },
  { id: "calculus", name: "Calculus II" },
  { id: "research", name: "Research reading" },
  { id: "podcasts", name: "Podcasts" },
];

/* ─────────────────────────── Library ─────────────────────────── */

const H = 3600_000;
const D = 24 * H;

export const LIBRARY: LibraryItem[] = [
  {
    id: "new-onboarding-sync",
    title: "Onboarding revamp: design crit",
    noteType: "meeting",
    source: "recording",
    sourceLabel: "Recording · 38 min",
    durationSec: 38 * 60 + 12,
    createdAt: NOW - 6 * 60_000,
    folder: "product",
    outputs: noteType("meeting").defaults,
    status: { state: "processing", step: "transcribing", progress: 46 },
  },
  {
    id: "demo-meeting",
    title: "Weekly product sync: Q3 launch",
    noteType: "meeting",
    source: "audio",
    sourceLabel: "weekly-sync.m4a",
    durationSec: 52 * 60 + 18,
    createdAt: NOW - 3 * H,
    folder: "product",
    outputs: noteType("meeting").defaults,
    status: { state: "ready" },
  },
  {
    id: "demo-lecture",
    title: "Calculus 07: The chain rule, properly",
    noteType: "lecture",
    source: "youtube",
    sourceLabel: "youtube · MIT OpenCourseWare",
    durationSec: 48 * 60 + 30,
    createdAt: NOW - 1 * D - 2 * H,
    folder: "calculus",
    outputs: noteType("lecture").defaults,
    status: { state: "ready" },
    flashcardsDue: 6,
  },
  {
    id: "demo-reading",
    title: "Attention Is All You Need",
    noteType: "reading",
    source: "pdf",
    sourceLabel: "vaswani-2017.pdf",
    pages: 15,
    createdAt: NOW - 2 * D,
    folder: "research",
    outputs: noteType("reading").defaults,
    status: { state: "ready" },
    flashcardsDue: 4,
  },
  {
    id: "failed-podcast",
    title: "Lex Fridman #412: on memory",
    noteType: "podcast",
    source: "youtube",
    sourceLabel: "youtube · Lex Fridman",
    durationSec: 3 * 3600 + 11 * 60,
    createdAt: NOW - 2 * D - 5 * H,
    folder: "podcasts",
    outputs: noteType("podcast").defaults,
    status: { state: "failed", error: "Longer than 60 min on the Free plan" },
  },
  {
    id: "user-interview-7",
    title: "User interview #7: Meera, PhD student",
    noteType: "interview",
    source: "video",
    sourceLabel: "zoom-meera.mp4",
    durationSec: 41 * 60 + 5,
    createdAt: NOW - 4 * D,
    folder: "product",
    outputs: noteType("interview").defaults,
    status: { state: "ready" },
  },
  {
    id: "docker-compose-tutorial",
    title: "Docker Compose in 20 minutes",
    noteType: "tutorial",
    source: "youtube",
    sourceLabel: "youtube · Fireship",
    durationSec: 20 * 60 + 44,
    createdAt: NOW - 6 * D,
    outputs: noteType("tutorial").defaults,
    status: { state: "ready" },
  },
  {
    id: "huberman-sleep",
    title: "Huberman Lab: the science of sleep",
    noteType: "podcast",
    source: "audio",
    sourceLabel: "huberman-sleep.mp3",
    durationSec: 58 * 60,
    createdAt: NOW - 9 * D,
    folder: "podcasts",
    outputs: noteType("podcast").defaults,
    status: { state: "ready" },
  },
  {
    id: "whiteboard-arch",
    title: "Whiteboard: sync engine architecture",
    noteType: "general",
    source: "image",
    sourceLabel: "IMG_2231.heic",
    pages: 1,
    createdAt: NOW - 12 * D,
    folder: "product",
    outputs: noteType("general").defaults,
    status: { state: "ready" },
  },
  {
    id: "lecture-slides-integrals",
    title: "Week 8 slides: integration by parts",
    noteType: "lecture",
    source: "slides",
    sourceLabel: "week8-integrals.pptx",
    pages: 34,
    createdAt: NOW - 15 * D,
    folder: "calculus",
    outputs: noteType("lecture").defaults,
    status: { state: "ready" },
    flashcardsDue: 3,
  },
  {
    id: "article-local-first",
    title: "Local-first software: you own your data",
    noteType: "reading",
    source: "web",
    sourceLabel: "inkandswitch.com",
    pages: 22,
    createdAt: NOW - 21 * D,
    folder: "research",
    outputs: noteType("reading").defaults,
    status: { state: "ready" },
  },
];

/* ─────────────────────────── Demo: meeting ─────────────────────────── */

const MEETING_ACTIONS: ActionItem[] = [
  { id: "a1", task: "Share the revised launch plan with sales and support", owner: "Priya", due: "2026-10-03", anchor: t(402), done: true },
  { id: "a2", task: "Set up the India-only pricing A/B test", owner: "Arjun", due: null, anchor: t(1260), done: false },
  { id: "a3", task: "Draft the backend engineer job post", owner: null, due: null, anchor: t(2480), done: false },
  { id: "a4", task: "Expand the beta cohort to 500 users", owner: "Meera", due: "2026-09-30", anchor: t(214), done: false },
  { id: "a5", task: "Write the launch-day incident runbook", owner: "Kabir", due: "2026-10-10", anchor: t(2790), done: false },
];

const MEETING_MINUTES: Minutes = {
  title: "Weekly product sync: Q3 launch",
  date: "Sat, 27 Sep 2026",
  duration: "52 min",
  attendees: ["Priya Sharma", "Arjun Mehta", "Meera Iyer", "Kabir Rao"],
  agenda: [
    {
      title: "Q3 launch timeline",
      anchor: t(132),
      discussion: [
        "Launch moves from 7 Oct to 14 Oct to give support a full week with the new help centre.",
        "Beta cohort expands from 200 to 500 users; Meera flagged onboarding emails need a refresh first.",
      ],
    },
    {
      title: "Pricing experiment",
      anchor: t(1104),
      discussion: [
        "Arjun proposed testing ₹1,499/yr against ₹1,199/yr in India only before committing.",
        "Priya wants the test capped at two weeks so it doesn't overlap launch marketing.",
      ],
    },
    {
      title: "Hiring",
      anchor: t(2410),
      discussion: [
        "Open one backend role focused on the processing pipeline.",
        "Pause the design contractor search until after launch.",
      ],
    },
    {
      title: "Launch-day readiness",
      anchor: t(2700),
      discussion: ["Kabir will own an incident runbook; on-call rota to be shared in Slack."],
    },
  ],
  decisions: [
    { text: "Launch date is 14 October.", anchor: t(318) },
    { text: "India-only pricing test runs for two weeks.", anchor: t(1188) },
    { text: "Design contractor search is paused until after launch.", anchor: t(2522) },
  ],
  actions: MEETING_ACTIONS,
  openQuestions: [
    { text: "Do annual plans get the new price retroactively?", anchor: t(1320) },
    { text: "Who covers support on launch weekend?", anchor: t(2860) },
  ],
  nextSteps: ["Priya circulates the revised plan by Friday.", "Revisit pricing results in the 13 Oct sync."],
  nextMeeting: "Sat, 4 Oct · 10:00",
};

const MEETING: Workspace = {
  item: LIBRARY.find((i) => i.id === "demo-meeting")!,
  viewer: { kind: "media", durationSec: 52 * 60 + 18, label: "weekly-sync.m4a", video: false },
  speakers: { S1: "S1", S2: "S2", S3: "Meera", S4: "Kabir" },
  transcript: [
    { id: "m1", speaker: "S1", anchor: t(18), text: "Okay, let's get going. Four things today: launch, pricing, hiring, and launch-day readiness." },
    { id: "m2", speaker: "S1", anchor: t(132), text: "Let's lock the launch for the 14th. Support asked for one more week with the new help centre." },
    { id: "m3", speaker: "S3", anchor: t(214), text: "If we're moving it, I'd like to take the beta to 500 people. I'll need to refresh the onboarding emails first." },
    { id: "m4", speaker: "S2", anchor: t(318), text: "Fine by me. Fourteenth it is. Can we write that down as decided?" },
    { id: "m5", speaker: "S1", anchor: t(402), text: "Yes. I'll share the revised plan with sales and support by Friday." },
    { id: "m6", speaker: "S2", anchor: t(1104), text: "For India I'd test ₹1,499 against ₹1,199 before we commit to anything." },
    { id: "m7", speaker: "S1", anchor: t(1188), text: "Two weeks, max. I don't want it bleeding into launch marketing." },
    { id: "m8", speaker: "S2", anchor: t(1260), text: "I'll set the test up. Not sure on timing yet, depends on the billing work." },
    { id: "m9", speaker: "S3", anchor: t(1320), text: "Open question: do existing annual plans get the new price retroactively?" },
    { id: "m10", speaker: "S1", anchor: t(2410), text: "Hiring. I think we open one backend role for the pipeline and pause the design contractor." },
    { id: "m11", speaker: "S4", anchor: t(2480), text: "Someone should draft the job post. I can review it but can't write it this week." },
    { id: "m12", speaker: "S4", anchor: t(2700), text: "On launch day I'll own an incident runbook and share the on-call rota in Slack." },
    { id: "m13", speaker: "S3", anchor: t(2860), text: "Who's covering support on launch weekend, though? We haven't said." },
  ],
  outputs: {
    minutes: { type: "minutes", data: MEETING_MINUTES },
    summary: {
      type: "summary",
      tldr: "Launch slips a week to 14 Oct, the beta grows to 500 users, and an India-only pricing test runs for two weeks. One backend role opens; the design contractor search pauses.",
      points: [
        { text: "Launch moves to 14 October so support gets a full week with the new help centre.", anchor: t(132) },
        { text: "₹1,499/yr vs ₹1,199/yr pricing test, India only, capped at two weeks.", anchor: t(1188) },
        { text: "Hiring: one backend role for the pipeline; contractor search paused.", anchor: t(2410) },
        { text: "Kabir owns the launch-day runbook and on-call rota.", anchor: t(2700) },
      ],
    },
    action_items: { type: "actions", items: MEETING_ACTIONS },
    decisions: {
      type: "decisions",
      items: [
        { text: "Launch date is 14 October.", context: "Moved from 7 Oct so support has a week with the new help centre.", anchor: t(318) },
        { text: "India-only pricing test runs for two weeks.", context: "₹1,499/yr vs ₹1,199/yr. Capped so it doesn't overlap launch marketing.", anchor: t(1188) },
        { text: "Design contractor search is paused.", context: "Revisit after launch; budget goes to the backend role.", anchor: t(2522) },
      ],
    },
    detailed_notes: {
      type: "notes",
      sections: [
        {
          heading: "Launch timeline",
          anchor: t(132),
          body: ["The team agreed to move launch from 7 Oct to 14 Oct. The main driver is support readiness: the new help centre needs a full week of use before public traffic arrives."],
          bullets: ["Beta cohort grows from 200 → 500 users", "Onboarding emails need a refresh before the cohort expands"],
        },
        {
          heading: "Pricing",
          anchor: t(1104),
          body: ["Arjun proposed an India-only A/B test of two annual price points before a wider change. Priya capped it at two weeks to protect launch marketing."],
          bullets: ["Variant A ₹1,499/yr · Variant B ₹1,199/yr", "Unresolved: whether existing annual plans are repriced"],
        },
        {
          heading: "Hiring",
          anchor: t(2410),
          body: ["One backend role opens, focused on the processing pipeline. The design contractor search pauses until after launch."],
        },
        {
          heading: "Launch-day readiness",
          anchor: t(2700),
          body: ["Kabir owns the incident runbook and will share an on-call rota. Weekend support coverage is still an open question."],
        },
      ],
    },
    follow_up_email: {
      type: "generic",
      intro: "Draft, ready to paste into Gmail.",
      blocks: [
        { title: "Subject", text: "Weekly sync recap: launch moves to 14 Oct" },
        { text: "Hi all, quick recap of today's sync. Launch is now 14 October and the beta grows to 500 users. We'll run a two-week India-only pricing test (₹1,499 vs ₹1,199)." },
        { text: "Owners: Priya (revised plan, Fri 3 Oct), Arjun (pricing test), Meera (beta expansion, Tue 30 Sep), Kabir (runbook, 10 Oct)." },
        { text: "Still open: repricing of annual plans, and weekend support cover. Thanks!" },
      ],
    },
  },
  chat: {
    suggestions: ["What did we decide about pricing?", "Who owns what?", "What's still unresolved?"],
    replies: [
      {
        keywords: ["pricing", "price", "₹"],
        text: "You agreed to run an India-only test of ₹1,499/yr against ₹1,199/yr for two weeks. Arjun will set it up; no due date was mentioned. Whether existing annual plans get repriced is still open.",
        citations: [t(1188), t(1260), t(1320)],
      },
      {
        keywords: ["owner", "own", "who", "action"],
        text: "Priya shares the revised launch plan by Fri 3 Oct. Arjun sets up the pricing test. Meera expands the beta to 500 by Tue 30 Sep. Kabir writes the incident runbook by 10 Oct. The backend job post has no owner yet.",
        citations: [t(402), t(1260), t(214), t(2700)],
      },
      {
        keywords: ["open", "unresolved", "risk", "question"],
        text: "Two things are unresolved: whether annual plans are repriced retroactively, and who covers support on launch weekend.",
        citations: [t(1320), t(2860)],
      },
    ],
    fallback: {
      text: "From the recording: the main thread was launch readiness. The team moved the date to 14 Oct and assigned owners for the plan, pricing test and runbook.",
      citations: [t(132), t(2700)],
    },
  },
};

/* ─────────────────────────── Demo: lecture ─────────────────────────── */

const LECTURE_CARDS: Flashcard[] = [
  { id: "c1", front: "What does the chain rule let you differentiate?", back: "Compositions of functions: (f∘g)′(x) = f′(g(x)) · g′(x).", anchor: t(740), topic: "Chain rule" },
  { id: "c2", front: "Derivative of sin(x²)?", back: "2x · cos(x²). Outer derivative times inner derivative.", anchor: t(1022), topic: "Chain rule" },
  { id: "c3", front: "When is a function differentiable at a point?", back: "When the limit of the difference quotient exists there.", anchor: t(305), topic: "Limits" },
  { id: "c4", front: "Is |x| differentiable at 0?", back: "No. It's continuous, but the left and right difference quotients disagree (−1 vs 1).", anchor: t(412), topic: "Limits" },
  { id: "c5", front: "d/dx of e^(3x)?", back: "3e^(3x). The inner function 3x contributes a factor of 3.", anchor: t(1180), topic: "Exponentials" },
  { id: "c6", front: "Leibniz form of the chain rule?", back: "dy/dx = (dy/du) · (du/dx), with u = g(x).", anchor: t(860), topic: "Chain rule" },
];

const LECTURE: Workspace = {
  item: LIBRARY.find((i) => i.id === "demo-lecture")!,
  viewer: { kind: "media", durationSec: 48 * 60 + 30, label: "youtube · calculus 07", video: true },
  speakers: { S1: "Lecturer", S2: "Student" },
  transcript: [
    { id: "l1", speaker: "S1", anchor: t(60), text: "Last time we talked about limits. Today I want to be precise about what differentiable means." },
    { id: "l2", speaker: "S1", anchor: t(305), text: "A function is differentiable at a point when this difference-quotient limit exists. Not just continuous." },
    { id: "l3", speaker: "S1", anchor: t(412), text: "Classic example: absolute value of x at zero. Continuous, yes. Differentiable, no." },
    { id: "l4", speaker: "S2", anchor: t(530), text: "So continuity is necessary but not sufficient?" },
    { id: "l5", speaker: "S1", anchor: t(548), text: "Exactly. Differentiable implies continuous, never the other way round." },
    { id: "l6", speaker: "S1", anchor: t(700), text: "So the chain rule: outer derivative, keep the inside, times the inner derivative." },
    { id: "l7", speaker: "S1", anchor: t(860), text: "In Leibniz notation it looks almost like fractions cancelling: dy/du times du/dx." },
    { id: "l8", speaker: "S1", anchor: t(1010), text: "Let's try sin of x squared. What's the inside function here?" },
    { id: "l9", speaker: "S2", anchor: t(1018), text: "x squared." },
    { id: "l10", speaker: "S1", anchor: t(1022), text: "Right, so we get cos of x squared, times 2x. Don't forget that 2x, it's the most common mistake." },
    { id: "l11", speaker: "S1", anchor: t(1180), text: "Next: e to the 3x. The inside is 3x, so we pick up a factor of 3." },
    { id: "l12", speaker: "S1", anchor: t(1500), text: "Now a nested one: square root of one plus x squared. Two layers, same idea." },
  ],
  outputs: {
    detailed_notes: {
      type: "notes",
      sections: [
        {
          heading: "1. Limits, revisited",
          anchor: t(60),
          body: ["Differentiability needs the difference-quotient limit to exist. Continuity alone isn't enough: |x| at 0 is continuous but has a corner."],
          bullets: ["Differentiable ⇒ continuous", "Continuous ⇏ differentiable"],
        },
        {
          heading: "2. The chain rule",
          anchor: t(700),
          body: ["For y = f(g(x)), dy/dx = f′(g(x)) · g′(x). Say it out loud: outside derivative, keep the inside, times the inside derivative."],
          bullets: ["Leibniz form: dy/dx = dy/du · du/dx", "Works for any number of nested layers"],
        },
        {
          heading: "3. Worked examples",
          anchor: t(1010),
          body: ["sin(x²) → 2x·cos(x²). e³ˣ → 3e³ˣ. √(1+x²) → x/√(1+x²)."],
          bullets: ["Most common mistake: forgetting the inner derivative"],
        },
      ],
    },
    revision_points: {
      type: "generic",
      blocks: [
        { text: "Differentiable at a point ⇔ the difference-quotient limit exists there.", anchor: t(305) },
        { text: "|x| is the go-to counterexample: continuous at 0, not differentiable.", anchor: t(412) },
        { text: "Chain rule: (f∘g)′ = f′(g) · g′.", anchor: t(700) },
        { text: "Always multiply by the inner derivative.", anchor: t(1022) },
      ],
    },
    flashcards: { type: "flashcards", cards: LECTURE_CARDS },
    quiz: {
      type: "quiz",
      questions: [
        { id: "q1", q: "What is d/dx of sin(x²)?", options: ["cos(x²)", "2x · cos(x²)", "2 · sin(x)", "x² · cos(x)"], correct: 1, explanation: "Outer derivative cos(x²), times inner derivative 2x.", anchor: t(1022), topic: "Chain rule" },
        { id: "q2", q: "Which statement is true?", options: ["Continuous ⇒ differentiable", "Differentiable ⇒ continuous", "They're equivalent", "Neither implies the other"], correct: 1, explanation: "Differentiability is the stronger condition; |x| at 0 shows the converse fails.", anchor: t(548), topic: "Limits" },
        { id: "q3", q: "d/dx of e^(3x)?", options: ["e^(3x)", "3x · e^(3x)", "3e^(3x)", "e^(3x) / 3"], correct: 2, explanation: "The inner function 3x has derivative 3.", anchor: t(1180), topic: "Exponentials" },
      ],
    },
    glossary: {
      type: "generic",
      blocks: [
        { title: "Difference quotient", text: "(f(x+h) − f(x)) / h, the slope of a secant line.", anchor: t(305) },
        { title: "Composition", text: "(f∘g)(x) = f(g(x)); apply g, then f.", anchor: t(700) },
        { title: "Inner function", text: "The function applied first in a composition, g in f(g(x)).", anchor: t(1010) },
      ],
    },
  },
  chat: {
    suggestions: ["Explain the chain rule like I'm new", "Give me a harder example", "Why isn't |x| differentiable?"],
    replies: [
      {
        keywords: ["chain", "explain", "new"],
        text: "Differentiate the outer function, leave the inside alone, then multiply by the derivative of the inside. For sin(x²): cos(x²) × 2x.",
        citations: [t(700), t(1022)],
      },
      {
        keywords: ["harder", "example", "nested"],
        text: "Try √(1 + x²). Outer: ½(1+x²)^(−½). Inner: 2x. Multiply and simplify: x / √(1 + x²). The lecturer works this at the end.",
        citations: [t(1500)],
      },
      {
        keywords: ["|x|", "absolute", "differentiable"],
        text: "At 0, the slope from the left is −1 and from the right is +1. The limit of the difference quotient doesn't exist, so there's no derivative, even though the graph has no gap.",
        citations: [t(412), t(548)],
      },
    ],
    fallback: { text: "This lecture builds from the definition of differentiability to the chain rule, then works three examples.", citations: [t(60), t(700)] },
  },
};

/* ─────────────────────────── Demo: reading ─────────────────────────── */

const READING_CARDS: Flashcard[] = [
  { id: "r1", front: "What does the Transformer drop compared to earlier seq2seq models?", back: "Recurrence and convolutions. It relies entirely on attention.", anchor: p(1), topic: "Architecture" },
  { id: "r2", front: "Scaled dot-product attention formula?", back: "softmax(QKᵀ / √dₖ) · V", anchor: p(4), topic: "Attention" },
  { id: "r3", front: "Why scale by √dₖ?", back: "Large dot products push softmax into regions with tiny gradients.", anchor: p(4), topic: "Attention" },
  { id: "r4", front: "Why multi-head attention?", back: "Lets the model attend to information from different representation subspaces at once.", anchor: p(5), topic: "Attention" },
  { id: "r5", front: "How is word order encoded?", back: "Sinusoidal positional encodings added to the input embeddings.", anchor: p(6), topic: "Positional encoding" },
];

const READING: Workspace = {
  item: LIBRARY.find((i) => i.id === "demo-reading")!,
  viewer: {
    kind: "pdf",
    label: "vaswani-2017.pdf",
    pages: [
      { page: 1, heading: "Abstract", lines: ["The dominant sequence transduction models are based on complex recurrent or convolutional networks.", "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms."] },
      { page: 2, heading: "1 Introduction", lines: ["Recurrent models typically factor computation along symbol positions.", "This inherently sequential nature precludes parallelization within training examples."] },
      { page: 3, heading: "3 Model Architecture", lines: ["The encoder maps an input sequence to a sequence of continuous representations.", "Encoder and decoder are stacks of N = 6 identical layers."] },
      { page: 4, heading: "3.2 Attention", lines: ["Attention(Q, K, V) = softmax(QKᵀ / √dₖ) V", "For large dₖ, dot products grow large in magnitude, pushing softmax into regions with small gradients."] },
      { page: 5, heading: "3.2.2 Multi-Head Attention", lines: ["Multi-head attention allows the model to jointly attend to information from different representation subspaces.", "We employ h = 8 parallel attention layers, or heads."] },
      { page: 6, heading: "3.5 Positional Encoding", lines: ["Since our model contains no recurrence, we inject information about relative or absolute position.", "We use sine and cosine functions of different frequencies."] },
      { page: 7, heading: "4 Why Self-Attention", lines: ["Self-attention connects all positions with a constant number of sequential operations.", "A recurrent layer requires O(n) sequential operations."] },
      { page: 8, heading: "6 Results", lines: ["On WMT 2014 English-to-German, the big Transformer achieves 28.4 BLEU.", "Training took 3.5 days on eight P100 GPUs."] },
    ],
  },
  speakers: {},
  transcript: [
    { id: "p1", speaker: "", anchor: p(1), text: "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely." },
    { id: "p2", speaker: "", anchor: p(2), text: "Recurrent models' inherently sequential nature precludes parallelization within training examples." },
    { id: "p3", speaker: "", anchor: p(3), text: "The encoder and decoder are each a stack of N = 6 identical layers with residual connections and layer normalisation." },
    { id: "p4", speaker: "", anchor: p(4), text: "Attention(Q, K, V) = softmax(QKᵀ / √dₖ) V. We scale by √dₖ to counteract small gradients." },
    { id: "p5", speaker: "", anchor: p(5), text: "Multi-head attention with h = 8 heads attends to different representation subspaces." },
    { id: "p6", speaker: "", anchor: p(6), text: "Positional encodings use sine and cosine functions of different frequencies." },
    { id: "p7", speaker: "", anchor: p(7), text: "Self-attention connects all positions with O(1) sequential operations versus O(n) for recurrence." },
    { id: "p8", speaker: "", anchor: p(8), text: "The big model reaches 28.4 BLEU on WMT 2014 EN-DE after 3.5 days on eight P100 GPUs." },
  ],
  outputs: {
    summary: {
      type: "summary",
      tldr: "The Transformer replaces recurrence with attention alone. It trains faster, parallelises better, and set a new state of the art on WMT 2014 translation.",
      points: [
        { text: "Architecture is built only from attention and feed-forward layers.", anchor: p(1) },
        { text: "Scaled dot-product attention with multi-head projections.", anchor: p(4) },
        { text: "Positional encodings replace recurrence for word order.", anchor: p(6) },
        { text: "28.4 BLEU on EN-DE, trained in 3.5 days on 8 GPUs.", anchor: p(8) },
      ],
    },
    detailed_notes: {
      type: "notes",
      sections: [
        { heading: "Motivation", anchor: p(2), body: ["RNNs process tokens one at a time, which blocks parallelism and makes long-range dependencies hard to learn."] },
        { heading: "Architecture", anchor: p(3), body: ["Encoder-decoder, each a stack of 6 identical layers. Every sub-layer has a residual connection followed by layer norm."], bullets: ["Model dimension d = 512", "Feed-forward inner dimension 2048"] },
        { heading: "Attention", anchor: p(4), body: ["Queries are compared to keys with dot products, scaled by √dₖ, then softmaxed to weight the values."], bullets: ["8 heads, each dₖ = 64", "Masking in the decoder keeps it autoregressive"] },
        { heading: "Why self-attention", anchor: p(7), body: ["Constant path length between any two positions, and much more parallel than recurrence."] },
      ],
    },
    key_concepts: {
      type: "generic",
      blocks: [
        { title: "Self-attention", text: "Each position attends to every other position in the same sequence.", anchor: p(4) },
        { title: "Multi-head attention", text: "Several attention functions in parallel on projected subspaces.", anchor: p(5) },
        { title: "Positional encoding", text: "Sinusoids that give the model a sense of token order.", anchor: p(6) },
      ],
    },
    flashcards: { type: "flashcards", cards: READING_CARDS },
    quiz: {
      type: "quiz",
      questions: [
        { id: "rq1", q: "Why is the dot product scaled by √dₖ?", options: ["To normalise the values", "To keep softmax gradients from vanishing", "To reduce memory", "To add positional information"], correct: 1, explanation: "Large dot products saturate softmax, which shrinks gradients.", anchor: p(4), topic: "Attention" },
        { id: "rq2", q: "How many attention heads does the base model use?", options: ["4", "6", "8", "12"], correct: 2, explanation: "h = 8 parallel heads, each with dₖ = 64.", anchor: p(5), topic: "Attention" },
        { id: "rq3", q: "What replaces recurrence for word order?", options: ["Convolutions", "Positional encodings", "Segment embeddings", "Beam search"], correct: 1, explanation: "Sine and cosine positional encodings are added to embeddings.", anchor: p(6), topic: "Positional encoding" },
      ],
    },
  },
  chat: {
    suggestions: ["Explain attention simply", "Why no recurrence?", "What were the results?"],
    replies: [
      { keywords: ["attention", "explain", "simply"], text: "Each word asks a question (query), every word offers a label (key) and some content (value). Matching queries to keys decides how much of each value to blend in.", citations: [p(4), p(5)] },
      { keywords: ["recurrence", "rnn", "why"], text: "Recurrence forces tokens to be processed in order, which blocks parallel training. Attention connects every pair of positions in one step.", citations: [p(2), p(7)] },
      { keywords: ["result", "bleu", "score"], text: "The big Transformer hit 28.4 BLEU on WMT 2014 English-German, beating previous models, after 3.5 days on eight P100 GPUs.", citations: [p(8)] },
    ],
    fallback: { text: "The paper's core claim: attention alone is enough for strong sequence transduction, and it trains far faster.", citations: [p(1), p(7)] },
  },
};

const DEMOS: Record<string, Workspace> = {
  "demo-meeting": MEETING,
  "demo-lecture": LECTURE,
  "demo-reading": READING,
};

const TEMPLATE_BY_TYPE: Record<NoteTypeKey, Workspace> = {
  meeting: MEETING,
  interview: MEETING,
  lecture: LECTURE,
  podcast: LECTURE,
  tutorial: LECTURE,
  reading: READING,
  general: READING,
};

/** Returns a workspace for any library id: a hand-written demo, or a template re-skinned with the item. */
export function getWorkspace(id: string): Workspace | null {
  const demo = DEMOS[id];
  if (demo) return demo;
  const item = LIBRARY.find((i) => i.id === id);
  if (!item) return null;
  const base = TEMPLATE_BY_TYPE[item.noteType];
  const paged = item.pages !== undefined;
  const template = paged ? READING : base.viewer.kind === "pdf" ? LECTURE : base;
  const outputs: Partial<Record<OutputKey, OutputData>> = {};
  for (const key of item.outputs) {
    const hit = template.outputs[key] ?? base.outputs[key];
    if (hit) outputs[key] = hit;
  }
  return {
    ...template,
    item,
    viewer:
      template.viewer.kind === "media"
        ? { ...template.viewer, durationSec: item.durationSec ?? template.viewer.durationSec, label: item.sourceLabel, video: item.source === "youtube" || item.source === "video" }
        : { ...template.viewer, label: item.sourceLabel },
    outputs,
  };
}

/* ─────────────────────────── Cross-item views ─────────────────────────── */

export type TrackedAction = ActionItem & { meetingId: string; meetingTitle: string; meetingDate: number };

export const ALL_ACTIONS: TrackedAction[] = [
  ...MEETING_ACTIONS.map((a) => ({ ...a, meetingId: "demo-meeting", meetingTitle: MEETING.item.title, meetingDate: MEETING.item.createdAt })),
  { id: "u1", task: "Send Meera the beta invite and a feedback form", owner: "Anurag", due: "2026-09-26", anchor: t(2210), done: false, meetingId: "user-interview-7", meetingTitle: "User interview #7: Meera, PhD student", meetingDate: NOW - 4 * D },
  { id: "u2", task: "Prototype flashcards export to Anki", owner: null, due: "2026-10-06", anchor: t(1640), done: false, meetingId: "user-interview-7", meetingTitle: "User interview #7: Meera, PhD student", meetingDate: NOW - 4 * D },
  { id: "u3", task: "Share interview synthesis in #research", owner: "Anurag", due: null, anchor: t(2380), done: true, meetingId: "user-interview-7", meetingTitle: "User interview #7: Meera, PhD student", meetingDate: NOW - 4 * D },
];

export type ReviewCard = Flashcard & { itemId: string; itemTitle: string; noteType: NoteTypeKey };

export const DUE_CARDS: ReviewCard[] = [
  ...LECTURE_CARDS.map((c) => ({ ...c, itemId: "demo-lecture", itemTitle: LECTURE.item.title, noteType: "lecture" as const })),
  ...READING_CARDS.slice(0, 4).map((c) => ({ ...c, itemId: "demo-reading", itemTitle: READING.item.title, noteType: "reading" as const })),
];

/** Deterministic pseudo-random in [0, 1). */
export function seeded(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export const STATS = {
  cardsReviewed: 1284,
  cardsDelta: "+18% vs last month",
  quizAccuracy: 82,
  quizDelta: "+4 pts",
  /** 26 weeks × 7 days of review counts, oldest first */
  heatmap: Array.from({ length: 26 * 7 }, (_, i) => {
    const r = seeded(i + 3);
    const recency = i / (26 * 7);
    if (i >= 26 * 7 - 12) return Math.round(4 + r * 22); // current streak
    if (r < 0.28 - recency * 0.15) return 0;
    return Math.round(r * (10 + recency * 22));
  }),
  weakTopics: [
    { topic: "Integration by parts", item: "Week 8 slides", accuracy: 48 },
    { topic: "Positional encoding", item: "Attention Is All You Need", accuracy: 57 },
    { topic: "Limits", item: "Calculus 07", accuracy: 63 },
    { topic: "Multi-head attention", item: "Attention Is All You Need", accuracy: 71 },
  ],
  weekly: [42, 58, 35, 71, 64, 88, 76],
};

/* ─────────────────────────── Helpers ─────────────────────────── */

export function fmtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

export function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

/* Locale-free formatting so server and client render identical text. */
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const IST_OFFSET = 5.5 * 3600_000;

export function fmtDayUTC(d: Date): string {
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function relativeDate(ts: number): string {
  const diff = NOW - ts;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  const dt = new Date(ts + IST_OFFSET);
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`;
}

export function fmtDue(iso: string): string {
  return fmtDayUTC(new Date(`${iso}T00:00:00Z`));
}

export const TODAY_ISO = "2026-09-27";
