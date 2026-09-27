/**
 * Temporary mirror of the note-type / output registry from plan.md §2.2 (copied from
 * apps/web/src/lib/mock/note-types.ts). Replace with `GET /note-types` once the API exists.
 */

import { noteTypeColor, type NoteTypeKey } from "@a2n/ui-tokens";

export type { NoteTypeKey };

export type OutputKey =
  | "detailed_notes"
  | "revision_points"
  | "flashcards"
  | "quiz"
  | "glossary"
  | "key_formulas"
  | "practice_exam"
  | "mind_map"
  | "minutes"
  | "summary"
  | "action_items"
  | "decisions"
  | "open_questions"
  | "follow_up_email"
  | "next_agenda"
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
  minutes: "Minutes of meeting",
  summary: "TL;DR summary",
  action_items: "Action items",
  decisions: "Decisions",
  open_questions: "Open questions & risks",
  follow_up_email: "Follow-up email",
  next_agenda: "Next agenda",
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

export type NoteType = {
  key: NoteTypeKey;
  label: string;
  blurb: string;
  color: string;
  defaults: OutputKey[];
  optional: OutputKey[];
};

export const NOTE_TYPES: NoteType[] = [
  {
    key: "lecture",
    label: "Lecture",
    blurb: "Classes, courses, explainer videos.",
    color: noteTypeColor.lecture,
    defaults: ["detailed_notes", "revision_points", "flashcards", "quiz", "glossary"],
    optional: ["key_formulas", "practice_exam", "mind_map"],
  },
  {
    key: "meeting",
    label: "Meeting",
    blurb: "Stand-ups, reviews, client calls.",
    color: noteTypeColor.meeting,
    defaults: ["minutes", "summary", "action_items", "decisions", "detailed_notes"],
    optional: ["open_questions", "follow_up_email", "next_agenda"],
  },
  {
    key: "interview",
    label: "Interview",
    blurb: "User research, hiring, journalism.",
    color: noteTypeColor.interview,
    defaults: ["summary", "qa_breakdown", "key_insights", "highlights"],
    optional: ["follow_up_questions", "scorecard", "detailed_notes"],
  },
  {
    key: "podcast",
    label: "Podcast & talk",
    blurb: "Episodes, keynotes, webinars.",
    color: noteTypeColor.podcast,
    defaults: ["summary", "key_takeaways", "chapters", "detailed_notes"],
    optional: ["highlights", "action_ideas", "flashcards"],
  },
  {
    key: "tutorial",
    label: "Tutorial",
    blurb: "How-tos, walkthroughs, demos.",
    color: noteTypeColor.tutorial,
    defaults: ["step_by_step", "prerequisites", "code_snippets", "summary"],
    optional: ["troubleshooting", "checklist", "quiz"],
  },
  {
    key: "reading",
    label: "Reading",
    blurb: "Papers, articles, book chapters.",
    color: noteTypeColor.reading,
    defaults: ["summary", "detailed_notes", "key_concepts", "flashcards", "quiz"],
    optional: ["glossary", "critique", "citations"],
  },
  {
    key: "general",
    label: "General",
    blurb: "Anything else worth remembering.",
    color: noteTypeColor.general,
    defaults: ["summary", "detailed_notes", "key_points"],
    optional: ["flashcards", "action_items", "chapters"],
  },
];

export const NOTE_TYPE_BY_KEY = Object.fromEntries(NOTE_TYPES.map((n) => [n.key, n])) as Record<NoteTypeKey, NoteType>;

export const noteType = (key: NoteTypeKey): NoteType => NOTE_TYPE_BY_KEY[key];
