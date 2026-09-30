/**
 * Exports from the item screen. PDF and Word are rendered by the API (`GET /sources/:id/export`);
 * Markdown is built here, in the same shape the web app downloads.
 */

import { fetch as expoFetch } from "expo/fetch";
import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform, Share } from "react-native";
import { OUTPUT_LABELS, type Anchor, type ExportFormat, type ItemDetail, type OutputData, type OutputKey, type TaskKind } from "@a2n/shared";
import { ApiError, apiUrl, responseError, sessionHeaders } from "./api";
import { fmtTime } from "./format";

const TASK_KIND: Record<TaskKind, string> = { homework: "Homework", reading: "Reading", exam: "Exam", project: "Project" };

const at = (a?: Anchor) => (!a ? "" : a.kind === "time" ? ` _(${fmtTime(a.at)})_` : ` _(p. ${a.page})_`);

/** A title as a file name: "Week 3: Entropy?" → "Week 3 Entropy". */
export const fileSafe = (s: string) => s.replace(/[^\w\- ]+/g, "").trim().slice(0, 60) || "note";

function outputMarkdown(label: string, data: OutputData): string[] {
  const out: string[] = [`## ${label}`, ""];
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
      out.push(...data.items.map((t) => `- [${t.done ? "x" : " "}] ${t.task} · ${TASK_KIND[t.kind]} · due ${t.due ?? "not mentioned"}${at(t.anchor)}`), "");
      break;
  }
  return out;
}

/** Every ready output of the item, in display order. */
export function itemMarkdown(detail: ItemDetail): string {
  const out = [`# ${detail.item.title}`, ""];
  for (const k of detail.item.outputs) {
    const o = detail.outputs[k];
    if (o?.status === "ready" && o.data) out.push(...outputMarkdown(OUTPUT_LABELS[k], o.data));
  }
  return out.join("\n").trim() + "\n";
}

export const hasReadyOutput = (detail: ItemDetail) => detail.item.outputs.some((k) => detail.outputs[k]?.status === "ready");

async function fetchExport(itemId: string, format: ExportFormat, outputs?: OutputKey[]) {
  const query = `format=${format}${outputs?.length ? `&outputs=${outputs.join(",")}` : ""}`;
  let res;
  try {
    res = await expoFetch(apiUrl(`/sources/${itemId}/export?${query}`), { credentials: "omit", headers: await sessionHeaders() });
  } catch {
    throw new ApiError(0, "NETWORK", "Can't reach anything2note. Check your connection and try again.");
  }
  if (!res.ok) throw responseError(res.status, await res.text().catch(() => ""));
  return res;
}

/** A fresh file in the cache named after the item, replacing an earlier export of it. */
function cacheFile(title: string, ext: string): File {
  const file = new File(Paths.cache, `${fileSafe(title)}.${ext}`);
  if (file.exists) file.delete();
  return file;
}

async function shareFile(file: File, mimeType: string, UTI: string, title: string) {
  if (!(await Sharing.isAvailableAsync())) throw new ApiError(0, "SHARE_UNAVAILABLE", "Sharing isn't available on this device.");
  await Sharing.shareAsync(file.uri, { mimeType, UTI, dialogTitle: title });
}

/** The API's print-ready HTML, turned into an A4 PDF on the device, then the share sheet. */
export async function exportPdf(detail: ItemDetail) {
  const html = await (await fetchExport(detail.item.id, "html")).text();
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  const file = cacheFile(detail.item.title, "pdf");
  new File(uri).moveSync(file);
  await shareFile(file, "application/pdf", "com.adobe.pdf", detail.item.title);
}

/** The API's Word file, saved to the cache, then the share sheet. */
export async function exportDocx(detail: ItemDetail) {
  const bytes = await (await fetchExport(detail.item.id, "docx")).bytes();
  const file = cacheFile(detail.item.title, "docx");
  file.write(bytes);
  await shareFile(file, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "org.openxmlformats.wordprocessingml.document", detail.item.title);
}

/** Markdown as plain text, so it pastes straight into a notes app. */
export async function shareMarkdown(detail: ItemDetail) {
  await Share.share({ message: itemMarkdown(detail), title: detail.item.title });
}

/** The system share sheet for a link (iOS shows the link preview; Android shares it as text). */
export async function shareLink(url: string, title: string) {
  await Share.share(Platform.OS === "ios" ? { url, title } : { message: url, title });
}
