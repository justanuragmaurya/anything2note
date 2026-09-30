import {
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from "docx";
import { Hono } from "hono";
import { z } from "zod";
import {
  NOTE_TYPE_DEFS,
  OUTPUT_KEYS,
  OUTPUT_LABELS,
  youtubeWatchUrl,
  type Anchor,
  type LibraryItem,
  type OutputData,
  type OutputKey,
  type TaskKind,
} from "@a2n/shared";
import { fail, type AppEnv } from "../lib/http";
import { ownedSource } from "./library";
import { effectiveGenerations, outputEntries, selectedOutputs, toLibraryItem } from "./serialize";

/*
 * GET /sources/:id/export?format=docx|html&outputs=a,b: the user's ready outputs (as they see
 * them, edits included) as a Word file or a self-contained, print-ready HTML page that apps turn
 * into a PDF. Both render every OutputData shape the same way: timestamps and pages as
 * [12:30] / [p. 4], quiz answers after the questions, flashcards as a two-column table.
 */

export const exportsRoute = new Hono<AppEnv>();

type Section = { key: OutputKey; label: string; data: OutputData };
type ExportDoc = { item: LibraryItem; meta: string; sections: Section[] };

const outputKey = z.enum(OUTPUT_KEYS as [OutputKey, ...OutputKey[]]);
const querySchema = z.object({
  format: z.enum(["docx", "html"]),
  outputs: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").map((o) => o.trim()).filter(Boolean) : undefined))
    .pipe(z.array(outputKey).optional()),
});

exportsRoute.get("/sources/:id/export", async (c) => {
  const user = c.get("user");
  const { src, us } = await ownedSource(user.id, c.req.param("id"));
  const q = querySchema.parse({ format: c.req.query("format"), outputs: c.req.query("outputs") });
  const entries = await outputEntries(us, await effectiveGenerations(us, q.outputs));
  const sections = selectedOutputs(us).flatMap((key): Section[] => {
    const e = entries[key];
    return e?.status === "ready" && e.data ? [{ key, label: OUTPUT_LABELS[key], data: e.data }] : [];
  });
  if (!sections.length) throw fail(409, "NOTHING_TO_EXPORT", "None of these outputs are ready yet. Export again once they are.");

  const item = toLibraryItem(src, us);
  const doc: ExportDoc = { item, meta: metaLine(item), sections };
  const name = fileName(item.title);
  if (q.format === "html") {
    c.header("Content-Disposition", disposition("inline", name, "html"));
    return c.html(renderHtml(doc));
  }
  const file = await Packer.toArrayBuffer(renderDocx(doc));
  c.header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  c.header("Content-Disposition", disposition("attachment", name, "docx"));
  return c.body(file);
});

/* ───────────── Shared helpers ───────────── */

/** An ASCII-safe file name from the title (the header also carries the exact title as UTF-8). */
function fileName(title: string) {
  const ascii = title
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
  return { ascii: ascii || "notes", full: title.replace(/[\r\n"\\/]/g, " ").trim().slice(0, 120) || "notes" };
}

const disposition = (kind: "inline" | "attachment", name: ReturnType<typeof fileName>, ext: string) =>
  `${kind}; filename="${name.ascii}.${ext}"; filename*=UTF-8''${encodeURIComponent(`${name.full}.${ext}`)}`;

const clock = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(Math.floor(sec % 60)).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};

const anchorText = (a?: Anchor) => (!a ? "" : a.kind === "time" ? `[${clock(a.at)}]` : `[p. ${a.page}]`);

/** A YouTube timestamp links to that moment in the video. */
const anchorLink = (item: LibraryItem, a?: Anchor) =>
  a?.kind === "time" && item.youtubeId ? `${youtubeWatchUrl(item.youtubeId)}&t=${Math.floor(a.at)}s` : undefined;

const KIND_LABEL: Record<TaskKind, string> = { homework: "Homework", reading: "Reading", exam: "Exam", project: "Project" };
const dueText = (due: string | null) =>
  due ? new Date(`${due}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "Not mentioned";
const letter = (i: number) => String.fromCharCode(65 + i);

function metaLine(item: LibraryItem) {
  const parts = [NOTE_TYPE_DEFS.find((n) => n.key === item.noteType)?.label, item.sourceLabel];
  if (item.durationSec) parts.push(`${Math.max(1, Math.round(item.durationSec / 60))} min`);
  if (item.pages) parts.push(`${item.pages} ${item.pages === 1 ? "page" : "pages"}`);
  parts.push(new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }));
  return parts.filter(Boolean).join(" · ");
}

/** Model text can carry light markdown: **bold** and `code` spans. */
function spans(text: string): { text: string; bold?: boolean; code?: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((t) => (t.startsWith("**") && t.endsWith("**") ? { text: t.slice(2, -2), bold: true } : t.startsWith("`") && t.endsWith("`") ? { text: t.slice(1, -1), code: true } : { text: t }));
}

/** Multi-line text (mind maps, code) as paragraphs and "- " bullet lines. */
function lines(text: string): { kind: "p" | "li"; text: string; level: number }[] {
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      const m = l.match(/^(\s*)[-*•]\s+(.*)$/);
      return m ? { kind: "li", text: m[2]!, level: Math.min(3, Math.floor(m[1]!.length / 2)) } : { kind: "p", text: l.trim(), level: 0 };
    });
}

/* ───────────── HTML ───────────── */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inline = (s: string) => spans(s).map((p) => (p.bold ? `<strong>${esc(p.text)}</strong>` : p.code ? `<code>${esc(p.text)}</code>` : esc(p.text))).join("");

function htmlAnchor(item: LibraryItem, a?: Anchor) {
  if (!a) return "";
  const link = anchorLink(item, a);
  return link ? ` <a class="anchor" href="${esc(link)}">${anchorText(a)}</a>` : ` <span class="anchor">${anchorText(a)}</span>`;
}

function htmlText(text: string) {
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(`<ul>${list.join("")}</ul>`);
    list = [];
  };
  for (const l of lines(text)) {
    if (l.kind === "li") list.push(`<li style="margin-left:${l.level * 1.2}em">${inline(l.text)}</li>`);
    else {
      flush();
      out.push(`<p>${inline(l.text)}</p>`);
    }
  }
  flush();
  return out.join("");
}

function htmlSection(item: LibraryItem, { label, data }: Section): string {
  const a = (x?: Anchor) => htmlAnchor(item, x);
  let body = "";
  switch (data.type) {
    case "notes":
      body = data.sections
        .map(
          (s) =>
            `<h3>${inline(s.heading)}${a(s.anchor)}</h3>${s.body.map((p) => `<p>${inline(p)}</p>`).join("")}${
              s.bullets?.length ? `<ul>${s.bullets.map((b) => `<li>${inline(b)}</li>`).join("")}</ul>` : ""
            }`,
        )
        .join("");
      break;
    case "summary":
      body = `<p class="tldr"><strong>TL;DR</strong> ${inline(data.tldr)}</p><ul>${data.points.map((p) => `<li>${inline(p.text)}${a(p.anchor)}</li>`).join("")}</ul>`;
      break;
    case "flashcards":
      body = `<table class="cards"><thead><tr><th>Front</th><th>Back</th></tr></thead><tbody>${data.cards
        .map((c) => `<tr><td>${inline(c.front)}${a(c.anchor)}</td><td>${inline(c.back)}</td></tr>`)
        .join("")}</tbody></table>`;
      break;
    case "quiz":
      body = `<ol class="quiz">${data.questions
        .map((q) => `<li><p>${inline(q.q)}${a(q.anchor)}</p><ol type="A">${q.options.map((o) => `<li>${inline(o)}</li>`).join("")}</ol></li>`)
        .join("")}</ol><div class="answers"><h3>Answers</h3><ol>${data.questions
        .map((q) => `<li><strong>${letter(q.correct)}. ${inline(q.options[q.correct] ?? "")}</strong>${q.explanation ? ` — ${inline(q.explanation)}` : ""}</li>`)
        .join("")}</ol></div>`;
      break;
    case "tasks":
      body = data.items.length
        ? `<table class="tasks"><thead><tr><th></th><th>Task</th><th>Type</th><th>Due</th></tr></thead><tbody>${data.items
            .map((t) => `<tr><td class="tick">${t.done ? "☑" : "☐"}</td><td>${inline(t.task)}${a(t.anchor)}</td><td>${KIND_LABEL[t.kind]}</td><td>${dueText(t.due)}</td></tr>`)
            .join("")}</tbody></table>`
        : `<p class="muted">No tasks or deadlines were mentioned.</p>`;
      break;
    case "generic":
      body = `${data.intro ? `<p>${inline(data.intro)}</p>` : ""}${data.blocks
        .map((b) => `<div class="block">${b.title ? `<h4>${inline(b.title)}${a(b.anchor)}</h4>${htmlText(b.text)}` : `${htmlText(b.text).replace(/<\/p>$/, `${a(b.anchor)}</p>`)}`}</div>`)
        .join("")}`;
      break;
  }
  return `<section><h2>${esc(label)}</h2>${body}</section>`;
}

function renderHtml({ item, meta, sections }: ExportDoc): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(item.title)}</title>
<style>
  @page { margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font: 11pt/1.55 -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #1a1a1a; background: #fff; max-width: 780px; margin: 0 auto; padding: 32px 20px; }
  header { border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 8px; }
  h1 { font-size: 22pt; line-height: 1.2; margin: 0 0 6px; }
  .meta, .muted { color: #666; font-size: 9.5pt; margin: 0; }
  .meta a { color: #666; }
  h2 { font-size: 15pt; margin: 28px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #ddd; break-after: avoid; }
  h3 { font-size: 12pt; margin: 18px 0 6px; break-after: avoid; }
  h4 { font-size: 11pt; margin: 12px 0 2px; break-after: avoid; }
  p { margin: 0 0 8px; }
  ul, ol { margin: 0 0 10px; padding-left: 1.4em; }
  li { margin: 2px 0; }
  code { font: 10pt ui-monospace, Menlo, Consolas, monospace; background: #f3f3f3; padding: 0 3px; border-radius: 3px; }
  .anchor { color: #777; font-size: 9pt; text-decoration: none; white-space: nowrap; }
  .tldr { background: #f6f6f6; padding: 10px 12px; border-radius: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; font-size: 10.5pt; }
  th, td { border: 1px solid #d6d6d6; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f3f3f3; }
  table.cards td { width: 50%; }
  tr, .block, .quiz > li { break-inside: avoid; }
  .tick { width: 1.6em; text-align: center; }
  .quiz > li { margin-bottom: 10px; }
  .answers { break-before: page; }
  @media screen { .answers { border-top: 1px dashed #bbb; margin-top: 18px; padding-top: 4px; } }
</style>
</head>
<body>
<header>
<h1>${esc(item.title)}</h1>
<p class="meta">${esc(meta)}${item.sourceUrl ? ` · <a href="${esc(item.sourceUrl)}">${esc(item.sourceUrl)}</a>` : ""}</p>
</header>
${sections.map((s) => htmlSection(item, s)).join("\n")}
</body>
</html>`;
}

/* ───────────── DOCX ───────────── */

function runs(text: string, extra: { bold?: boolean; italics?: boolean } = {}): TextRun[] {
  return spans(text).map((p) => new TextRun({ text: p.text, bold: p.bold || extra.bold, italics: extra.italics, font: p.code ? "Consolas" : undefined }));
}

function docxAnchor(item: LibraryItem, a?: Anchor): ParagraphChild[] {
  if (!a) return [];
  const text = new TextRun({ text: ` ${anchorText(a)}`, color: "777777", size: 18 });
  const link = anchorLink(item, a);
  return [link ? new ExternalHyperlink({ link, children: [text] }) : text];
}

const para = (children: ParagraphChild[], opts: Partial<ConstructorParameters<typeof Paragraph>[0] & object> = {}) =>
  new Paragraph({ children, spacing: { after: 120 }, ...opts });

function docxText(text: string): Paragraph[] {
  return lines(text).map((l) => (l.kind === "li" ? new Paragraph({ children: runs(l.text), bullet: { level: l.level } }) : para(runs(l.text))));
}

function cell(children: Paragraph[], header = false, widthPct?: number) {
  return new TableCell({
    children,
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: header ? { type: ShadingType.CLEAR, fill: "F3F3F3", color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}

function table(head: string[], rows: Paragraph[][][], widths: number[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: head.map((h, i) => cell([new Paragraph({ children: [new TextRun({ text: h, bold: true })] })], true, widths[i])) }),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, false, widths[i])) })),
    ],
  });
}

function docxSection(item: LibraryItem, { label, data }: Section): (Paragraph | Table)[] {
  const a = (x?: Anchor) => docxAnchor(item, x);
  const out: (Paragraph | Table)[] = [new Paragraph({ text: label, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 } })];
  switch (data.type) {
    case "notes":
      for (const s of data.sections) {
        out.push(new Paragraph({ children: [...runs(s.heading), ...a(s.anchor)], heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } }));
        for (const p of s.body) out.push(para(runs(p)));
        for (const b of s.bullets ?? []) out.push(new Paragraph({ children: runs(b), bullet: { level: 0 } }));
      }
      break;
    case "summary":
      out.push(para([new TextRun({ text: "TL;DR  ", bold: true }), ...runs(data.tldr)]));
      for (const p of data.points) out.push(new Paragraph({ children: [...runs(p.text), ...a(p.anchor)], bullet: { level: 0 } }));
      break;
    case "flashcards":
      out.push(
        table(
          ["Front", "Back"],
          data.cards.map((c) => [[new Paragraph({ children: [...runs(c.front), ...a(c.anchor)] })], [new Paragraph({ children: runs(c.back) })]]),
          [50, 50],
        ),
      );
      break;
    case "quiz":
      data.questions.forEach((q, i) => {
        out.push(para([new TextRun({ text: `${i + 1}. `, bold: true }), ...runs(q.q, { bold: true }), ...a(q.anchor)], { spacing: { before: 160, after: 60 }, keepNext: true }));
        q.options.forEach((o, j) =>
          out.push(new Paragraph({ children: [new TextRun({ text: `${letter(j)}. ` }), ...runs(o)], indent: { left: 360 }, keepNext: j < q.options.length - 1 })),
        );
      });
      out.push(new Paragraph({ text: "Answers", heading: HeadingLevel.HEADING_2, pageBreakBefore: true }));
      data.questions.forEach((q, i) =>
        out.push(
          para([
            new TextRun({ text: `${i + 1}. ${letter(q.correct)}. `, bold: true }),
            ...runs(q.options[q.correct] ?? "", { bold: true }),
            ...(q.explanation ? [new TextRun({ text: " — " }), ...runs(q.explanation)] : []),
          ]),
        ),
      );
      break;
    case "tasks":
      if (!data.items.length) out.push(para([new TextRun({ text: "No tasks or deadlines were mentioned.", italics: true, color: "666666" })]));
      else
        out.push(
          table(
            ["", "Task", "Type", "Due"],
            data.items.map((t) => [
              [new Paragraph({ text: t.done ? "☑" : "☐" })],
              [new Paragraph({ children: [...runs(t.task), ...a(t.anchor)] })],
              [new Paragraph({ text: KIND_LABEL[t.kind] })],
              [new Paragraph({ text: dueText(t.due) })],
            ]),
            [6, 58, 16, 20],
          ),
        );
      break;
    case "generic":
      if (data.intro) out.push(para(runs(data.intro)));
      for (const b of data.blocks) {
        if (b.title) out.push(new Paragraph({ children: [...runs(b.title, { bold: true }), ...a(b.anchor)], spacing: { before: 160, after: 40 }, keepNext: true }));
        const body = docxText(b.text);
        if (!b.title && b.anchor && body.length) body.push(para(a(b.anchor)));
        out.push(...body);
      }
      break;
  }
  return out;
}

function renderDocx({ item, meta, sections }: ExportDoc): Document {
  const header: Paragraph[] = [
    new Paragraph({ text: item.title, heading: HeadingLevel.TITLE }),
    para([new TextRun({ text: meta, color: "666666", size: 19 })]),
  ];
  if (item.sourceUrl) header.push(para([new ExternalHyperlink({ link: item.sourceUrl, children: [new TextRun({ text: item.sourceUrl, style: "Hyperlink", size: 19 })] })]));
  return new Document({
    creator: "anything2note",
    title: item.title,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ children: [...header, ...sections.flatMap((s) => docxSection(item, s))] }],
  });
}
