/**
 * Content for the SEO use-case pages at /(marketing)/[useCase].
 * Sample outputs are illustrative: invented but realistic, and they follow the
 * product's rules (anchors on every line, "Not mentioned" instead of guesses).
 */

import type { ArtId } from "@/lib/art";
import type { NoteTypeKey } from "@/lib/note-types";
import { NOT_MENTIONED, type SampleDoc } from "@/lib/mock/marketing-samples";

export const USE_CASE_SLUGS = [
  "record-lectures",
  "lecture-notes",
  "youtube-to-notes",
  "pdf-to-notes",
  "podcast-summary",
  "interview-notes",
  "whiteboard-to-notes",
] as const;

export type UseCaseSlug = (typeof USE_CASE_SLUGS)[number];

export type BenefitIcon =
  | "users"
  | "shield"
  | "send"
  | "timer"
  | "brain"
  | "languages"
  | "list"
  | "file"
  | "search"
  | "quote"
  | "tag"
  | "scan"
  | "eye"
  | "layers"
  | "terminal"
  | "bookmark";

export type SourceIcon = "mic" | "monitor" | "file" | "audio" | "image";

type Accented = { before: string; accent: string; after?: string };

export type UseCase = {
  slug: UseCaseSlug;
  /** Short name for cross-links, e.g. "Lecture recorder" */
  name: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  eyebrow: string;
  title: Accented;
  sub: string;
  noteType: NoteTypeKey;
  source: { kind: string; icon: SourceIcon; placeholders: string[] };
  art: ArtId;
  artTint: string;
  benefits: { icon: BenefitIcon; title: string; body: string }[];
  sampleTitle: Accented;
  sampleSub: string;
  sample: SampleDoc;
  steps: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  cta: { title: Accented; body: string };
};

const m = (min: number, sec = 0) => min * 60 + sec;

export const USE_CASES: Record<UseCaseSlug, UseCase> = {
  "record-lectures": {
    slug: "record-lectures",
    name: "Lecture recorder",
    metaTitle: "Record lectures in class: detailed notes and deadlines from your class audio",
    metaDescription:
      "Record your class on your phone or laptop and get detailed notes of everything the lecturer taught, each line linked to the moment it was said, plus the homework, readings and exam dates they mentioned.",
    keywords: ["record lectures", "lecture recorder app", "record class and get notes", "AI note taker for class", "lecture audio to notes", "class recording transcription"],
    eyebrow: "Use case · Class recordings",
    title: { before: "Listen in class.", accent: "We'll", after: "take the notes" },
    sub: "Put your phone on the desk and hit record. After class, get detailed notes of everything the lecturer taught, each line linked to the moment it was said, plus every homework, reading and exam date they mentioned on the way out.",
    noteType: "lecture",
    source: {
      kind: "Class recording",
      icon: "mic",
      placeholders: ["Record this morning's econ lecture…", "Upload ECON-102-lecture-14.m4a…", "Drop the voice memo from Tuesday's lab…"],
    },
    art: "hero-cassette",
    artTint: "var(--nt-lecture)",
    benefits: [
      {
        icon: "list",
        title: "As detailed as the class",
        body: "Not a summary. Every topic, worked example and aside, in the order it was taught, with a timestamp to jump back to the bit you missed while copying the board.",
      },
      {
        icon: "bookmark",
        title: "Deadlines, caught in passing",
        body: "“Problem set 5 is due Friday”, said as everyone packs up, lands in Tasks & deadlines. If no date was given, it says Not mentioned instead of guessing one.",
      },
      {
        icon: "shield",
        title: "The audio doesn't hang around",
        body: "Turn on “Delete originals after processing” in Settings and the audio is deleted once your notes are made; the notes and transcript stay. The recorder reminds you to check that recording is allowed.",
      },
    ],
    sampleTitle: { before: "A 55-minute econ lecture, recorded on a phone,", accent: "fully noted" },
    sampleSub: "From a first-year economics lecture recorded from the third row. Detailed notes first, then the tasks the lecturer mentioned.",
    sample: {
      output: "Detailed notes · Tasks & deadlines",
      file: "ECON 102 · Lecture 14 · class-recording.m4a",
      meta: ["55 min", "Lecture", "Recorded in class"],
      blocks: [
        {
          type: "fields",
          rows: [
            { label: "Course", value: "ECON 102 · Principles of Microeconomics" },
            { label: "Lecture", value: "14 · Price elasticity of demand" },
            { label: "Recorded", value: "Thu, 24 Sep 2026 · 09:00" },
            { label: "Slides", value: NOT_MENTIONED },
          ],
        },
        { type: "heading", text: "1. What elasticity measures", anchor: { kind: "time", at: m(1, 50) } },
        {
          type: "paragraph",
          text: "Price elasticity of demand (PED) is the percentage change in quantity demanded divided by the percentage change in price. It has no units, so you can compare how buyers react to coffee prices with how they react to petrol.",
        },
        { type: "heading", text: "2. The midpoint method", anchor: { kind: "time", at: m(8, 15) } },
        {
          type: "bullets",
          items: [
            { text: "PED = (ΔQ ÷ average Q) ÷ (ΔP ÷ average P). Using averages gives the same answer whether the price rises or falls.", anchor: { kind: "time", at: m(9, 2) } },
            { text: "Worked example from the board: price ₹40 → ₹60, cups sold 100 → 60. PED = (−40 ÷ 80) ÷ (20 ÷ 50) = −1.25, so demand is elastic.", anchor: { kind: "time", at: m(12, 40) } },
            { text: "Quote the absolute value: above 1 is elastic, below 1 is inelastic, exactly 1 is unit elastic.", anchor: { kind: "time", at: m(15, 10) } },
          ],
        },
        { type: "heading", text: "3. What makes demand elastic", anchor: { kind: "time", at: m(21, 30) } },
        {
          type: "bullets",
          items: [
            { text: "Close substitutes: one brand of tea is elastic, tea in general is not.", anchor: { kind: "time", at: m(22, 5) } },
            { text: "A big share of the budget, like rent or a scooter.", anchor: { kind: "time", at: m(24, 48) } },
            { text: "Time: people find alternatives to petrol over years, not days.", anchor: { kind: "time", at: m(27, 20) } },
          ],
        },
        { type: "heading", text: "4. Elasticity and total revenue", anchor: { kind: "time", at: m(34, 0) } },
        {
          type: "bullets",
          items: [
            { text: "Elastic demand: a price cut raises total revenue. Inelastic demand: a price rise does.", anchor: { kind: "time", at: m(35, 12) } },
            { text: "Student question: why can farmers earn less after a bumper harvest? Because food demand is inelastic, the price falls by more than quantity rises.", anchor: { kind: "time", at: m(41, 30) } },
          ],
        },
        {
          type: "callout",
          label: "Flagged by the lecturer",
          text: "“The total-revenue test is on the midterm every year. Be able to argue it in both directions.”",
        },
        { type: "heading", text: "Tasks & deadlines" },
        {
          type: "tasks",
          items: [
            { task: "Problem set 5: elasticity questions 1–8", kind: "homework", due: "Fri, 2 Oct", anchor: { kind: "time", at: m(52, 10) } },
            { task: "Read Mankiw ch. 5, sections 5.1–5.2", kind: "reading", due: "Tue, 29 Sep", anchor: { kind: "time", at: m(53, 2) } },
            { task: "Midterm: lectures 1–15, closed book", kind: "exam", due: "Wed, 14 Oct", anchor: { kind: "time", at: m(53, 40) } },
            { task: "Pick a market for the group elasticity presentation", kind: "project", due: NOT_MENTIONED, anchor: { kind: "time", at: m(54, 20) } },
          ],
        },
      ],
    },
    steps: [
      { title: "Hit record in class", body: "Open the app on your phone or laptop and leave it on the desk. It keeps recording with the screen off, up to 6 hours on Pro. Or upload a voice memo afterwards." },
      { title: "Pick Lecture", body: "Or let auto-detect choose. Detailed notes, revision points, flashcards, a quiz, a glossary and Tasks & deadlines are on by default." },
      { title: "Review after class", body: "Skim the notes on the way home, jump to any timestamp that's unclear, and tick off tasks from every course in one list." },
    ],
    faq: [
      {
        q: "Am I allowed to record my lectures?",
        a: "It depends on your institution and your lecturer. Many allow personal recordings for study; some ask you to get permission first. Check your course policy or ask the lecturer. The in-app recorder reminds you before it starts.",
      },
      {
        q: "Will it hear the lecturer from the middle of the room?",
        a: "A phone on the desk in the first few rows works well. Background chatter and fan hum are cleaned up, and if a stretch is genuinely inaudible the notes say so instead of filling the gap.",
      },
      {
        q: "Does it tell the lecturer apart from students' questions?",
        a: "Not yet: the transcript doesn't label who is speaking. Questions asked in the room are still captured in the transcript and notes.",
      },
      {
        q: "What happens to the recording afterwards?",
        a: "By default it's kept with the note so you can replay any moment. Turn on “Delete originals after processing” in Settings and the audio is deleted once your notes are made, while your notes, transcript and tasks stay.",
      },
    ],
    cta: {
      title: { before: "Your next class,", accent: "already noted." },
      body: "Try it free for 7 days with 150 credits, enough for two lectures. Cancel anytime.",
    },
  },

  "lecture-notes": {
    slug: "lecture-notes",
    name: "Lecture notes",
    metaTitle: "AI lecture notes: detailed notes, flashcards and quizzes from YouTube lectures and slides",
    metaDescription:
      "Turn a YouTube lecture, a course video or a slide deck into detailed notes with timestamps, revision points, flashcards, a quiz and a glossary. Built for exam season.",
    keywords: ["lecture notes", "youtube lecture notes", "slides to notes", "lecture to flashcards", "lecture summary", "study notes"],
    eyebrow: "Use case · Lectures",
    title: { before: "Lecture notes you'd", accent: "actually", after: "revise from" },
    sub: "Paste the YouTube lecture, upload the course video or drop in the slides. Get structured notes with timestamps back to the lecture, plus flashcards and a quiz for the night before.",
    noteType: "lecture",
    source: {
      kind: "Lecture video",
      icon: "monitor",
      placeholders: ["Paste the course YouTube link…", "Drop week-9-slides.pptx…", "Upload the biochem lecture from the course portal…"],
    },
    art: "hero-slides",
    artTint: "var(--nt-lecture)",
    benefits: [
      {
        icon: "timer",
        title: "Every heading, a timestamp",
        body: "Confused by section three? Tap its chip and the video jumps to the exact minute the lecturer explained it. No more scrubbing.",
      },
      {
        icon: "brain",
        title: "Cards that come back on time",
        body: "Flashcards are generated from the lecture, then scheduled with spaced repetition so the hard ones return before you forget them.",
      },
      {
        icon: "languages",
        title: "Hindi class, English notes",
        body: "The lecture can switch between languages mid-sentence. Pick whichever language you revise in and the notes come out in it.",
      },
    ],
    sampleTitle: { before: "Seventy-two minutes of enzyme kinetics,", accent: "on one page" },
    sampleSub: "Detailed notes from a second-year biochemistry lecture. Tap a card to flip it.",
    sample: {
      output: "Detailed notes",
      file: "BIO 201 · Lecture 9: Enzyme kinetics.mp4",
      meta: ["1 h 12 min", "Lecture", "Slides attached"],
      blocks: [
        { type: "heading", text: "1. What an enzyme actually changes", anchor: { kind: "time", at: m(2, 40) } },
        {
          type: "paragraph",
          text: "Enzymes lower the activation energy of a reaction; they do not change ΔG or the equilibrium position. They speed up both directions equally.",
        },
        { type: "heading", text: "2. Michaelis–Menten kinetics", anchor: { kind: "time", at: m(11, 5) } },
        {
          type: "bullets",
          items: [
            { text: "v₀ = Vmax[S] / (Km + [S]), valid under steady-state assumptions.", anchor: { kind: "time", at: m(12, 30) } },
            { text: "Km is the substrate concentration at half of Vmax.", anchor: { kind: "time", at: m(15, 2) } },
            { text: "Low Km means high affinity: the enzyme is half-saturated at a low [S].", anchor: { kind: "time", at: m(16, 44) } },
          ],
        },
        { type: "heading", text: "3. Inhibition on a Lineweaver–Burk plot", anchor: { kind: "time", at: m(41, 12) } },
        {
          type: "bullets",
          items: [
            { text: "Competitive: lines meet on the y-axis, so apparent Km rises and Vmax is unchanged.", anchor: { kind: "time", at: m(43, 20) } },
            { text: "Non-competitive: lines meet on the x-axis, so Vmax falls and Km is unchanged.", anchor: { kind: "time", at: m(46, 5) } },
          ],
        },
        {
          type: "callout",
          label: "Flagged by the lecturer",
          text: "“Reading inhibition type off a Lineweaver–Burk plot comes up every year.” Worth a practice question.",
        },
        {
          type: "flashcards",
          items: [
            { q: "What does a low Km tell you about an enzyme?", a: "High affinity for its substrate: it reaches half of Vmax at a low [S].", anchor: { kind: "time", at: m(16, 44) } },
            { q: "Competitive inhibitor: effect on Km and Vmax?", a: "Apparent Km increases; Vmax stays the same.", anchor: { kind: "time", at: m(43, 20) } },
          ],
        },
      ],
    },
    steps: [
      { title: "Bring the lecture", body: "A YouTube link, a video from your course portal or the slide deck. Drop several files at once and each becomes its own note." },
      { title: "Pick Lecture", body: "Detailed notes, revision points, flashcards, a quiz and a glossary are on by default. Add key formulas or a mind map if you want them." },
      { title: "Revise on a schedule", body: "Due cards appear in Review every day across all your courses. Quizzes show which topics need another pass." },
    ],
    faq: [
      {
        q: "Can it handle maths and chemical formulas?",
        a: "Yes. Notes render equations properly, and the Key formulas output collects every formula from the lecture on one page with the timestamp where it was derived.",
      },
      {
        q: "My lecturer mostly reads from slides. Should I upload those too?",
        a: "Upload the one with the most in it. The recording catches everything that was said but never written down; the slides give clean page-by-page notes. You can add both, and each becomes its own note.",
      },
      {
        q: "Can I export flashcards to Anki?",
        a: "Yes, on every plan: export any set of flashcards as Anki CSV, or review them inside anything2note with the same spaced-repetition schedule.",
      },
      {
        q: "Can I use lectures from Coursera, NPTEL or my university's portal?",
        a: "Yes, if you can download the video or it's a public YouTube link. Sitting in the class itself? Use the Lecture recorder and record the audio live instead.",
      },
    ],
    cta: {
      title: { before: "This semester, take notes", accent: "once." },
      body: "Try it free for 7 days with 150 credits. Cancel anytime.",
    },
  },

  "youtube-to-notes": {
    slug: "youtube-to-notes",
    name: "YouTube to notes",
    metaTitle: "YouTube to notes: summarise any YouTube video into notes with timestamps",
    metaDescription:
      "Paste a YouTube link and get chapters, step-by-step notes, commands and a summary, each linked to the exact second in the video. Works for tutorials, lectures and talks.",
    keywords: ["youtube to notes", "youtube video summary", "youtube summarizer", "video to notes", "youtube transcript notes"],
    eyebrow: "Use case · YouTube",
    title: { before: "YouTube to notes,", accent: "without", after: "the rewatch" },
    sub: "Paste any public YouTube link. Get chapters, a step-by-step guide and every command or formula, each linked to the exact second it appears.",
    noteType: "tutorial",
    source: {
      kind: "YouTube link",
      icon: "monitor",
      placeholders: ["Paste youtube.com/watch?v=…", "Paste the conference talk link…", "Paste a 3-hour course video…"],
    },
    art: "hero-tv",
    artTint: "var(--nt-tutorial)",
    benefits: [
      {
        icon: "timer",
        title: "Fast, captions-first",
        body: "If the video has captions we start from those, so the first output usually lands in under a minute, even for a two-hour video.",
      },
      {
        icon: "terminal",
        title: "Every command, copyable",
        body: "Tutorials get a Commands & code output: each snippet shown on screen or read aloud, in order, in a copyable block with its timestamp.",
      },
      {
        icon: "layers",
        title: "Right notes for the video",
        body: "A coding tutorial gets steps and prerequisites. A lecture gets flashcards. A talk gets takeaways. Auto-detect picks, and you can change it.",
      },
    ],
    sampleTitle: { before: "A 19-minute tutorial,", accent: "step by step" },
    sampleSub: "Notes from a YouTube walkthrough on interactive rebasing in Git.",
    sample: {
      output: "Step-by-step guide",
      file: "youtube.com · Git rebase, properly (interactive rebase in 19 minutes)",
      meta: ["19 min", "Tutorial", "Captions"],
      blocks: [
        {
          type: "chapters",
          items: [
            { title: "Why rebase instead of merge", summary: "Linear history, cleaner reviews. Never rebase shared branches.", anchor: { kind: "time", at: m(0, 45) } },
            { title: "Starting an interactive rebase", summary: "git rebase -i HEAD~4 opens the todo list in your editor.", anchor: { kind: "time", at: m(4, 10) } },
            { title: "Squash, fixup and reword", summary: "Combining WIP commits and fixing messages.", anchor: { kind: "time", at: m(8, 32) } },
            { title: "Resolving conflicts mid-rebase", summary: "Fix, git add, git rebase --continue. Or --abort to bail out.", anchor: { kind: "time", at: m(13, 5) } },
          ],
        },
        { type: "heading", text: "Steps" },
        {
          type: "numbered",
          items: [
            { title: "Make sure your branch is up to date", body: "git fetch origin, then check you're on your feature branch, not main.", anchor: { kind: "time", at: m(3, 20) } },
            { title: "Open the todo list", body: "git rebase -i origin/main lists every commit since you branched, oldest first.", anchor: { kind: "time", at: m(4, 50) } },
            { title: "Mark commits to squash", body: "Change pick to fixup (f) on WIP commits to fold them into the one above without keeping their messages.", anchor: { kind: "time", at: m(9, 14) } },
            { title: "Push safely", body: "git push --force-with-lease, which refuses to overwrite commits someone else pushed.", anchor: { kind: "time", at: m(16, 40) } },
          ],
        },
        {
          type: "callout",
          label: "Troubleshooting",
          text: "Lost a commit? git reflog shows where HEAD has been. Check out the hash from before the rebase (shown at 17:55).",
        },
      ],
    },
    steps: [
      { title: "Paste the link", body: "Any public YouTube video, Short or playlist item. Private and members-only videos aren't supported." },
      { title: "Confirm the type", body: "We suggest one from the title and first few minutes: Tutorial, Lecture, Podcast & talk or General." },
      { title: "Watch less, know more", body: "Read the notes, then jump to only the parts worth watching. Ask the assistant anything about the video." },
    ],
    faq: [
      {
        q: "What if the video has no captions?",
        a: "We transcribe the audio instead. It takes a little longer but works for any language we support, and the timestamps are just as precise.",
      },
      {
        q: "Does a YouTube video count against my minutes?",
        a: "Yes. A video uses 1 credit per minute of its length the first time you add it, just like an upload. Regenerating or adding outputs later is free.",
      },
      {
        q: "Can I do a whole playlist?",
        a: "Paste videos one at a time for now, and put them in a folder. Each becomes its own item with its own notes, flashcards and chat.",
      },
      {
        q: "Is my YouTube history shared with anyone?",
        a: "No. Public videos are processed once and the transcript is cached to save time, but which videos you add, and your notes, are private to you.",
      },
    ],
    cta: {
      title: { before: "That 3-hour video in your Watch Later?", accent: "Read it instead." },
      body: "Try it free for 7 days. Paste your first link in seconds.",
    },
  },

  "pdf-to-notes": {
    slug: "pdf-to-notes",
    name: "PDF to notes",
    metaTitle: "PDF to notes: summaries, key concepts and flashcards with page references",
    metaDescription:
      "Upload a PDF, textbook chapter or research paper and get a summary, detailed notes, key concepts, flashcards and a quiz. Every point cites its page.",
    keywords: ["pdf to notes", "pdf summarizer", "research paper summary", "textbook notes AI", "chat with pdf"],
    eyebrow: "Use case · Documents",
    title: { before: "Forty pages in.", accent: "Five minutes", after: "out." },
    sub: "Upload a textbook chapter, paper or report. Get a summary, key concepts and flashcards, and every point cites the page it came from.",
    noteType: "reading",
    source: {
      kind: "PDF or document",
      icon: "file",
      placeholders: ["Upload a 40-page research PDF…", "Drop chapter-6-monetary-policy.pdf…", "Upload the week 3 reading pack…"],
    },
    art: "hero-pdf",
    artTint: "var(--nt-reading)",
    benefits: [
      {
        icon: "bookmark",
        title: "Page anchors, always",
        body: "Every summary line, concept and flashcard carries a page chip. Tap it and the viewer opens on that page, highlighted.",
      },
      {
        icon: "scan",
        title: "Photos of pages too",
        body: "No PDF? Snap each page (PNG, JPEG or WebP) and we read the text, diagrams and equations. Scanned PDFs without a text layer aren't supported yet, so upload photos of those pages instead.",
      },
      {
        icon: "search",
        title: "A reader that pushes back",
        body: "The Critique output lists assumptions, gaps and dated evidence, so you finish the chapter knowing what it doesn't say as well as what it does.",
      },
    ],
    sampleTitle: { before: "A textbook chapter,", accent: "with its citations intact" },
    sampleSub: "Notes from a 34-page macroeconomics chapter. Every chip is a page reference.",
    sample: {
      output: "Summary & key concepts",
      file: "ch06-monetary-policy-transmission.pdf",
      meta: ["34 pages", "Reading", "Text layer"],
      blocks: [
        { type: "heading", text: "Summary" },
        {
          type: "paragraph",
          text: "The chapter traces how a change in the policy rate reaches output and inflation through four channels, and argues that the credit channel matters most in bank-dominated economies.",
          anchor: { kind: "page", page: 2 },
        },
        { type: "heading", text: "Key concepts" },
        {
          type: "numbered",
          items: [
            { title: "Interest-rate channel", body: "Higher policy rates raise real borrowing costs, reducing investment and durable consumption.", anchor: { kind: "page", page: 6 } },
            { title: "Credit channel", body: "Tighter policy weakens bank balance sheets and borrower collateral, so lending falls by more than rates alone would imply.", anchor: { kind: "page", page: 11 } },
            { title: "Exchange-rate channel", body: "Rate rises attract capital inflows, appreciating the currency and lowering net exports.", anchor: { kind: "page", page: 17 } },
            { title: "Expectations channel", body: "Credible forward guidance moves long-term rates before the policy rate itself changes.", anchor: { kind: "page", page: 22 } },
          ],
        },
        {
          type: "glossary",
          items: [
            { term: "Repo rate", def: "The rate at which the central bank lends overnight to commercial banks against securities." },
            { term: "Transmission lag", def: "The delay between a policy change and its full effect on inflation, estimated here at 4–6 quarters." },
          ],
        },
        {
          type: "callout",
          label: "Critique & limitations",
          text: "The lag estimates on p. 27 use pre-2020 data; the chapter does not discuss how digital lending may have shortened them.",
        },
      ],
    },
    steps: [
      { title: "Upload the document", body: "PDF, Word, PowerPoint or photos of pages, up to 200 MB each. Drop several at once and each becomes its own note." },
      { title: "Pick Reading", body: "Summary, detailed notes, key concepts, flashcards and a quiz by default. Add a glossary, critique or citations." },
      { title: "Read with receipts", body: "Open the document beside the notes. Every chip jumps to its page, and the assistant cites pages when it answers." },
    ],
    faq: [
      {
        q: "How are pages counted?",
        a: "Each PDF page, slide or photo is 1 credit. A 34-page chapter uses 34 credits. Plans include 1,200 to 5,000 credits a month.",
      },
      {
        q: "Does it work on scanned or handwritten pages?",
        a: "Scanned PDFs without a text layer aren't supported yet. Photos of the pages work instead, printed or neatly handwritten: upload a PNG, JPEG or WebP of each page. HEIC photos need exporting as JPEG first.",
      },
      {
        q: "Can I ask questions about the PDF?",
        a: "Every item has an assistant that only answers from your document and cites the pages it used. If the answer isn't in there, it says so.",
      },
      {
        q: "Is my document used to train AI?",
        a: "No. Documents are private to you, sent to AI providers only to generate your notes, and never used to train models.",
      },
    ],
    cta: {
      title: { before: "The reading list is long.", accent: "Your notes don't have to be." },
      body: "Try it free for 7 days with 150 credits. Cancel anytime.",
    },
  },

  "podcast-summary": {
    slug: "podcast-summary",
    name: "Podcast summary",
    metaTitle: "Podcast summary: key takeaways, chapters and quotes from any episode",
    metaDescription:
      "Turn a podcast episode, keynote or webinar into a summary, key takeaways, chapters and highlight quotes, with every point linked to the exact moment in the audio.",
    keywords: ["podcast summary", "podcast notes", "podcast transcript summary", "webinar summary", "talk notes"],
    eyebrow: "Use case · Podcasts & talks",
    title: { before: "The whole episode, in", accent: "two minutes", after: "of reading" },
    sub: "Upload the episode or paste the link. Get the takeaways, chapters and lines worth quoting, so you know which twenty minutes are worth your commute.",
    noteType: "podcast",
    source: {
      kind: "Podcast episode",
      icon: "audio",
      placeholders: ["Add a podcast episode…", "Upload keynote-recording.mp4…", "Paste the webinar link…"],
    },
    art: "hero-mic",
    artTint: "var(--nt-podcast)",
    benefits: [
      {
        icon: "list",
        title: "Chapters that make sense",
        body: "Topic-based chapters, not every ten minutes. Each one has a two-line summary and a timestamp, so you can listen to just that part.",
      },
      {
        icon: "quote",
        title: "Quotes, verbatim",
        body: "Highlights are the speaker's real words, not paraphrases, each with a timestamp. Safe to quote in a newsletter or a thread.",
      },
      {
        icon: "layers",
        title: "From listening to doing",
        body: "Turn on Action ideas to get the episode's advice as a checklist, or flashcards if you're listening to learn.",
      },
    ],
    sampleTitle: { before: "An hour-long conversation,", accent: "distilled" },
    sampleSub: "Takeaways and chapters from an interview-format episode about planning and procrastination.",
    sample: {
      output: "Key takeaways & chapters",
      file: "the-long-game-ep88.mp3",
      meta: ["1 h 04 min", "2 speakers", "Podcast"],
      blocks: [
        { type: "heading", text: "Key takeaways" },
        {
          type: "bullets",
          items: [
            { text: "We underestimate tasks because we plan the best case and call it the likely case (the planning fallacy).", anchor: { kind: "time", at: m(6, 15) } },
            { text: "Looking at how long similar past projects took beats estimating from the task itself.", anchor: { kind: "time", at: m(18, 42) } },
            { text: "Deadlines you set for yourself work better when split into several smaller, evenly spaced ones.", anchor: { kind: "time", at: m(33, 8) } },
          ],
        },
        {
          type: "quote",
          text: "Your plan isn't a forecast. It's a wish with dates on it.",
          speaker: "Guest",
          anchor: { kind: "time", at: m(21, 30) },
        },
        { type: "heading", text: "Chapters" },
        {
          type: "chapters",
          items: [
            { title: "Why smart people plan badly", summary: "The planning fallacy and why expertise doesn't cure it.", anchor: { kind: "time", at: m(2, 0) } },
            { title: "The outside view", summary: "Reference-class forecasting, with a kitchen renovation example.", anchor: { kind: "time", at: m(15, 30) } },
            { title: "Self-imposed deadlines", summary: "What the evidence says about spacing and commitment.", anchor: { kind: "time", at: m(29, 45) } },
            { title: "Listener questions", summary: "Procrastination versus rest, and planning with ADHD.", anchor: { kind: "time", at: m(47, 10) } },
          ],
        },
      ],
    },
    steps: [
      { title: "Add the episode", body: "Upload an mp3 or video, or paste a YouTube link to the episode. Webinars and keynotes work the same way." },
      { title: "Pick Podcast & talk", body: "Summary, key takeaways, chapters and detailed notes by default. Add highlights, action ideas or flashcards." },
      { title: "Keep what matters", body: "Save the quotes, share a read-only link, or ask the assistant what the guest said about a specific topic." },
    ],
    faq: [
      {
        q: "Can I paste a Spotify or Apple Podcasts link?",
        a: "Not directly. Those platforms don't allow it. Upload the audio file, or paste a YouTube link if the show publishes there.",
      },
      {
        q: "How long can an episode be?",
        a: "Up to 2 hours per recording on Starter, 4 on Plus and 6 on Pro, which covers most marathon interviews.",
      },
      {
        q: "Will it get the speakers right?",
        a: "The transcript doesn't label speakers yet. Quotes and chapters come with timestamps, so you can jump straight to who said it.",
      },
      {
        q: "Can I share the summary?",
        a: "Yes. Share a read-only link to the notes, or export the takeaways as PDF, Word or Markdown and send them anywhere.",
      },
    ],
    cta: {
      title: { before: "Listen to the good", accent: "twenty minutes." },
      body: "Try it free for 7 days with 150 credits. Cancel anytime.",
    },
  },

  "interview-notes": {
    slug: "interview-notes",
    name: "Interview notes",
    metaTitle: "Interview notes: Q&A breakdowns, insights and quotes from interviews",
    metaDescription:
      "Upload a user-research, hiring or journalism interview and get a Q&A breakdown, key insights, verbatim highlights and follow-up questions, all linked to the moment they were said.",
    keywords: ["interview notes", "user research synthesis", "interview transcription summary", "qualitative research AI", "hiring interview notes"],
    eyebrow: "Use case · Interviews",
    title: { before: "Every interview,", accent: "quotable", after: "and searchable" },
    sub: "Upload a research session, hiring loop or on-the-record interview. Get a Q&A breakdown, insights and verbatim highlights you can cite to the second.",
    noteType: "interview",
    source: {
      kind: "Interview recording",
      icon: "mic",
      placeholders: ["Upload participant-04-session.m4a…", "Drop the candidate interview recording…", "Record an interview on your phone…"],
    },
    art: "feature-assistant",
    artTint: "var(--nt-interview)",
    benefits: [
      {
        icon: "tag",
        title: "Q&A, not a wall of text",
        body: "Each question you asked becomes a heading, with the answer condensed underneath and a timestamp to the full response.",
      },
      {
        icon: "quote",
        title: "Highlights you can trust",
        body: "Quotes are verbatim and attributed. Paste one into a research deck and anyone can click through to hear it in context.",
      },
      {
        icon: "eye",
        title: "Patterns across sessions",
        body: "Put a study's interviews in one folder and ask the assistant what came up in more than one, with citations to each session.",
      },
    ],
    sampleTitle: { before: "One research session,", accent: "already synthesised" },
    sampleSub: "From a 38-minute user interview with an operations manager at a logistics company. The participant is anonymised.",
    sample: {
      output: "Q&A breakdown & insights",
      file: "study-07 · P4-ops-manager.m4a",
      meta: ["38 min", "2 speakers", "Interview"],
      blocks: [
        {
          type: "qa",
          items: [
            {
              q: "Walk me through the last time a delivery slot was missed.",
              speaker: "P4",
              a: "The driver app showed the slot as confirmed, but the warehouse never got the update. They found out when the customer called.",
              anchor: { kind: "time", at: m(4, 22) },
            },
            {
              q: "How do you find out about exceptions today?",
              speaker: "P4",
              a: "A WhatsApp group with shift leads. Critical issues get lost between routine messages, especially overnight.",
              anchor: { kind: "time", at: m(11, 8) },
            },
            {
              q: "What would you change first?",
              speaker: "P4",
              a: "One screen of exceptions only, sorted by customer impact, not by time received.",
              anchor: { kind: "time", at: m(29, 50) },
            },
          ],
        },
        { type: "heading", text: "Key insights" },
        {
          type: "bullets",
          items: [
            { text: "Exceptions are discovered by customers, not the system: a trust problem, not a speed problem.", anchor: { kind: "time", at: m(5, 10) } },
            { text: "Chat-based escalation works by day and fails overnight when fewer leads are watching.", anchor: { kind: "time", at: m(12, 30) } },
          ],
        },
        {
          type: "quote",
          text: "I don't need more alerts. I need fewer, and the right ones.",
          speaker: "P4 · Operations manager",
          anchor: { kind: "time", at: m(30, 14) },
        },
      ],
    },
    steps: [
      { title: "Upload the session", body: "Any audio or video recording, up to 2 hours on Starter and 6 on Pro. The questions you asked become the Q&A breakdown." },
      { title: "Pick Interview", body: "Summary, Q&A breakdown, key insights and highlights by default. Add follow-up questions or a hiring scorecard." },
      { title: "Synthesise", body: "Group sessions in a folder, then ask across them. Share read-only links with stakeholders who weren't there." },
    ],
    faq: [
      {
        q: "Can I use it for hiring interviews?",
        a: "Yes. Turn on the Evaluation scorecard to map answers to your criteria. It lists evidence for each criterion and leaves the judgement to you.",
      },
      {
        q: "How do I anonymise participants?",
        a: "Every output is editable: replace names with P1, P2 and so on before you share or export. Ask for it up front too, with custom instructions like “refer to the participant as P4”.",
      },
      {
        q: "Does it keep the exact wording?",
        a: "Highlights and quotes are verbatim. The Q&A answers are condensed, and each links back to the full, unedited answer in the transcript.",
      },
      {
        q: "Where is interview audio stored?",
        a: "Privately, for your account only. Turn on “Delete originals after processing” in Settings and the recording is deleted once its notes are made.",
      },
    ],
    cta: {
      title: { before: "Spend the afternoon on insight,", accent: "not transcripts." },
      body: "Try it free for 7 days with 150 credits. Cancel anytime.",
    },
  },

  "whiteboard-to-notes": {
    slug: "whiteboard-to-notes",
    name: "Whiteboard to notes",
    metaTitle: "Whiteboard to notes: turn whiteboard photos and handwriting into notes",
    metaDescription:
      "Snap a photo of a whiteboard, flip chart or handwritten page and get clean typed notes, key points and tasks, with diagrams described in words.",
    keywords: ["whiteboard to notes", "whiteboard photo to text", "handwriting to notes", "flip chart notes", "photo to notes"],
    eyebrow: "Use case · Whiteboards",
    title: { before: "Snap the whiteboard", accent: "before", after: "it's wiped" },
    sub: "Photograph the whiteboard, flip chart or notebook page. Get typed notes, key points and tasks, with the boxes and arrows described in words.",
    noteType: "general",
    source: {
      kind: "Whiteboard photo",
      icon: "image",
      placeholders: ["Snap the whiteboard before it's wiped…", "Upload IMG_2231.jpg…", "Drop the flip chart photo…"],
    },
    art: "hero-polaroid",
    artTint: "var(--card)",
    benefits: [
      {
        icon: "scan",
        title: "Reads real handwriting",
        body: "Arrows, boxes, sticky notes and handwriting. Text is read in order and the layout is described, not just the letters.",
      },
      {
        icon: "shield",
        title: "Diagrams in words",
        body: "Boxes, arrows, charts and equations are described in enough detail to study from, not just skipped because they aren't text.",
      },
      {
        icon: "layers",
        title: "Several photos at once",
        body: "Took four photos of a long board? Drop them in together and each photo becomes its own note, ready in your library.",
      },
    ],
    sampleTitle: { before: "A messy architecture session,", accent: "made legible" },
    sampleSub: "From one phone photo of a whiteboard after a checkout redesign session. The photo sits beside the notes to check against.",
    sample: {
      output: "Key points & tasks",
      file: "IMG_2231.jpg · whiteboard",
      meta: ["1 photo", "Handwriting", "1 credit"],
      blocks: [
        { type: "heading", text: "Checkout v2: architecture sketch" },
        {
          type: "bullets",
          items: [
            { text: "Cart service owns pricing; checkout only reads a signed price snapshot." },
            { text: "Payment step becomes async: order is ‘pending’ until the webhook confirms." },
            { text: "Retry queue for failed webhooks, max 5 attempts, then alert on-call." },
            { text: "Open question circled: do we keep the saved-card fallback for card-on-file users?" },
          ],
        },
        { type: "heading", text: "From the sticky notes" },
        {
          type: "tasks",
          items: [
            { task: "Write the price snapshot schema", kind: "project", due: NOT_MENTIONED },
            { task: "Spike the webhook retry queue", kind: "project", due: "Thu, 1 Oct" },
          ],
        },
        {
          type: "callout",
          label: "The diagram",
          text: "Three boxes joined by arrows: cart service → checkout (signed price snapshot) → payment (async, webhook confirms).",
        },
      ],
    },
    steps: [
      { title: "Take the photo", body: "Straight on, in good light, with the whole board in frame. PNG, JPEG or WebP; on an iPhone, export HEIC photos as JPEG first." },
      { title: "Pick General, or Lecture", body: "General gives a summary, notes and key points. If the board is from a class, Lecture adds revision points, flashcards and Tasks & deadlines." },
      { title: "Wipe with confidence", body: "Check the notes against the photo, tick off your tasks, and share a read-only link with the room." },
    ],
    faq: [
      {
        q: "Does it work with diagrams, not just text?",
        a: "It describes boxes, arrows and groupings in words, such as “cart service → checkout, signed snapshot”. Complex drawings are summarised rather than redrawn.",
      },
      {
        q: "How is a photo counted?",
        a: "Each photo is 1 credit. Even Starter includes 1,200 a month, which is plenty of whiteboards.",
      },
      {
        q: "Which photo formats work?",
        a: "PNG, JPEG and WebP. HEIC, the iPhone default, isn't supported on the web yet: export it as JPEG, or set Camera → Formats to Most Compatible. The mobile apps convert photos for you.",
      },
      {
        q: "Can I photograph handwritten notebook pages?",
        a: "Yes, the same way. Upload several pages at once and each page becomes its own note.",
      },
      {
        q: "Can I do this from my phone?",
        a: "Yes. In the iOS and Android apps, tap Photo and take one with the camera; the app converts it to JPEG for you. The notes are waiting on the web when you get back to your desk.",
      },
    ],
    cta: {
      title: { before: "Wipe the board.", accent: "Keep the thinking." },
      body: "Try it free for 7 days with 150 credits. Cancel anytime.",
    },
  },
};

export function getUseCase(slug: string): UseCase | undefined {
  return (USE_CASE_SLUGS as readonly string[]).includes(slug) ? USE_CASES[slug as UseCaseSlug] : undefined;
}
