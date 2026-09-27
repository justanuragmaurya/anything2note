import type { ActionItem, Flashcard, Item } from "./types";

const MEETING_ACTIONS: ActionItem[] = [
  { id: "a1", itemId: "demo-meeting", task: "Share revised launch plan", owner: "Priya", due: "Fri, 3 Oct", at: 402, done: true },
  { id: "a2", itemId: "demo-meeting", task: "Set up pricing A/B test", owner: "Arjun", due: null, at: 1260, done: false },
  { id: "a3", itemId: "demo-meeting", task: "Draft backend job post", owner: null, due: null, at: 2480, done: false },
  { id: "a4", itemId: "demo-meeting", task: "Email beta cohort about the new date", owner: "Meera", due: "Mon, 6 Oct", at: 540, done: false },
];

const DESIGN_ACTIONS: ActionItem[] = [
  { id: "b1", itemId: "design-review", task: "Cut onboarding to three screens", owner: "Kabir", due: "Thu, 2 Oct", at: 311, done: false },
  { id: "b2", itemId: "design-review", task: "Test the OTP flow on Android", owner: null, due: "Next sprint", at: 1422, done: false },
];

const LECTURE_CARDS: Flashcard[] = [
  { id: "c1", itemId: "demo-lecture", q: "What does the chain rule let you differentiate?", a: "Compositions of functions: (f∘g)′(x) = f′(g(x)) · g′(x).", at: 740 },
  { id: "c2", itemId: "demo-lecture", q: "Derivative of sin(x²)?", a: "2x · cos(x²) — outer derivative times inner derivative.", at: 1022 },
  { id: "c3", itemId: "demo-lecture", q: "When is a function differentiable at a point?", a: "When the limit of the difference quotient exists there.", at: 305 },
  { id: "c4", itemId: "demo-lecture", q: "Is |x| differentiable at 0?", a: "No. It is continuous there, but the left and right limits of the slope disagree (−1 vs 1).", at: 190 },
  { id: "c5", itemId: "demo-lecture", q: "d/dx of e^(3x)?", a: "3e^(3x). The inner function 3x contributes the factor 3.", at: 1180 },
];

const READING_CARDS: Flashcard[] = [
  { id: "r1", itemId: "attention-paper", q: "What replaces recurrence in the Transformer?", a: "Self-attention: every token attends to every other token in parallel.", at: 0 },
  { id: "r2", itemId: "attention-paper", q: "Why scale dot products by 1/√dₖ?", a: "Large dot products push softmax into regions with tiny gradients; scaling keeps them stable.", at: 0 },
];

export const ITEMS: Item[] = [
  {
    id: "demo-meeting",
    title: "Weekly product sync",
    type: "meeting",
    source: "recording",
    sourceLabel: "weekly-sync.m4a",
    duration: 52 * 60 + 18,
    createdAt: "Today, 10:30",
    status: "ready",
    outputs: {
      minutes: {
        kind: "minutes",
        meta: ["Weekly sync", "52 min", "Priya, Arjun, Meera"],
        items: [
          { title: "Q3 launch timeline", at: 132, body: "Launch moves to 14 Oct; beta cohort expands to 500 users." },
          { title: "Pricing experiment", at: 1104, body: "Test ₹1,499/yr against ₹1,199/yr in India only." },
          { title: "Hiring", at: 2410, body: "Open one backend role; pause design contractor search." },
        ],
      },
      summary: {
        kind: "summary",
        text: "The team moved the launch to 14 October, agreed an India-only pricing test and opened one backend role. Most of the hour went on the beta cohort and what 500 users means for support.",
        at: 132,
      },
      action_items: { kind: "actions", items: MEETING_ACTIONS },
      decisions: {
        kind: "decisions",
        items: [
          { text: "Launch date is 14 October.", at: 318 },
          { text: "India-only pricing test for 2 weeks.", at: 1188 },
          { text: "Design contractor search is paused.", at: 2455 },
        ],
      },
      detailed_notes: {
        kind: "notes",
        sections: [
          { heading: "Launch", at: 132, body: "Priya proposed the 14th; nobody objected. Beta grows from 120 to 500 users.", bullets: ["Support rota needed for launch week", "Status page before the beta email"] },
          { heading: "Pricing", at: 1104, body: "Arjun wants evidence before committing to a yearly price in India.", bullets: ["Two cohorts, two weeks", "Watch refund requests, not just conversion"] },
          { heading: "Hiring", at: 2410, body: "One backend role now; revisit design help after launch." },
        ],
      },
      open_questions: {
        kind: "bullets",
        items: [
          { text: "Who owns support during launch week?", at: 690 },
          { text: "Do we need a status page before the beta email?", at: 760 },
        ],
      },
    },
    transcript: [
      { speaker: "Priya", at: 132, text: "Let's lock the launch for the 14th — beta goes to 500 people." },
      { speaker: "Meera", at: 318, text: "Fourteenth works. I'll tell the beta list on Monday." },
      { speaker: "Arjun", at: 1104, text: "For India I'd test ₹1,499 against ₹1,199 before we commit." },
      { speaker: "Priya", at: 1188, text: "Fine — two weeks, India only. Arjun, you set it up?" },
      { speaker: "Arjun", at: 1260, text: "Yep. I'll get the A/B flag in." },
      { speaker: "Priya", at: 2410, text: "Hiring: one backend role now, the design contractor can wait." },
    ],
    chat: {
      q: "What did we decide about pricing?",
      a: "You agreed to run an India-only test of ₹1,499/yr against ₹1,199/yr for two weeks. Arjun will set it up; no due date was mentioned.",
      at: 1188,
      suggestions: ["Draft the follow-up email", "Who owns what?", "What's still open?"],
    },
  },
  {
    id: "demo-lecture",
    title: "Calculus 07 — The chain rule",
    type: "lecture",
    source: "youtube",
    sourceLabel: "youtube · calculus 07",
    duration: 48 * 60 + 10,
    createdAt: "Yesterday",
    status: "ready",
    outputs: {
      detailed_notes: {
        kind: "notes",
        sections: [
          { heading: "1. Limits, revisited", at: 60, body: "Differentiability needs the difference-quotient limit to exist — continuity alone isn't enough (|x| at 0)." },
          { heading: "2. The chain rule", at: 700, body: "For y = f(g(x)), dy/dx = f′(g(x))·g′(x). Think: outside derivative, keep inside, times inside derivative.", bullets: ["Identify the inner function first", "Leibniz form: dy/dx = dy/du · du/dx"] },
          { heading: "3. Worked examples", at: 1010, body: "sin(x²), e³ˣ, √(1+x²). Common mistake: forgetting the inner derivative." },
        ],
      },
      revision_points: {
        kind: "bullets",
        items: [
          { text: "Continuity does not imply differentiability.", at: 190 },
          { text: "Chain rule: outer′(inner) × inner′.", at: 700 },
          { text: "Always write down u = g(x) before differentiating.", at: 1010 },
        ],
      },
      flashcards: { kind: "flashcards", cards: LECTURE_CARDS },
      quiz: {
        kind: "quiz",
        questions: [
          { id: "q1", q: "What is d/dx of sin(x²)?", options: ["cos(x²)", "2x · cos(x²)", "2 · sin(x)", "x² · cos(x)"], correct: 1, explain: "Outer derivative cos(x²), times inner derivative 2x.", at: 1022 },
          { id: "q2", q: "Which function is continuous but not differentiable at 0?", options: ["x²", "sin x", "|x|", "eˣ"], correct: 2, explain: "|x| has a corner at 0: slopes −1 and 1 don't agree.", at: 190 },
          { id: "q3", q: "d/dx of √(1 + x²)?", options: ["1 / (2√(1+x²))", "x / √(1+x²)", "2x√(1+x²)", "√(2x)"], correct: 1, explain: "½(1+x²)^(−½) · 2x simplifies to x / √(1+x²).", at: 1100 },
        ],
      },
      glossary: {
        kind: "glossary",
        terms: [
          { term: "Composite function", def: "A function applied to the output of another: f(g(x)).", at: 640 },
          { term: "Difference quotient", def: "(f(x+h) − f(x)) / h — the slope of a secant line.", at: 80 },
          { term: "Leibniz notation", def: "Writing derivatives as ratios, dy/dx, which makes the chain rule look like cancelling du.", at: 860 },
        ],
      },
    },
    transcript: [
      { speaker: "Lecturer", at: 60, text: "Let's start by revisiting what it means for a limit to exist." },
      { speaker: "Lecturer", at: 190, text: "Take |x| at zero. Continuous, yes. Differentiable? Look at the slopes." },
      { speaker: "Lecturer", at: 700, text: "So the chain rule: outer derivative, keep the inside, times the inner derivative." },
      { speaker: "Lecturer", at: 1010, text: "Let's try sin of x squared. What's the inside function here?" },
      { speaker: "Student", at: 1040, text: "x squared?" },
      { speaker: "Lecturer", at: 1050, text: "Exactly. So cos of x squared, times 2x." },
    ],
    chat: {
      q: "Explain the chain rule like I'm new to this",
      a: "Differentiate the outer function, leave the inside alone, then multiply by the derivative of the inside. For sin(x²): cos(x²) × 2x.",
      at: 700,
      suggestions: ["Give me 3 practice problems", "Where do students slip up?", "Summarise in one line"],
    },
  },
  {
    id: "design-review",
    title: "Design review — onboarding v2",
    type: "meeting",
    source: "upload",
    sourceLabel: "design-review.mp4",
    duration: 31 * 60 + 4,
    createdAt: "Mon, 29 Sep",
    status: "ready",
    outputs: {
      summary: { kind: "summary", text: "Onboarding shrinks to three screens with a single sign-in step. Android OTP autofill needs testing before release.", at: 311 },
      action_items: { kind: "actions", items: DESIGN_ACTIONS },
      decisions: { kind: "decisions", items: [{ text: "Three onboarding screens, not five.", at: 290 }] },
    },
    transcript: [{ speaker: "Kabir", at: 311, text: "I think three screens is plenty. Nobody reads screen four." }],
  },
  {
    id: "attention-paper",
    title: "Attention Is All You Need",
    type: "reading",
    source: "pdf",
    sourceLabel: "attention.pdf · 15 pp",
    duration: null,
    pages: 15,
    createdAt: "Sun, 28 Sep",
    status: "ready",
    outputs: {
      summary: { kind: "summary", text: "Introduces the Transformer: an encoder–decoder built entirely from attention, dropping recurrence and convolutions. It trains faster and set new translation benchmarks." },
      key_concepts: {
        kind: "bullets",
        items: [{ text: "Scaled dot-product attention" }, { text: "Multi-head attention" }, { text: "Positional encodings" }, { text: "Residual connections + layer norm" }],
      },
      flashcards: { kind: "flashcards", cards: READING_CARDS },
    },
    transcript: [],
  },
  {
    id: "long-game-41",
    title: "The Long Game, ep. 41 — Compounding focus",
    type: "podcast",
    source: "link",
    sourceLabel: "podcasts.example.com",
    duration: 74 * 60,
    createdAt: "Just now",
    status: "processing",
    stage: "transcribing",
    progress: 0.62,
    outputs: {},
    transcript: [],
  },
  {
    id: "d1-tutorial",
    title: "Cloudflare D1 + Drizzle in 20 minutes",
    type: "tutorial",
    source: "youtube",
    sourceLabel: "youtube · devtalks",
    duration: 21 * 60 + 40,
    createdAt: "Just now",
    status: "queued",
    outputs: {},
    transcript: [],
  },
  {
    id: "retro-board",
    title: "Sprint retro whiteboard",
    type: "general",
    source: "photo",
    sourceLabel: "IMG_2041.heic",
    duration: null,
    createdAt: "Fri, 26 Sep",
    status: "ready",
    outputs: {
      summary: { kind: "summary", text: "Went well: release notes, pairing. Didn't: flaky CI, unclear ownership of the design backlog." },
      key_points: { kind: "bullets", items: [{ text: "Fix flaky CI before adding tests" }, { text: "Name an owner for the design backlog" }, { text: "Keep pairing on Fridays" }] },
    },
    transcript: [],
  },
];

export const itemById = (id: string): Item | undefined => ITEMS.find((i) => i.id === id);

export const ALL_ACTIONS: ActionItem[] = ITEMS.flatMap((i) => {
  const o = i.outputs.action_items;
  return o?.kind === "actions" ? o.items : [];
});

export const DUE_CARDS: Flashcard[] = [...LECTURE_CARDS, ...READING_CARDS];
