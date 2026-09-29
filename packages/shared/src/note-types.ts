/**
 * Note types and the outputs each one makes (plan.md §2.2). Shared by the API (what to generate)
 * and both clients (pickers, labels). Colours live in @a2n/ui-tokens.
 */

export type NoteTypeKey = "lecture" | "interview" | "podcast" | "tutorial" | "reading" | "general";

export type OutputKey =
  | "detailed_notes"
  | "revision_points"
  | "flashcards"
  | "quiz"
  | "glossary"
  | "key_formulas"
  | "practice_exam"
  | "mind_map"
  | "summary"
  | "tasks"
  | "qa_breakdown"
  | "key_insights"
  | "highlights"
  | "follow_up_questions"
  | "scorecard"
  | "key_takeaways"
  | "chapters"
  | "action_ideas"
  | "step_by_step"
  | "prerequisites"
  | "code_snippets"
  | "troubleshooting"
  | "checklist"
  | "key_concepts"
  | "critique"
  | "citations"
  | "key_points";

export const OUTPUT_LABELS: Record<OutputKey, string> = {
  detailed_notes: "Detailed notes",
  revision_points: "Revision points",
  flashcards: "Flashcards",
  quiz: "Quiz",
  glossary: "Glossary",
  key_formulas: "Key formulas",
  practice_exam: "Practice exam",
  mind_map: "Mind map outline",
  summary: "TL;DR summary",
  tasks: "Tasks & deadlines",
  qa_breakdown: "Q&A breakdown",
  key_insights: "Key insights",
  highlights: "Highlights",
  follow_up_questions: "Follow-up questions",
  scorecard: "Evaluation scorecard",
  key_takeaways: "Key takeaways",
  chapters: "Chapters",
  action_ideas: "Action ideas",
  step_by_step: "Step-by-step guide",
  prerequisites: "Prerequisites",
  code_snippets: "Commands & code",
  troubleshooting: "Troubleshooting",
  checklist: "Checklist",
  key_concepts: "Key concepts",
  critique: "Critique & limitations",
  citations: "Citations",
  key_points: "Key points",
};

/** Which data shape (see api.ts `OutputData`) each output is generated as. */
export type OutputShape = "notes" | "summary" | "flashcards" | "quiz" | "tasks" | "generic";

export const OUTPUT_SHAPE: Record<OutputKey, OutputShape> = {
  detailed_notes: "notes",
  qa_breakdown: "notes",
  step_by_step: "notes",
  summary: "summary",
  flashcards: "flashcards",
  quiz: "quiz",
  practice_exam: "quiz",
  tasks: "tasks",
  revision_points: "generic",
  glossary: "generic",
  key_formulas: "generic",
  mind_map: "generic",
  key_insights: "generic",
  highlights: "generic",
  follow_up_questions: "generic",
  scorecard: "generic",
  key_takeaways: "generic",
  chapters: "generic",
  action_ideas: "generic",
  prerequisites: "generic",
  code_snippets: "generic",
  troubleshooting: "generic",
  checklist: "generic",
  key_concepts: "generic",
  critique: "generic",
  citations: "generic",
  key_points: "generic",
};

export type NoteTypeDef = {
  key: NoteTypeKey;
  label: string;
  blurb: string;
  defaults: OutputKey[];
  optional: OutputKey[];
  /** Generated first so the user sees something quickly (plan §5.2 step 6). */
  primary: OutputKey;
};

export const NOTE_TYPE_DEFS: NoteTypeDef[] = [
  {
    key: "lecture",
    label: "Lecture",
    blurb: "Recorded classes, courses, explainer videos.",
    defaults: ["detailed_notes", "revision_points", "flashcards", "quiz", "glossary", "tasks"],
    optional: ["summary", "key_formulas", "practice_exam", "mind_map"],
    primary: "detailed_notes",
  },
  {
    key: "interview",
    label: "Interview",
    blurb: "User research, hiring, journalism.",
    defaults: ["summary", "qa_breakdown", "key_insights", "highlights"],
    optional: ["follow_up_questions", "scorecard", "detailed_notes"],
    primary: "summary",
  },
  {
    key: "podcast",
    label: "Podcast & talk",
    blurb: "Episodes, keynotes, webinars.",
    defaults: ["summary", "key_takeaways", "chapters", "detailed_notes"],
    optional: ["highlights", "action_ideas", "flashcards"],
    primary: "summary",
  },
  {
    key: "tutorial",
    label: "Tutorial",
    blurb: "How-tos, walkthroughs, demos.",
    defaults: ["step_by_step", "prerequisites", "code_snippets", "summary"],
    optional: ["troubleshooting", "checklist", "quiz"],
    primary: "step_by_step",
  },
  {
    key: "reading",
    label: "Reading",
    blurb: "Papers, articles, book chapters.",
    defaults: ["summary", "detailed_notes", "key_concepts", "flashcards", "quiz"],
    optional: ["glossary", "critique", "citations"],
    primary: "summary",
  },
  {
    key: "general",
    label: "General",
    blurb: "Anything else worth remembering.",
    defaults: ["summary", "detailed_notes", "key_points"],
    optional: ["flashcards", "tasks", "chapters"],
    primary: "summary",
  },
];

export const NOTE_TYPE_KEYS = NOTE_TYPE_DEFS.map((n) => n.key);
export const OUTPUT_KEYS = Object.keys(OUTPUT_LABELS) as OutputKey[];

export const noteTypeDef = (key: NoteTypeKey): NoteTypeDef => NOTE_TYPE_DEFS.find((n) => n.key === key)!;
