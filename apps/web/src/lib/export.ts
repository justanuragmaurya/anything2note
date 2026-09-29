/** Client-side exports: Markdown for any output, CSV for flashcards (Anki) and tasks. */

import type { Anchor, OutputData, Task } from "@a2n/shared";
import { fmtTime, TASK_KIND_LABELS } from "./format";

const at = (a?: Anchor) => (!a ? "" : a.kind === "time" ? ` _(${fmtTime(a.at)})_` : ` _(p. ${a.page})_`);

export function toMarkdown(title: string, label: string, data: OutputData): string {
  const out: string[] = [`# ${title}`, "", `## ${label}`, ""];
  switch (data.type) {
    case "notes":
      for (const s of data.sections) {
        out.push(`### ${s.heading}${at(s.anchor)}`, "", ...s.body.flatMap((b) => [b, ""]));
        if (s.bullets?.length) out.push(...s.bullets.map((b) => `- ${b}`), "");
      }
      break;
    case "summary":
      out.push(`**TL;DR** ${data.tldr}`, "", ...data.points.map((p, i) => `${i + 1}. ${p.text}${at(p.anchor)}`), "");
      break;
    case "generic":
      if (data.intro) out.push(data.intro, "");
      for (const b of data.blocks) out.push(b.title ? `- **${b.title}**: ${b.text}${at(b.anchor)}` : `- ${b.text}${at(b.anchor)}`);
      out.push("");
      break;
    case "flashcards":
      for (const c of data.cards) out.push(`- **Q:** ${c.front}`, `  **A:** ${c.back}${at(c.anchor)}`);
      out.push("");
      break;
    case "quiz":
      data.questions.forEach((q, i) => {
        out.push(`${i + 1}. ${q.q}`, ...q.options.map((o, n) => `   ${String.fromCharCode(65 + n)}. ${o}${n === q.correct ? " ✓" : ""}`), `   _${q.explanation}_`, "");
      });
      break;
    case "tasks":
      out.push(...data.items.map((t) => `- [${t.done ? "x" : " "}] ${t.task} · ${TASK_KIND_LABELS[t.kind]} · due ${t.due ?? "not mentioned"}${at(t.anchor)}`), "");
      break;
  }
  return out.join("\n");
}

const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export const toCsv = (rows: string[][]) => rows.map((r) => r.map(cell).join(",")).join("\n");

/** Front,Back,Tags — imports straight into Anki. */
export function flashcardsCsv(data: Extract<OutputData, { type: "flashcards" }>): string {
  return toCsv(data.cards.map((c) => [c.front, c.back, c.topic.replace(/\s+/g, "_")]));
}

export function tasksCsv(tasks: (Task & { itemTitle?: string })[]): string {
  return toCsv([["Task", "Type", "Due", "Done", "Note"], ...tasks.map((t) => [t.task, TASK_KIND_LABELS[t.kind], t.due ?? "", t.done ? "yes" : "no", t.itemTitle ?? ""])]);
}

export function download(filename: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const fileSafe = (s: string) => s.replace(/[^\w\- ]+/g, "").trim().slice(0, 60) || "note";
