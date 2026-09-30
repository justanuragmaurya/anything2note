import { env } from "cloudflare:workers";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  youtubeWatchUrl,
  type Anchor,
  type ItemStatus,
  type LibraryItem,
  type NoteTypeKey,
  type OutputData,
  type OutputEntry,
  type OutputKey,
  type Share,
  type SourceKind,
  type TaskKind,
} from "@a2n/shared";
import { flashcards, generations, tasks, type shares, type sources, type userSources } from "../db/schema";
import { db } from "../lib/http";

type SourceRow = typeof sources.$inferSelect;
export type UserSourceRow = typeof userSources.$inferSelect;
export type GenerationRow = typeof generations.$inferSelect;

export type SourceMeta = {
  /** File name, domain, YouTube channel, or "Pasted text" */
  label?: string;
  mime?: string;
  filename?: string;
  size?: number;
  durationSec?: number;
  pages?: number;
  /** Spoken language, when known before extraction (YouTube) */
  language?: string;
  /** What one user is charged for this source, set once it's extracted */
  credits?: number;
  minutes?: number;
};

/** Status is per user: people sharing a YouTube source each have their own run. */
export function statusOf(us: UserSourceRow): ItemStatus {
  switch (us.status) {
    case "ready":
      return { state: "ready" };
    case "failed":
      return { state: "failed", error: us.error ?? "Processing failed." };
    case "extracting":
    case "transcribing":
    case "generating":
      return { state: "processing", step: us.status, progress: us.progress };
    default:
      return { state: "queued" };
  }
}

function linkOf(src: SourceRow): string | undefined {
  if (!src.sourceRef) return undefined;
  if (src.kind === "web") return src.sourceRef;
  if (src.kind === "youtube") return youtubeWatchUrl(src.sourceRef);
}

export function toLibraryItem(src: SourceRow, us: UserSourceRow, flashcardsDue = 0): LibraryItem {
  const meta = JSON.parse(src.metaJson ?? "{}") as SourceMeta;
  const noteType = (us.noteType === "auto" ? "general" : us.noteType) as NoteTypeKey;
  return {
    id: src.id,
    title: us.titleOverride ?? src.title ?? meta.label ?? "Untitled",
    noteType,
    source: src.kind as SourceKind,
    sourceLabel: meta.label ?? "",
    sourceUrl: linkOf(src),
    youtubeId: src.kind === "youtube" ? (src.sourceRef ?? undefined) : undefined,
    durationSec: meta.durationSec || undefined,
    pages: meta.pages || undefined,
    createdAt: us.addedAt,
    folderId: us.folderId,
    outputs: JSON.parse(us.selectedOutputsJson) as OutputKey[],
    status: statusOf(us),
    flashcardsDue,
  };
}

/** Which generations a user reads: their own when they gave custom instructions, else the shared ones. */
export const variantOf = (us: Pick<UserSourceRow, "userId" | "instructions">) => (us.instructions ? us.userId : "shared");

export const selectedOutputs = (us: Pick<UserSourceRow, "selectedOutputsJson">) => JSON.parse(us.selectedOutputsJson) as OutputKey[];

/**
 * The generation a user sees for each output they picked (or just `only` of them). Their own row
 * (variant = their id: an output they edited or regenerated) wins over the shared one; with
 * custom instructions only their own rows count. Every read of a user's outputs goes through here.
 */
export async function effectiveGenerations(us: UserSourceRow, only?: OutputKey[]): Promise<Map<OutputKey, GenerationRow>> {
  const picked = selectedOutputs(us).filter((o) => !only || only.includes(o));
  const found = new Map<OutputKey, GenerationRow>();
  if (!picked.length) return found;
  const rows = await db
    .select()
    .from(generations)
    .where(
      and(
        eq(generations.sourceId, us.sourceId),
        inArray(generations.variant, us.instructions ? [us.userId] : ["shared", us.userId]),
        eq(generations.noteType, us.noteType),
        eq(generations.language, us.language),
        inArray(generations.outputType, picked),
      ),
    );
  for (const g of rows) if (!found.has(g.outputType as OutputKey) || g.variant !== "shared") found.set(g.outputType as OutputKey, g);
  return found;
}

/** Their own copy of one output, next to everyone else's shared one (not counting custom-instruction items, which have no shared copy). */
export const isCustom = (us: Pick<UserSourceRow, "userId" | "instructions">, g: Pick<GenerationRow, "variant">) => !us.instructions && g.variant === us.userId;

/**
 * Output entries as a user sees them, in their display order. Tasks come from the user's tasks
 * table (their ticks and edits, its ids) and flashcards from the generation's card rows (the ids
 * Review uses), not the stored JSON.
 */
export async function outputEntries(us: UserSourceRow, gens: Map<OutputKey, GenerationRow>): Promise<Partial<Record<OutputKey, OutputEntry>>> {
  const taskGen = gens.get("tasks");
  const cardGen = gens.get("flashcards");
  const [taskRows, cardRows] = await Promise.all([
    taskGen
      ? db
          .select()
          .from(tasks)
          .where(and(eq(tasks.userId, us.userId), eq(tasks.sourceId, us.sourceId), eq(tasks.generationId, taskGen.id)))
          .orderBy(asc(tasks.position))
      : [],
    cardGen ? db.select().from(flashcards).where(eq(flashcards.generationId, cardGen.id)).orderBy(asc(flashcards.position)) : [],
  ]);
  const outputs: Partial<Record<OutputKey, OutputEntry>> = {};
  for (const key of selectedOutputs(us)) {
    const g = gens.get(key);
    if (!g) continue;
    let data = parseJson<OutputData>(g.contentJson);
    if (data?.type === "tasks")
      data = {
        type: "tasks",
        items: taskRows.map((t) => ({ id: t.id, task: t.task, kind: t.kind as TaskKind, due: t.dueDate, anchor: parseJson<Anchor>(t.anchorJson), done: t.status === "done" })),
      };
    if (data?.type === "flashcards" && cardRows.length)
      data = { type: "flashcards", cards: cardRows.map((r) => ({ id: r.id, front: r.front, back: r.back, topic: r.topic, anchor: parseJson<Anchor>(r.anchorJson) })) };
    outputs[key] = {
      key,
      status: g.status as OutputEntry["status"],
      data,
      error: g.error ?? undefined,
      ...(isCustom(us, g) && { custom: true }),
    };
  }
  return outputs;
}

/** The public read-only link (apps/web renders /s/:slug). */
export const toShare = (row: typeof shares.$inferSelect): Share => ({ slug: row.id, url: `${env.WEB_ORIGIN}/s/${row.id}`, createdAt: row.createdAt });

export const parseJson = <T>(s: string | null | undefined): T | undefined => (s ? (JSON.parse(s) as T) : undefined);
