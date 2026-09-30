/**
 * Client-side exports: Markdown for any output, CSV for flashcards (Anki) and tasks. Word and
 * PDF come from the API (`GET /sources/:id/export`); `saveBlob` and `printHtml` hand them over.
 */

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
  saveBlob(new Blob([body], { type }), filename);
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Touch devices print an iframe unreliably (iOS prints the parent page), so they get a tab instead. */
const printInTab = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/**
 * Where the print-ready page will go. Call it synchronously in the click handler, before any
 * `await`, so the browser treats the new tab (touch devices) as user-initiated.
 */
export function openPrintTarget(): Window | null {
  if (!printInTab()) return null;
  const w = window.open("", "_blank");
  if (w) w.document.write("<!doctype html><title>Preparing PDF…</title><p style=\"font:14px system-ui;padding:24px;color:#5b3f3a\">Preparing your PDF…</p>");
  return w;
}

/**
 * Opens the browser's print dialog on a self-contained HTML page ("Save as PDF" is one of its
 * destinations). Desktop: a hidden same-origin iframe, removed afterwards. Touch devices: the tab
 * from `openPrintTarget`, where the page stays open to print or share.
 */
export function printHtml(html: string, target: Window | null = null): void {
  if (target && !target.closed) {
    target.document.open();
    target.document.write(html);
    target.document.close();
    const go = () => {
      target.focus();
      target.print();
    };
    if (target.document.readyState === "complete") setTimeout(go, 250);
    else target.addEventListener("load", () => setTimeout(go, 250), { once: true });
    return;
  }
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
  frame.srcdoc = html;
  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  frame.addEventListener(
    "load",
    () => {
      const w = frame.contentWindow;
      if (!w) return cleanup();
      w.addEventListener("afterprint", cleanup, { once: true });
      // Fonts and images inside the page need a moment after load.
      const fonts = (frame.contentDocument as (Document & { fonts?: FontFaceSet }) | null)?.fonts;
      void (fonts?.ready ?? Promise.resolve()).then(() =>
        setTimeout(() => {
          w.focus();
          w.print();
          // Safari doesn't always fire afterprint; don't leave the frame around forever.
          setTimeout(() => frame.remove(), 60_000);
        }, 150),
      );
    },
    { once: true },
  );
  document.body.appendChild(frame);
}

export const fileSafe = (s: string) => s.replace(/[^\w\- ]+/g, "").trim().slice(0, 60) || "note";
