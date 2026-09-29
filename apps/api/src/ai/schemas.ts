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
