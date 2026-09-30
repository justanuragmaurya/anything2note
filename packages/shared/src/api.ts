/**
 * Request/response contract for apps/api (plan.md §5.1). Every route lives under `/api`, needs a
 * Better Auth session (cookie on web, SecureStore cookie header on mobile) and returns JSON.
 * Errors are `ApiError` with a 4xx/5xx status.
 */

import type { Billing } from "./billing";
import type { NoteTypeKey, OutputKey } from "./note-types";

export type ApiError = { error: { code: string; message: string } };

/* ───────────── Sources ───────────── */

export type SourceKind = "youtube" | "audio" | "video" | "recording" | "pdf" | "docx" | "slides" | "image" | "text" | "web";

/** Where in the source a piece of content came from. Text and web sources have none. */
export type Anchor = { kind: "time"; at: number } | { kind: "page"; page: number };

export type ProcessingStep = "extracting" | "transcribing" | "generating";

export type ItemStatus =
  | { state: "queued" }
  | { state: "processing"; step: ProcessingStep; /** 0–100 */ progress: number }
  | { state: "ready" }
  | { state: "failed"; error: string };

export type LibraryItem = {
  id: string;
  title: string;
  noteType: NoteTypeKey;
  source: SourceKind;
  /** File name, domain, YouTube channel, or "Pasted text" */
  sourceLabel: string;
  /** The original link, for web and YouTube sources */
  sourceUrl?: string;
  /** For YouTube sources: the video to embed (anchors seek it) */
  youtubeId?: string;
  durationSec?: number;
  pages?: number;
  /** Unix ms */
  createdAt: number;
  folderId: string | null;
  /** Outputs the user picked, in display order */
  outputs: OutputKey[];
  status: ItemStatus;
  flashcardsDue: number;
};

export type Folder = { id: string; name: string };

export type LibraryResponse = { items: LibraryItem[]; folders: Folder[] };

/* ───────────── Output data (content_json of a generation) ───────────── */

export type TaskKind = "homework" | "reading" | "exam" | "project";

export type Task = {
  id: string;
  task: string;
  kind: TaskKind;
  /** ISO date (yyyy-mm-dd) or null → "Not mentioned". Never invented. */
  due: string | null;
  anchor?: Anchor;
  done: boolean;
};

export type NoteSection = { heading: string; anchor?: Anchor; body: string[]; bullets?: string[] };
export type Flashcard = { id: string; front: string; back: string; anchor?: Anchor; topic: string };
export type QuizQuestion = {
  id: string;
  q: string;
  options: string[];
  correct: number;
  explanation: string;
  anchor?: Anchor;
  topic: string;
};
export type GenericBlock = { title?: string; text: string; anchor?: Anchor };

export type OutputData =
  | { type: "tasks"; items: Task[] }
  | { type: "notes"; sections: NoteSection[] }
  | { type: "summary"; tldr: string; points: { text: string; anchor?: Anchor }[] }
  | { type: "flashcards"; cards: Flashcard[] }
  | { type: "quiz"; questions: QuizQuestion[] }
  | { type: "generic"; intro?: string; blocks: GenericBlock[] };

export type OutputEntry = {
  key: OutputKey;
  status: "queued" | "running" | "ready" | "failed";
  data?: OutputData;
  error?: string;
  /** This user edited or regenerated it, so they have their own copy (others' shared copy is untouched) */
  custom?: boolean;
};

/* ───────────── Item workspace ───────────── */

/** One transcript line (media), page (documents) or paragraph (text/web). */
export type ContentSegment = { id: string; text: string; anchor?: Anchor; heading?: string; speaker?: string };

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string; citations: Anchor[]; createdAt: number };

export type ItemDetail = {
  item: LibraryItem;
  content: { kind: "media" | "document" | "text"; segments: ContentSegment[] } | null;
  outputs: Partial<Record<OutputKey, OutputEntry>>;
  /** Short-lived signed URL for the user's own uploaded file (player / page viewer) */
  mediaUrl: string | null;
  mediaType: string | null;
  chat: ChatMessage[];
  /** The read-only link, if the user has shared this item */
  share: Share | null;
};

/* ───────────── Creating items ───────────── */

/**
 * POST /api/uploads, then create a source with `uploadId`:
 * - `single`: PUT the whole file to `url` with `headers`.
 * - `multipart` (files over UPLOAD_LIMITS.multipartThresholdBytes): PUT each `partBytes` slice of the file
 *   to its part's `url` (part 1 = the first slice), read each response's `ETag` header, then
 *   POST /api/uploads/:uploadId/complete with every part's number and ETag.
 */
export type CreateUploadRequest = { filename: string; contentType: string; size: number };
export type CreateUploadResponse =
  | { uploadId: string; mode: "single"; url: string; headers: Record<string, string>; expiresAt: number }
  | { uploadId: string; mode: "multipart"; partBytes: number; parts: { number: number; url: string }[]; expiresAt: number };
/** POST /api/uploads/:id/complete → 200 { ok: true } */
export type CompleteUploadRequest = { parts: { number: number; etag: string }[] };

export type SourceInput =
  | { type: "upload"; uploadId: string; recording?: boolean }
  | { type: "text"; text: string; title?: string }
  /** A web page or a YouTube video link (the API tells them apart) */
  | { type: "url"; url: string };

/**
 * POST /api/sources → 201 with the new item. A public YouTube video the user already has returns
 * 200 with that item instead of a duplicate.
 */
export type CreateSourceRequest = {
  source: SourceInput;
  noteType: NoteTypeKey | "auto";
  /** Defaults to the note type's defaults */
  outputs?: OutputKey[];
  /** Output language; "auto" = same as the source */
  language?: string;
  instructions?: string;
};
export type CreateSourceResponse = { item: LibraryItem };

/**
 * PATCH /api/sources/:id → { item }. Changing `noteType` switches the item to that type's default
 * outputs and generates whichever are missing (no extra credits); poll the item as after creating it.
 */
export type UpdateSourceRequest = { title?: string; folderId?: string | null; noteType?: NoteTypeKey };

/* ───────────── Output actions (all free: credits are per minute/page, not per output) ───────────── */

/** POST /api/sources/:id/outputs → { item }: generates extra outputs; poll GET /sources/:id. */
export type AddOutputsRequest = { outputs: OutputKey[] };
/**
 * POST /api/sources/:id/outputs/:output/regenerate → { item }: a fresh version for this user only
 * (becomes `custom`), optionally steered by `instructions`; poll GET /sources/:id.
 */
export type RegenerateOutputRequest = { instructions?: string };
/**
 * PATCH /api/sources/:id/outputs/:output → { output }: saves a manual edit as this user's own copy.
 * `data.type` must match the output's shape. Editing flashcards resets their review schedule;
 * editing tasks keeps ticks for tasks whose text is unchanged.
 */
export type EditOutputRequest = { data: OutputData };
export type EditOutputResponse = { output: OutputEntry };
/** DELETE /api/sources/:id/outputs/:output/custom → { item }: drops this user's copy and goes back to the shared one. */
export type ItemResponse = { item: LibraryItem };

/**
 * POST /api/sources/:id/chat. With `Accept: text/event-stream` the answer streams as server-sent
 * events (`ChatStreamEvent`, one JSON object per `data:` line); otherwise it's one JSON `ChatResponse`.
 */
export type ChatRequest = { message: string };
export type ChatResponse = { message: ChatMessage };
export type ChatStreamEvent =
  /** More answer text, in order; append it */
  | { type: "delta"; text: string }
  /** The saved reply (full text + citations); replaces the streamed text */
  | { type: "done"; message: ChatMessage }
  | { type: "error"; error: { code: string; message: string } };

/* ───────────── Sharing ───────────── */

/** A read-only link to one item's outputs. */
export type Share = { slug: string; url: string; createdAt: number };
/** POST /api/sources/:id/share → { share } (returns the existing link if there is one) · DELETE /api/sources/:id/share → 204 */
export type ShareResponse = { share: Share };
/** GET /api/public/shares/:slug — no session needed. 404 once the owner stops sharing or deletes the item. */
export type SharedItem = {
  title: string;
  noteType: NoteTypeKey;
  source: SourceKind;
  sourceLabel: string;
  sourceUrl?: string;
  youtubeId?: string;
  durationSec?: number;
  pages?: number;
  createdAt: number;
  /** First name of whoever shared it */
  sharedBy: string;
  /** Ready outputs only, in the owner's display order */
  outputs: { key: OutputKey; data: OutputData }[];
};

/* ───────────── Exports ───────────── */

/**
 * GET /api/sources/:id/export?format=docx|html&outputs=detailed_notes,flashcards (outputs optional:
 * all ready ones). `docx` downloads a Word file; `html` is a self-contained print-ready page that
 * apps turn into a PDF (browser print dialog on web, expo-print on mobile). Markdown and Anki CSV
 * stay client-side.
 */
export type ExportFormat = "docx" | "html";

/* ───────────── Tasks, review, quiz ───────────── */

export type TrackedTask = Task & { itemId: string; itemTitle: string; itemDate: number; noteType: NoteTypeKey };
export type TasksResponse = { tasks: TrackedTask[] };
/** PATCH /api/tasks/:id — any subset; `due` is yyyy-mm-dd or null ("Not mentioned") */
export type UpdateTaskRequest = { done?: boolean; task?: string; kind?: TaskKind; due?: string | null };

export type ReviewCard = Flashcard & { itemId: string; itemTitle: string; noteType: NoteTypeKey };
export type DueCardsResponse = { cards: ReviewCard[] };
export type Rating = "again" | "hard" | "good" | "easy";
/** POST /api/reviews */
export type ReviewRequest = { cardId: string; rating: Rating };
export type ReviewResponse = { nextDue: number };

/** POST /api/quiz-attempts */
export type QuizAttemptRequest = { itemId: string; output: OutputKey; answers: number[] };
export type QuizAttemptResponse = { score: number; total: number };

/* ───────────── Account ───────────── */

export type MeResponse = {
  user: { id: string; name: string; email: string; image: string | null };
  billing: Billing;
  streak: number;
};

export type StatsResponse = {
  streak: number;
  cardsReviewedThisMonth: number;
  cardsReviewedLastMonth: number;
  /** null until a quiz has been answered */
  quizAccuracy: number | null;
  /** 26 weeks × 7 days of reviews, oldest first, last cell = today */
  heatmap: number[];
  /** Reviews Mon..Sun this week */
  weekly: number[];
  weakTopics: { topic: string; item: string; accuracy: number }[];
  billing: Billing;
};

/* ───────────── Settings ───────────── */

/** GET /api/settings → { settings } · PATCH /api/settings (any subset) → { settings }. Synced across devices. */
export type UserSettings = {
  /** Pre-selected in the add flow */
  defaultNoteType: NoteTypeKey | "auto";
  /** Output language; "auto" = same as the source */
  language: string;
  /** Delete uploaded files and recordings once their notes are made (the transcript/text is kept) */
  deleteOriginals: boolean;
  /** Email when an item's notes are ready */
  emailNotesReady: boolean;
  /** Morning email when flashcards are due or tasks are due that day */
  emailReminders: boolean;
};
export type SettingsResponse = { settings: UserSettings };

/* ───────────── Credit history ───────────── */

export type CreditEntry = {
  id: string;
  /** Unix ms */
  at: number;
  /** Positive = added, negative = spent */
  delta: number;
  reason: "grant" | "item" | "item_refund" | "chat" | "expire" | "topup";
  itemId?: string;
  itemTitle?: string;
  /** What an item charge bought */
  minutes?: number;
  pages?: number;
};
/** GET /api/billing/credits?before=<unix ms> → newest first, 50 per page; `next` is the `before` for the next page */
export type CreditHistoryResponse = { entries: CreditEntry[]; next: number | null };

/* ───────────── Limits ───────────── */

/** What the API can process today, whatever the plan (plan limits are in billing.ts). */
export const UPLOAD_LIMITS = {
  maxUploadBytes: 200 * 1024 * 1024,
  /** Audio/video over 25 MB is split into Whisper-sized chunks by the processor. Length is limited by the plan (`maxMediaSeconds`). */
  maxMediaBytes: 2 * 1024 * 1024 * 1024,
  /** Uploads bigger than this use multipart (see CreateUploadResponse) */
  multipartThresholdBytes: 50 * 1024 * 1024,
  /** In-app recordings stop at the plan's maxMediaSeconds; this is the ceiling across plans. */
  maxRecordingSeconds: 6 * 3600,
} as const;

/** Upload types the API can process today. */
export const SUPPORTED_UPLOADS: Record<Exclude<SourceKind, "youtube" | "text" | "web" | "recording">, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  slides: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  image: ["image/png", "image/jpeg", "image/webp"],
  audio: ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg", "audio/flac", "audio/aac"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
};
