import type { NoteTypeKey, OutputKey } from "../note-types";

export type SourceKind = "recording" | "upload" | "youtube" | "pdf" | "photo" | "link" | "text";
export type ItemStatus = "ready" | "processing" | "queued";
export type ProcessingStage = "extracting" | "transcribing" | "generating";

export type Stamped = { text: string; at?: number };
export type TranscriptLine = { speaker: string; at: number; text: string };

export type ActionItem = {
  id: string;
  itemId: string;
  task: string;
  /** null renders as italic "Not mentioned" — never invent owners. */
  owner: string | null;
  due: string | null;
  at: number;
  done: boolean;
};

export type Flashcard = { id: string; itemId: string; q: string; a: string; at: number };

export type QuizQuestion = {
  id: string;
  q: string;
  options: string[];
  correct: number;
  explain: string;
  at?: number;
};

export type OutputContent =
  | { kind: "minutes"; meta: string[]; items: { title: string; body: string; at: number }[] }
  | { kind: "actions"; items: ActionItem[] }
  | { kind: "decisions"; items: Stamped[] }
  | { kind: "notes"; sections: { heading: string; body: string; at?: number; bullets?: string[] }[] }
  | { kind: "flashcards"; cards: Flashcard[] }
  | { kind: "quiz"; questions: QuizQuestion[] }
  | { kind: "bullets"; items: Stamped[] }
  | { kind: "glossary"; terms: { term: string; def: string; at?: number }[] }
  | { kind: "summary"; text: string; at?: number };

export type ChatSeed = { q: string; a: string; at: number; suggestions: string[] };

export type Item = {
  id: string;
  title: string;
  type: NoteTypeKey;
  source: SourceKind;
  /** File name, channel, URL host… shown in mono. */
  sourceLabel: string;
  /** Seconds of media, or null for documents. */
  duration: number | null;
  pages?: number;
  createdAt: string;
  status: ItemStatus;
  stage?: ProcessingStage;
  progress?: number;
  outputs: Partial<Record<OutputKey, OutputContent>>;
  transcript: TranscriptLine[];
  chat?: ChatSeed;
};
