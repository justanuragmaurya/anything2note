import { env } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { Readability } from "@mozilla/readability";
import { strFromU8, unzipSync } from "fflate";
import { parseHTML } from "linkedom";
import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";
import type { ContentSegment, SourceKind } from "@a2n/shared";
import { llmJSON } from "../ai/llm";
import { IMAGE_PROMPT } from "../ai/prompts";
import { paragraphs, type ExtractedContent } from "./content";

/*
 * Turns a source into ExtractedContent (plan §5.2 step 2–3). Everything here runs inside the
 * Worker. YouTube runs as several workflow steps against the processor container instead
 * (pipeline/youtube.ts), so it isn't handled here.
 */

export type ExtractInput = { kind: SourceKind; sourceRef: string | null; mime?: string; filename?: string };

/** A failure the user should see (bad file, over limit); never retried. */
export const userError = (message: string) => new NonRetryableError(`USER:${message}`);

async function readObject(key: string): Promise<ArrayBuffer> {
  const obj = await env.BUCKET.get(key);
  if (!obj) throw userError("The uploaded file is missing. Try uploading it again.");
  return obj.arrayBuffer();
}

export async function extract(input: ExtractInput): Promise<ExtractedContent> {
  switch (input.kind) {
    case "text":
      return { kind: "text", segments: paragraphs(new TextDecoder().decode(await readObject(input.sourceRef!))), method: "plain" };
    case "web":
      return extractWeb(input.sourceRef!);
    case "pdf":
      return extractPdf(await readObject(input.sourceRef!));
    case "docx":
      return extractDocx(await readObject(input.sourceRef!));
    case "slides":
      return extractSlides(await readObject(input.sourceRef!));
    case "image":
      return extractImage(await readObject(input.sourceRef!), input.mime ?? "image/png");
    case "audio":
    case "video":
    case "recording":
      return transcribe(await readObject(input.sourceRef!), input.filename ?? "audio", input.mime ?? "audio/mpeg");
    case "youtube":
      throw new Error("YouTube sources are extracted by pipeline/youtube.ts");
  }
}

/* ───────────── Web pages ───────────── */

async function extractWeb(url: string): Promise<ExtractedContent> {
  const u = new URL(url);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw userError("Only http(s) links are supported.");
  let res: Response;
  try {
    res = await fetch(u, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; anything2note/1.0)", Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw userError("We couldn't reach that page.");
  }
  if (!res.ok) throw userError(`That page returned an error (${res.status}).`);
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/pdf")) return extractPdf(await res.arrayBuffer());
  if (!type.includes("html")) throw userError("That link isn't a web page we can read.");
  const html = (await res.text()).slice(0, 5_000_000);
  const { document } = parseHTML(html);
  const article = new Readability(document as unknown as ConstructorParameters<typeof Readability>[0]).parse();
  const text = article?.textContent?.trim();
  if (!text || text.length < 200) throw userError("We couldn't find readable text on that page.");
  // textContent flattens paragraphs; re-split on the line breaks Readability leaves.
  const segs = paragraphs(text.replace(/\n{1,}\s*/g, "\n\n"));
  return { kind: "text", title: article?.title?.trim() || u.hostname, segments: segs, method: "readability" };
}

/* ───────────── Documents ───────────── */

async function extractPdf(buf: ArrayBuffer): Promise<ExtractedContent> {
  let pages: string[];
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    ({ text: pages } = await extractText(pdf, { mergePages: false }));
  } catch {
    throw userError("We couldn't open that PDF. Is it password-protected or damaged?");
  }
  const segments: ContentSegment[] = [];
  pages.forEach((t, i) => {
    const clean = t.replace(/\s+/g, " ").trim();
    if (clean) segments.push({ id: `p${i + 1}`, anchor: { kind: "page", page: i + 1 }, text: clean });
  });
  const chars = segments.reduce((n, s) => n + s.text.length, 0);
  if (chars < 100 * Math.max(1, pages.length) * 0.2)
    throw userError("This PDF looks scanned (no text layer). Scanned PDFs aren't supported yet; try a photo of each page instead.");
  return { kind: "document", segments, pages: pages.length, method: "pdf_text" };
}

const xmlText = (xml: string, tag: string) =>
  [...xml.matchAll(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "g"))].map((m) => decodeXml(m[1]!)).join("");

const decodeXml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

function unzip(buf: ArrayBuffer) {
  try {
    return unzipSync(new Uint8Array(buf));
  } catch {
    throw userError("We couldn't open that file. Is it a valid Office document?");
  }
}

async function extractDocx(buf: ArrayBuffer): Promise<ExtractedContent> {
  const files = unzip(buf);
  const doc = files["word/document.xml"];
  if (!doc) throw userError("That doesn't look like a Word document.");
  const xml = strFromU8(doc);
  const paras = [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((m) => xmlText(m[0], "w:t").trim()).filter(Boolean);
  if (!paras.length) throw userError("That document has no text.");
  // Roughly 40 paragraphs per page, just for usage counting.
  return { kind: "text", segments: paras.map((p, i) => ({ id: `s${i + 1}`, text: p })), pages: Math.max(1, Math.ceil(paras.length / 40)), method: "office_xml" };
}

async function extractSlides(buf: ArrayBuffer): Promise<ExtractedContent> {
  const files = unzip(buf);
  const slides = Object.keys(files)
    .map((k) => k.match(/^ppt\/slides\/slide(\d+)\.xml$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ n: Number(m[1]), xml: strFromU8(files[m[0]]!) }))
    .sort((a, b) => a.n - b.n);
  if (!slides.length) throw userError("That doesn't look like a PowerPoint file.");
  const segments: ContentSegment[] = [];
  slides.forEach((s, i) => {
    const lines = [...s.xml.matchAll(/<a:p>[\s\S]*?<\/a:p>/g)].map((m) => xmlText(m[0], "a:t").trim()).filter(Boolean);
    if (lines.length) segments.push({ id: `p${i + 1}`, anchor: { kind: "page", page: i + 1 }, heading: lines[0], text: lines.slice(1).join("\n") || lines[0]! });
  });
  if (!segments.length) throw userError("Those slides have no text.");
  return { kind: "document", segments, pages: slides.length, method: "office_xml" };
}

/* ───────────── Images ───────────── */

async function extractImage(buf: ArrayBuffer, mime: string): Promise<ExtractedContent> {
  const b64 = base64(new Uint8Array(buf));
  const { data } = await llmJSON({
    model: env.MODEL_VISION,
    system: "You transcribe images for study notes.",
    user: [
      { type: "text", text: IMAGE_PROMPT },
      { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
    ],
    schema: z.object({ title: z.string(), text: z.string() }),
    maxTokens: 8000,
    reasoning: "off",
  });
  if (!data.text.trim()) throw userError("We couldn't find anything to read in that image.");
  return {
    kind: "document",
    title: data.title,
    segments: paragraphs(data.text).map((s) => ({ ...s, anchor: { kind: "page", page: 1 } })),
    pages: 1,
    method: "vision",
  };
}

function base64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/* ───────────── Audio / video ───────────── */

type WhisperResponse = { text: string; language?: string; duration?: number; segments?: { start: number; text: string }[] };

/** One Whisper request; segment times are shifted by `offsetSec` (for chunks of a longer recording). */
export async function whisper(buf: ArrayBuffer, filename: string, mime: string, offsetSec = 0) {
  const form = new FormData();
  form.append("file", new File([buf], filename, { type: mime }));
  form.append("model", env.STT_MODEL);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  const res = await fetch(`${env.STT_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.STT_API_KEY}` },
    body: form,
  });
  if (res.status === 400 || res.status === 413) throw userError("We couldn't transcribe that file. Check it has an audio track.");
  if (!res.ok) throw new Error(`Transcription ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const w = (await res.json()) as WhisperResponse;
  return {
    lines: (w.segments ?? []).map((s) => ({ at: Math.floor(offsetSec + s.start), text: s.text.trim() })).filter((s) => s.text),
    language: w.language,
    durationSec: w.duration ?? 0,
  };
}

async function transcribe(buf: ArrayBuffer, filename: string, mime: string): Promise<ExtractedContent> {
  const w = await whisper(buf, filename, mime);
  const segments: ContentSegment[] = w.lines.map((l, i) => ({ id: `t${i + 1}`, anchor: { kind: "time", at: l.at }, text: l.text }));
  if (!segments.length) throw userError("We couldn't hear any speech in that recording.");
  return { kind: "media", segments, durationSec: Math.round(w.durationSec), language: w.language, method: "whisper" };
}
