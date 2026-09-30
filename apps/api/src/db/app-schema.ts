import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

/*
 * App tables (plan.md §6). IDs are text, timestamps Unix ms, JSON stored as text.
 * Extracted content lives in R2 (content/{sourceId}.json); D1 keeps metadata and per-user state.
 */

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;
const ownerId = () =>
  text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

/** A file the client is uploading (or has uploaded) straight to R2 with a presigned URL. */
export const uploads = sqliteTable("uploads", {
  id: text("id").primaryKey(),
  userId: ownerId(),
  r2Key: text("r2_key").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  /** R2 multipart upload id, for files sent in parts (null for a single PUT) */
  multipartId: text("multipart_id"),
  /** Set once a multipart upload is completed */
  completedAt: integer("completed_at"),
  createdAt: integer("created_at").notNull().default(now),
});

export const sources = sqliteTable(
  "sources",
  {
    id: text("id").primaryKey(),
    /** SourceKind from @a2n/shared */
    kind: text("kind").notNull(),
    visibility: text("visibility").notNull().default("private"),
    ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "cascade" }),
    /** Original R2 key, URL, or null for pasted text */
    sourceRef: text("source_ref"),
    contentHash: text("content_hash"),
    title: text("title"),
    /** { label, mime, size, durationSec, pages } */
    metaJson: text("meta_json"),
    language: text("language"),
    extractionMethod: text("extraction_method"),
    contentR2Key: text("content_r2_key"),
    /**
     * Extraction only (what each user sees is on user_sources): queued | extracting |
     * transcribing | ready | failed. Kept for older rows, which also used generating.
     */
    status: text("status").notNull().default("queued"),
    progress: integer("progress").notNull().default(0),
    error: text("error"),
    /** Workflow instance currently extracting this source; others wait (updated_at is its heartbeat). */
    processingBy: text("processing_by"),
    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (t) => [
    index("sources_owner_idx").on(t.ownerUserId),
    // A public YouTube video is one shared source, whoever adds it (plan.md §3 key principle 1).
    uniqueIndex("sources_shared_ref_idx").on(t.kind, t.sourceRef).where(sql`visibility = 'shared'`),
  ],
);

/**
 * One per source × variant × note type × language × output. Users who add the same shared source
 * with the same choices read the same rows; custom instructions give a user their own variant.
 */
export const generations = sqliteTable(
  "generations",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    /**
     * "shared", or a user id for that user's own copy: all their outputs when they gave custom
     * instructions, or one output they edited or regenerated. A user's own row wins over the shared one.
     */
    variant: text("variant").notNull().default("shared"),
    noteType: text("note_type").notNull(),
    outputType: text("output_type").notNull(),
    language: text("language").notNull().default("auto"),
    /** queued | running | ready | failed */
    status: text("status").notNull().default("queued"),
    contentJson: text("content_json"),
    model: text("model"),
    promptVersion: text("prompt_version"),
    error: text("error"),
    /** Workflow instance generating it while running (updated_at is its heartbeat) */
    runId: text("run_id"),
    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (t) => [uniqueIndex("generations_key_idx").on(t.sourceId, t.variant, t.noteType, t.language, t.outputType)],
);

export const folders = sqliteTable(
  "folders",
  {
    id: text("id").primaryKey(),
    userId: ownerId(),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("folders_user_idx").on(t.userId)],
);

/** A source in a user's library, with their choices for it. */
export const userSources = sqliteTable(
  "user_sources",
  {
    userId: ownerId(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    noteType: text("note_type").notNull(),
    selectedOutputsJson: text("selected_outputs_json").notNull(),
    language: text("language").notNull().default("auto"),
    instructions: text("instructions"),
    folderId: text("folder_id").references(() => folders.id, { onDelete: "set null" }),
    titleOverride: text("title_override"),
    /** What this user sees: queued | extracting | transcribing | generating | ready | failed */
    status: text("status").notNull().default("queued"),
    progress: integer("progress").notNull().default(0),
    error: text("error"),
    addedAt: integer("added_at").notNull().default(now),
    lastOpenedAt: integer("last_opened_at"),
    /** Always set explicitly (SQLite can't add a column with a computed default) */
    updatedAt: integer("updated_at").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.sourceId] }), index("user_sources_added_idx").on(t.userId, t.addedAt)],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    userId: ownerId(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    generationId: text("generation_id").references(() => generations.id, { onDelete: "set null" }),
    task: text("task").notNull(),
    /** homework | reading | project | exam */
    kind: text("kind").notNull(),
    dueDate: text("due_date"),
    /** open | done */
    status: text("status").notNull().default("open"),
    anchorJson: text("anchor_json"),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (t) => [index("tasks_user_idx").on(t.userId, t.status)],
);

export const flashcards = sqliteTable(
  "flashcards",
  {
    id: text("id").primaryKey(),
    generationId: text("generation_id")
      .notNull()
      .references(() => generations.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    front: text("front").notNull(),
    back: text("back").notNull(),
    topic: text("topic").notNull().default(""),
    anchorJson: text("anchor_json"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("flashcards_gen_idx").on(t.generationId)],
);

/** Spaced-repetition state per user and card. */
export const cardReviews = sqliteTable(
  "card_reviews",
  {
    userId: ownerId(),
    cardId: text("card_id")
      .notNull()
      .references(() => flashcards.id, { onDelete: "cascade" }),
    due: integer("due").notNull(),
    /** Current interval in days */
    intervalDays: real("interval_days").notNull().default(0),
    ease: real("ease").notNull().default(2.5),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    lastReview: integer("last_review"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.cardId] }), index("card_reviews_due_idx").on(t.userId, t.due)],
);

export const reviewLog = sqliteTable(
  "review_log",
  {
    id: text("id").primaryKey(),
    userId: ownerId(),
    cardId: text("card_id")
      .notNull()
      .references(() => flashcards.id, { onDelete: "cascade" }),
    /** again | hard | good | easy */
    rating: text("rating").notNull(),
    reviewedAt: integer("reviewed_at").notNull(),
  },
  (t) => [index("review_log_user_idx").on(t.userId, t.reviewedAt)],
);

export const quizAttempts = sqliteTable(
  "quiz_attempts",
  {
    id: text("id").primaryKey(),
    userId: ownerId(),
    generationId: text("generation_id")
      .notNull()
      .references(() => generations.id, { onDelete: "cascade" }),
    answersJson: text("answers_json").notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("quiz_attempts_user_idx").on(t.userId, t.createdAt)],
);

export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    userId: ownerId(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    /** user | assistant */
    role: text("role").notNull(),
    content: text("content").notNull(),
    citationsJson: text("citations_json"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("chat_user_source_idx").on(t.userId, t.sourceId, t.createdAt)],
);

/* ───────────── Billing & credits (plan.md §8) ───────────── */

/** One Dodo Payments subscription. A user has at most one live one (trialing/active/past_due/on_hold). */
export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: ownerId(),
    /** Dodo subscription id */
    providerSubId: text("provider_sub_id").notNull(),
    providerCustomerId: text("provider_customer_id").notNull(),
    /** starter | plus | pro */
    plan: text("plan").notNull(),
    /** BillingStatus from @a2n/shared */
    status: text("status").notNull(),
    trialEndsAt: integer("trial_ends_at"),
    currentPeriodStart: integer("current_period_start"),
    currentPeriodEnd: integer("current_period_end"),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).notNull().default(false),
    /** Downgrade scheduled for the next renewal */
    pendingPlan: text("pending_plan"),
    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (t) => [uniqueIndex("subscriptions_provider_idx").on(t.providerSubId), index("subscriptions_user_idx").on(t.userId, t.updatedAt)],
);

/** One grant of credits: a trial, one billing cycle of a plan, or a top-up pack. */
export const creditBuckets = sqliteTable(
  "credit_buckets",
  {
    id: text("id").primaryKey(),
    userId: ownerId(),
    /** trial | plan | topup */
    kind: text("kind").notNull(),
    granted: integer("granted").notNull(),
    remaining: integer("remaining").notNull(),
    /** Chat allowance for this cycle (trial/plan only) */
    chatGranted: integer("chat_granted").notNull().default(0),
    chatRemaining: integer("chat_remaining").notNull().default(0),
    expiresAt: integer("expires_at").notNull(),
    /** Idempotency key: `${subscriptionId}:trial`, `${subscriptionId}:${cycleStart}` or a payment id */
    ref: text("ref").notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [uniqueIndex("credit_buckets_ref_idx").on(t.ref), index("credit_buckets_user_idx").on(t.userId, t.expiresAt)],
);

/** Every change to a credit balance. */
export const creditLedger = sqliteTable(
  "credit_ledger",
  {
    id: text("id").primaryKey(),
    userId: ownerId(),
    bucketId: text("bucket_id").references(() => creditBuckets.id, { onDelete: "set null" }),
    /** Negative = spend, positive = grant or refund */
    delta: integer("delta").notNull(),
    /** grant | item | item_refund | chat | expire */
    reason: text("reason").notNull(),
    sourceId: text("source_id").references(() => sources.id, { onDelete: "set null" }),
    /** { minutes, pages } for items */
    metaJson: text("meta_json"),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("credit_ledger_user_idx").on(t.userId, t.createdAt), index("credit_ledger_source_idx").on(t.sourceId)],
);

/** Raw Dodo webhooks, for idempotency and debugging. */
export const billingEvents = sqliteTable("billing_events", {
  /** webhook-id header */
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  userId: text("user_id"),
  payloadJson: text("payload_json").notNull(),
  receivedAt: integer("received_at").notNull().default(now),
});

/* ───────────── Sharing, settings, reminders ───────────── */

/** A read-only public link to one user's item (their outputs as they see them). */
export const shares = sqliteTable(
  "shares",
  {
    /** URL slug */
    id: text("id").primaryKey(),
    userId: ownerId(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [uniqueIndex("shares_user_source_idx").on(t.userId, t.sourceId)],
);

/** UserSettings from @a2n/shared; a missing row means the defaults. */
export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  defaultNoteType: text("default_note_type").notNull().default("auto"),
  language: text("language").notNull().default("auto"),
  deleteOriginals: integer("delete_originals", { mode: "boolean" }).notNull().default(false),
  emailNotesReady: integer("email_notes_ready", { mode: "boolean" }).notNull().default(true),
  emailReminders: integer("email_reminders", { mode: "boolean" }).notNull().default(true),
  updatedAt: integer("updated_at").notNull().default(now),
});

/** One row per reminder email sent, so the daily cron never sends the same one twice. */
export const reminderLog = sqliteTable(
  "reminder_log",
  {
    userId: ownerId(),
    /** e.g. "daily" */
    kind: text("kind").notNull(),
    /** IST day number (lib/http istDay) */
    day: integer("day").notNull(),
    sentAt: integer("sent_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.kind, t.day] })],
);
