import type { Anchor, NoteTypeKey, OutputData, OutputShape } from "@a2n/shared";
import { NOTE_TYPE_KEYS } from "@a2n/shared";
import { z } from "zod";

/*
 * What the model must return for each output shape. Ids and anchor objects are added by us
 * afterwards (toOutputData): the model only gives a bare number for `anchor` (seconds for media,
 * a page number for documents), and the schema only allows the kind the source actually has.
 */

export type AnchorKind = "time" | "page" | null;

const anchorField = (kind: AnchorKind) =>
  kind === "time"
    ? z.number().min(0).nullable().optional().describe("Seconds from the start, taken from the nearest [mm:ss] marker; null if unknown")
    : kind === "page"
      ? z.number().int().min(1).nullable().optional().describe("Page number, taken from the nearest [p. N] marker; null if unknown")
      : z.null().optional().describe("Always null (this content has no timestamps or pages)");

const text = z.string().min(1);

export function llmSchema(shape: OutputShape, kind: AnchorKind) {
  const anchor = anchorField(kind);
  switch (shape) {
    case "notes":
      return z.object({
        sections: z.array(z.object({ heading: text, anchor, body: z.array(text).describe("Paragraphs"), bullets: z.array(text).nullable().optional() })).min(1),
      });
    case "summary":
      return z.object({ tldr: text.describe("2–4 sentence summary"), points: z.array(z.object({ text, anchor })).min(1) });
    case "flashcards":
      return z.object({ cards: z.array(z.object({ front: text, back: text, topic: text, anchor })).min(1) });
    case "quiz":
      return z.object({
        questions: z
          .array(
            z.object({
              q: text,
              options: z.array(text).min(3).max(5),
              correct: z.number().int().min(0).describe("Index into options"),
              explanation: text,
              topic: text,
              anchor,
            }),
          )
          .min(1),
      });
    case "tasks":
      return z.object({
        items: z.array(
          z.object({
            task: text,
            kind: z.enum(["homework", "reading", "exam", "project"]),
            due: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/)
              .nullable()
              .describe("yyyy-mm-dd only if a date was actually said, else null"),
            anchor,
          }),
        ),
      });
    case "generic":
      return z.object({
        intro: z.string().nullable().optional(),
        blocks: z.array(z.object({ title: z.string().nullable().optional(), text, anchor })).min(1),
      });
  }
}

export const ANALYSE_SCHEMA = z.object({
  title: text.describe("Short, specific title for this content (max ~70 chars)"),
  noteType: z.enum(NOTE_TYPE_KEYS as [NoteTypeKey, ...NoteTypeKey[]]),
  language: text.describe("ISO 639-1 code of the content language, e.g. en, hi"),
});

export const chatSchema = (kind: AnchorKind) =>
  z.object({
    answer: text.describe("Markdown answer"),
    citations: z.array(z.number()).describe(kind ? `${kind === "time" ? "Seconds" : "Page numbers"} in the source supporting the answer` : "Always empty"),
  });

export const toAnchor = (kind: AnchorKind, v: number | null | undefined): Anchor | undefined =>
  v == null || kind == null ? undefined : kind === "time" ? { kind: "time", at: Math.max(0, Math.floor(v)) } : { kind: "page", page: Math.max(1, Math.round(v)) };

const id = (prefix: string, i: number) => `${prefix}${i + 1}`;

type Raw = Record<string, never>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/** Attach ids, build anchor objects and drop nulls so the stored JSON matches `OutputData` from @a2n/shared. */
export function toOutputData(shape: OutputShape, raw: Raw | Any, kind: AnchorKind): OutputData {
  const a = (v: number | null | undefined) => toAnchor(kind, v);
  const d = raw as Any;
  switch (shape) {
    case "notes":
      return {
        type: "notes",
        sections: d.sections.map((s: Any) => ({ heading: s.heading, anchor: a(s.anchor), body: s.body, bullets: s.bullets ?? undefined })),
      };
    case "summary":
      return { type: "summary", tldr: d.tldr, points: d.points.map((p: Any) => ({ text: p.text, anchor: a(p.anchor) })) };
    case "flashcards":
      return { type: "flashcards", cards: d.cards.map((c: Any, i: number) => ({ id: id("c", i), front: c.front, back: c.back, topic: c.topic, anchor: a(c.anchor) })) };
    case "quiz":
      return {
        type: "quiz",
        questions: d.questions.map((q: Any, i: number) => ({
          id: id("q", i),
          q: q.q,
          options: q.options,
          correct: Math.min(q.correct, q.options.length - 1),
          explanation: q.explanation,
          topic: q.topic,
          anchor: a(q.anchor),
        })),
      };
    case "tasks":
      return { type: "tasks", items: d.items.map((t: Any, i: number) => ({ id: id("t", i), task: t.task, kind: t.kind, due: t.due, anchor: a(t.anchor), done: false })) };
    case "generic":
      return { type: "generic", intro: d.intro ?? undefined, blocks: d.blocks.map((b: Any) => ({ title: b.title ?? undefined, text: b.text, anchor: a(b.anchor) })) };
  }
}

/** Citation markers in a streamed chat answer ([12:30], [1:02:03], [p. 4]) as anchors, in order, without repeats. */
export function citationsIn(text: string, kind: AnchorKind): Anchor[] {
  const found = new Map<string, Anchor>();
  if (kind === "time")
    for (const m of text.matchAll(/\[(\d{1,3}):(\d{2})(?::(\d{2}))?\]/g)) {
      const at = m[3] ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : Number(m[1]) * 60 + Number(m[2]);
      found.set(`t${at}`, { kind: "time", at });
    }
  if (kind === "page")
    for (const m of text.matchAll(/\[p(?:age|\.)?\s*(\d{1,5})\]/gi)) {
      const page = Math.max(1, Number(m[1]));
      found.set(`p${page}`, { kind: "page", page });
    }
  return [...found.values()];
}

/* ───────────── Manual edits (EditOutputRequest) ───────────── */

const editAnchor = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("time"), at: z.number().min(0) }),
    z.object({ kind: z.literal("page"), page: z.number().int().min(1) }),
  ])
  .nullish()
  .transform((a) => a ?? undefined);
const line = (max: number) => z.string().trim().min(1).max(max);
const optionalId = z.string().max(100).optional();

/** What a client may save as an edit of an output with this shape: `OutputData` with sane limits (ids optional). */
export function editSchema(shape: OutputShape) {
  switch (shape) {
    case "notes":
      return z.object({
        type: z.literal("notes"),
        sections: z
          .array(z.object({ heading: line(300), anchor: editAnchor, body: z.array(line(8000)).max(60), bullets: z.array(line(2000)).max(100).nullish() }))
          .min(1)
          .max(300),
      });
    case "summary":
      return z.object({ type: z.literal("summary"), tldr: line(4000), points: z.array(z.object({ text: line(2000), anchor: editAnchor })).max(100) });
    case "flashcards":
      return z.object({
        type: z.literal("flashcards"),
        cards: z
          .array(z.object({ id: optionalId, front: line(1000), back: line(4000), topic: z.string().trim().max(200).default(""), anchor: editAnchor }))
          .min(1)
          .max(500),
      });
    case "quiz":
      return z.object({
        type: z.literal("quiz"),
        questions: z
          .array(
            z
              .object({
                id: optionalId,
                q: line(2000),
                options: z.array(line(1000)).min(2).max(6),
                correct: z.number().int().min(0),
                explanation: z.string().trim().max(4000).default(""),
                topic: z.string().trim().max(200).default(""),
                anchor: editAnchor,
              })
              .refine((q) => q.correct < q.options.length, { message: "correct must point at one of the options", path: ["correct"] }),
          )
          .min(1)
          .max(200),
      });
    case "tasks":
      return z.object({
        type: z.literal("tasks"),
        items: z
          .array(
            z.object({
              id: optionalId,
              task: line(500),
              kind: z.enum(["homework", "reading", "exam", "project"]),
              due: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a yyyy-mm-dd date")
                .nullable(),
              anchor: editAnchor,
              done: z.boolean().default(false),
            }),
          )
          .max(200),
      });
    case "generic":
      return z.object({
        type: z.literal("generic"),
        intro: z.string().trim().max(4000).nullish(),
        blocks: z
          .array(z.object({ title: z.string().trim().max(300).nullish(), text: line(8000), anchor: editAnchor }))
          .min(1)
          .max(300),
      });
  }
}

/** A validated edit as stored `OutputData`: ids filled in, empty optionals dropped. */
export function toEditedData(shape: OutputShape, raw: unknown): OutputData {
  const d = editSchema(shape).parse(raw) as Any;
  switch (d.type as OutputShape) {
    case "notes":
      return { type: "notes", sections: d.sections.map((s: Any) => ({ ...s, bullets: s.bullets?.length ? s.bullets : undefined })) };
    case "flashcards":
      return { type: "flashcards", cards: d.cards.map((c: Any, i: number) => ({ ...c, id: c.id ?? id("c", i) })) };
    case "quiz":
      return { type: "quiz", questions: d.questions.map((q: Any, i: number) => ({ ...q, id: q.id ?? id("q", i) })) };
    case "tasks":
      return { type: "tasks", items: d.items.map((t: Any, i: number) => ({ ...t, id: t.id ?? id("t", i) })) };
    case "generic":
      return { type: "generic", intro: d.intro || undefined, blocks: d.blocks.map((b: Any) => ({ ...b, title: b.title || undefined })) };
    default:
      return d;
  }
}
