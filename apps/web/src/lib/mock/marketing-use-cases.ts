/**
 * Content for the SEO use-case pages at /(marketing)/[useCase].
 * Sample outputs are illustrative: invented but realistic, and they follow the
 * product's rules (anchors on every line, "Not mentioned" instead of guesses).
 */

import type { ArtId } from "@/lib/art";
import type { NoteTypeKey } from "@/lib/mock/note-types";
import { NOT_MENTIONED, type SampleDoc } from "@/lib/mock/marketing-samples";

export const USE_CASE_SLUGS = [
  "meeting-minutes",
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
  /** Short name for cross-links, e.g. "Meeting minutes" */
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
  "meeting-minutes": {
    slug: "meeting-minutes",
    name: "Meeting minutes",
    metaTitle: "AI meeting minutes generator: minutes, decisions and action items",
    metaDescription:
      "Upload or record a meeting and get proper minutes of meeting: attendees, discussion, decisions and action items with owners and due dates, each linked to the moment it was said.",
    keywords: ["meeting minutes", "minutes of meeting", "MoM generator", "action items", "meeting notes AI"],
    eyebrow: "Use case · Meetings",
    title: { before: "Minutes of meeting, written", accent: "before", after: "you've left the room" },
    sub: "Upload the recording or record right in the browser. Get proper minutes with attendees, discussion, decisions and owned action items, and every line links to the moment it was said.",
    noteType: "meeting",
    source: {
      kind: "Meeting recording",
      icon: "mic",
      placeholders: ["Drop Tuesday's stand-up recording…", "Upload client-call.m4a…", "Record the board review…"],
    },
    art: "hero-cassette",
    artTint: "var(--nt-meeting)",
    benefits: [
      {
        icon: "users",
        title: "Knows who said what",
        body: "Speaker labels (Pro) turn “someone mentioned” into “Arjun proposed”. Rename a speaker once and every minute, action and decision updates.",
      },
      {
        icon: "shield",
        title: "Never invents an owner",
        body: "If nobody took the task or named a date, it says Not mentioned. You fix it in one click. Nobody gets surprised by a deadline they never agreed to.",
      },
      {
        icon: "send",
        title: "Ready to send",
        body: "A follow-up email drafted from the decisions, minutes exported to DOCX for the file, and action items tracked across every meeting you've ever uploaded.",
      },
    ],
    sampleTitle: { before: "Real minutes, from a", accent: "47-minute", after: "call" },
    sampleSub: "Here's what comes back from a planning sync with four people and one too many agenda items.",
    sample: {
      output: "Minutes of meeting",
      file: "q4-planning-sync.m4a",
      meta: ["47 min", "4 speakers", "English"],
      blocks: [
        {
          type: "fields",
          rows: [
            { label: "Meeting", value: "Q4 planning sync" },
            { label: "Date", value: "Tue, 22 Sep 2026 · 10:00" },
            { label: "Attendees", value: "Priya (chair), Arjun, Meera, Kabir" },
            { label: "Apologies", value: NOT_MENTIONED },
          ],
        },
        { type: "heading", text: "Discussion" },
        {
          type: "numbered",
          items: [
            {
              title: "Q4 roadmap cut-line",
              body: "Priya proposed dropping bulk export from Q4 to protect the onboarding rewrite. Kabir raised that two enterprise pilots depend on it; agreed to ship a CSV-only version instead.",
              anchor: { kind: "time", at: m(3, 12) },
            },
            {
              title: "Onboarding drop-off",
              body: "Meera shared that 38% of new sign-ups leave at the workspace-invite step. Group favoured making invites skippable over redesigning the step.",
              anchor: { kind: "time", at: m(14, 40) },
            },
            {
              title: "Support hiring",
              body: "Ticket volume is up 60% since August. Arjun asked for one support hire now rather than two in January; no objection raised.",
              anchor: { kind: "time", at: m(31, 5) },
            },
          ],
        },
        { type: "heading", text: "Decisions" },
        {
          type: "decisions",
          items: [
            { text: "Bulk export ships as CSV-only in Q4; full export moves to Q1.", anchor: { kind: "time", at: m(9, 48) } },
            { text: "Workspace invites become skippable in the next release.", anchor: { kind: "time", at: m(22, 3) } },
          ],
        },
        { type: "heading", text: "Action items" },
        {
          type: "actions",
          items: [
            { task: "Scope CSV-only export and share estimate", owner: "Kabir", due: "Fri, 25 Sep", anchor: { kind: "time", at: m(10, 20) } },
            { task: "Ship skippable invite step behind a flag", owner: "Meera", due: NOT_MENTIONED, anchor: { kind: "time", at: m(23, 11) } },
            { task: "Open support role and draft JD", owner: NOT_MENTIONED, due: NOT_MENTIONED, anchor: { kind: "time", at: m(33, 40) } },
          ],
        },
        {
          type: "callout",
          label: "Next meeting",
          text: "Tue, 29 Sep. Suggested agenda: invite-step results, CSV export estimate, support JD review.",
        },
      ],
    },
    steps: [
      { title: "Record or upload", body: "Record in the browser or phone, or drop in an mp3, m4a, mp4 or a Zoom/Meet export. Up to 5 hours on Pro." },
      { title: "Pick Meeting", body: "Or let auto-detect choose. Minutes, TL;DR, action items, decisions and detailed notes are switched on by default." },
      { title: "Review and send", body: "Tick off actions, fix an owner, then copy the follow-up email or export the minutes to DOCX." },
    ],
    faq: [
      {
        q: "Does it work with Zoom, Google Meet and Teams recordings?",
        a: "Yes. Upload the audio or video file any of them export (mp4, m4a, webm, wav…). There's no bot that joins your call. You stay in control of what gets recorded.",
      },
      {
        q: "What if two people talk over each other?",
        a: "Speaker labels handle most crosstalk. Where the audio is genuinely ambiguous, the minutes attribute the point to the group rather than guessing a name.",
      },
      {
        q: "Do I need everyone's consent to record?",
        a: "In many places you do, and it's good practice everywhere. The in-app recorder shows a consent reminder before it starts. Recording lawfully is your responsibility.",
      },
      {
        q: "Can I delete the recording after the minutes are made?",
        a: "Yes. Auto-delete is on by default for meetings: the original file is removed right after processing, and the minutes, transcript and actions stay.",
      },
    ],
    cta: {
      title: { before: "Your next meeting,", accent: "already minuted." },
      body: "Start free with 120 media minutes a month, which covers two or three meetings. No card required.",
    },
  },

  "lecture-notes": {
    slug: "lecture-notes",
    name: "Lecture notes",
    metaTitle: "AI lecture notes: detailed notes, flashcards and quizzes from any lecture",
    metaDescription:
      "Turn a lecture recording, slides or a YouTube class into detailed notes with timestamps, revision points, flashcards, a quiz and a glossary. Built for exam season.",
    keywords: ["lecture notes", "AI note taker for students", "lecture to flashcards", "lecture summary", "study notes"],
    eyebrow: "Use case · Lectures",
    title: { before: "Lecture notes you'd", accent: "actually", after: "revise from" },
    sub: "Record the class, upload the slides or paste the YouTube link. Get structured notes with timestamps back to the lecture, plus flashcards and a quiz for the night before.",
    noteType: "lecture",
    source: {
      kind: "Lecture recording",
      icon: "audio",
      placeholders: ["Upload this morning's biochem lecture…", "Paste the course YouTube link…", "Drop week-9-slides.pptx…"],
    },
    art: "hero-slides",
    artTint: "var(--nt-lecture)",
    benefits: [
      {
        icon: "timer",
        title: "Every heading, a timestamp",
        body: "Confused by section three? Tap its chip and the recording jumps to the exact minute the lecturer explained it. No more scrubbing.",
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
      { title: "Bring the lecture", body: "A recording, the slide deck, a YouTube link or all three. Slides and audio can be combined into one item." },
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
        a: "Upload both. The notes use the slides for structure and spelling of technical terms, and the recording for everything that was said but never written down.",
      },
      {
        q: "Can I export flashcards to Anki?",
        a: "On Pro, yes: Anki CSV export for any item. On Free you can review cards inside anything2note with the same spaced-repetition schedule.",
      },
      {
        q: "Is it allowed to record lectures?",
        a: "That depends on your institution. Many allow personal recordings for study; some require permission. Check your course policy first.",
      },
    ],
    cta: {
      title: { before: "This semester, take notes", accent: "once." },
      body: "Start free with 120 media minutes and 50 document pages every month. No card required.",
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
        a: "Yes. A video uses its length in media minutes the first time you add it, just like an upload. Regenerating or adding outputs later is free.",
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
      body: "Start free with 120 media minutes a month. Paste your first link in seconds.",
    },
  },

  "pdf-to-notes": {
    slug: "pdf-to-notes",
    name: "PDF to notes",
    metaTitle: "PDF to notes: summaries, key concepts and flashcards with page references",
    metaDescription:
      "Upload a PDF, textbook chapter or research paper (including scanned ones) and get a summary, detailed notes, key concepts, flashcards and a quiz. Every point cites its page.",
    keywords: ["pdf to notes", "pdf summarizer", "research paper summary", "textbook notes AI", "chat with pdf"],
    eyebrow: "Use case · Documents",
    title: { before: "Forty pages in.", accent: "Five minutes", after: "out." },
    sub: "Upload a textbook chapter, paper or report, scanned or not. Get a summary, key concepts and flashcards, and every point cites the page it came from.",
    noteType: "reading",
    source: {
      kind: "PDF or document",
      icon: "file",
      placeholders: ["Upload a 40-page research PDF…", "Drop chapter-6-monetary-policy.pdf…", "Upload a scanned handout…"],
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
        title: "Scans and photos too",
        body: "Old handouts, photographed pages and scanned books go through OCR first, so you get the same notes from a phone photo as from a clean PDF.",
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
      { title: "Upload the document", body: "PDF, Word, PowerPoint or photos of pages, up to 2 GB on Pro. Scanned pages are OCR'd automatically." },
      { title: "Pick Reading", body: "Summary, detailed notes, key concepts, flashcards and a quiz by default. Add a glossary, critique or citations." },
      { title: "Read with receipts", body: "Open the document beside the notes. Every chip jumps to its page, and the assistant cites pages when it answers." },
    ],
    faq: [
      {
        q: "How are pages counted?",
        a: "Each PDF page, slide or photo is one page. A 34-page chapter uses 34 of your monthly document pages. Free includes 50 a month, Pro 2,000.",
      },
      {
        q: "Does it work on scanned or handwritten pages?",
        a: "Yes. Printed scans work very well. Neat handwriting usually does too; anything we can't read confidently is marked as unclear rather than guessed.",
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
      body: "Start free with 50 document pages every month. No card required.",
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
        body: "Highlights are the speaker's real words with speaker labels, not paraphrases. Safe to quote in a newsletter or a thread.",
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
        a: "Up to 60 minutes per file on Free and up to 5 hours on Pro, which covers most marathon interviews.",
      },
      {
        q: "Will it get the speakers right?",
        a: "On Pro, speaker labels separate the voices. Rename “Speaker 1” to the host once and every quote and chapter updates.",
      },
      {
        q: "Can I share the summary?",
        a: "Pro includes read-only share links. Send the takeaways to someone who doesn't have an account, with no sign-up required to read it.",
      },
    ],
    cta: {
      title: { before: "Listen to the good", accent: "twenty minutes." },
      body: "Start free with 120 media minutes a month. No card required.",
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
      { title: "Upload the session", body: "Any audio or video recording. Label the interviewer once and the Q&A breakdown follows." },
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
        a: "Rename speakers to P1, P2 and so on before sharing. Names change everywhere, including quotes and insights.",
      },
      {
        q: "Does it keep the exact wording?",
        a: "Highlights and quotes are verbatim. The Q&A answers are condensed, and each links back to the full, unedited answer in the transcript.",
      },
      {
        q: "Where is interview audio stored?",
        a: "Privately, for your account only. Turn on auto-delete and the original recording is removed as soon as processing finishes.",
      },
    ],
    cta: {
      title: { before: "Spend the afternoon on insight,", accent: "not transcripts." },
      body: "Start free with 120 media minutes a month. No card required.",
    },
  },

  "whiteboard-to-notes": {
    slug: "whiteboard-to-notes",
    name: "Whiteboard to notes",
    metaTitle: "Whiteboard to notes: turn whiteboard photos and handwriting into notes",
    metaDescription:
      "Snap a photo of a whiteboard, flip chart or handwritten page and get clean typed notes, key points and action items, with each point linked to the area of the photo it came from.",
    keywords: ["whiteboard to notes", "whiteboard photo to text", "handwriting to notes", "flip chart notes", "OCR notes"],
    eyebrow: "Use case · Whiteboards",
    title: { before: "Snap the whiteboard", accent: "before", after: "it's wiped" },
    sub: "Photograph the whiteboard, flip chart or notebook page. Get typed notes, key points and action items, with each one pointing to where it was on the board.",
    noteType: "general",
    source: {
      kind: "Whiteboard photo",
      icon: "image",
      placeholders: ["Snap the whiteboard before it's wiped…", "Upload IMG_2231.jpg…", "Drop four photos of the flip chart…"],
    },
    art: "hero-polaroid",
    artTint: "var(--card)",
    benefits: [
      {
        icon: "scan",
        title: "Reads real handwriting",
        body: "Arrows, boxes, sticky notes and rushed handwriting. The layout is understood, not just the letters.",
      },
      {
        icon: "shield",
        title: "Marks what it can't read",
        body: "An illegible word is shown as [?] with a pointer to the spot on the photo. It's never quietly replaced with a guess.",
      },
      {
        icon: "layers",
        title: "Many photos, one note",
        body: "Took four photos of a long board? Upload them together and get one set of notes in the right order.",
      },
    ],
    sampleTitle: { before: "A messy architecture session,", accent: "made legible" },
    sampleSub: "From one phone photo of a whiteboard after a checkout redesign session. Chips point to regions of the photo.",
    sample: {
      output: "Key points & actions",
      file: "IMG_2231.jpg · whiteboard",
      meta: ["1 photo", "Handwriting", "3 regions"],
      blocks: [
        { type: "heading", text: "Checkout v2: architecture sketch", anchor: { kind: "region", label: "Top-left" } },
        {
          type: "bullets",
          items: [
            { text: "Cart service owns pricing; checkout only reads a signed price snapshot.", anchor: { kind: "region", label: "Top-left" } },
            { text: "Payment step becomes async: order is ‘pending’ until the webhook confirms.", anchor: { kind: "region", label: "Centre" } },
            { text: "Retry queue for failed webhooks, max 5 attempts, then alert on-call.", anchor: { kind: "region", label: "Centre" } },
            { text: "Open question circled: do we keep the [?] fallback for card-on-file users?", anchor: { kind: "region", label: "Right column" } },
          ],
        },
        { type: "heading", text: "From the sticky notes" },
        {
          type: "actions",
          items: [
            { task: "Write the price snapshot schema", owner: "RK", due: NOT_MENTIONED, anchor: { kind: "region", label: "Right column" } },
            { task: "Spike webhook retry queue", owner: NOT_MENTIONED, due: "Thu", anchor: { kind: "region", label: "Right column" } },
          ],
        },
        {
          type: "callout",
          label: "Couldn't read",
          text: "One word in the right column is illegible. It's marked [?] rather than guessed. Tap the chip to see that spot on the photo.",
        },
      ],
    },
    steps: [
      { title: "Take the photo", body: "Straight on if you can, but angled shots are fine. We correct perspective and glare. Add several photos for a long board." },
      { title: "Pick General, or Meeting", body: "General gives a summary, notes and key points. If the board was from a meeting, Meeting adds decisions and actions." },
      { title: "Wipe with confidence", body: "Check the [?] marks against the photo, tick your actions, and share the notes with the room." },
    ],
    faq: [
      {
        q: "Does it work with diagrams, not just text?",
        a: "It describes boxes, arrows and groupings in words, such as “cart service → checkout, signed snapshot”. Complex drawings are summarised rather than redrawn.",
      },
      {
        q: "How is a photo counted?",
        a: "Each photo is one document page. Free includes 50 pages a month, which is plenty of whiteboards.",
      },
      {
        q: "Can I photograph handwritten notebook pages?",
        a: "Yes, the same way. Upload several pages at once and they're combined in the order you add them.",
      },
      {
        q: "Can I do this from my phone?",
        a: "Yes. The iOS and Android apps open straight to the camera. The notes are waiting on the web when you get back to your desk.",
      },
    ],
    cta: {
      title: { before: "Wipe the board.", accent: "Keep the thinking." },
      body: "Start free with 50 document pages every month. No card required.",
    },
  },
};

export function getUseCase(slug: string): UseCase | undefined {
  return (USE_CASE_SLUGS as readonly string[]).includes(slug) ? USE_CASES[slug as UseCaseSlug] : undefined;
}
