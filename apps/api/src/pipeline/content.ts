import type { ContentSegment } from "@a2n/shared";

/** Normalised content for any source (plan §5.2 step 4), stored in R2 at content/{sourceId}.json. */
export type ExtractedContent = {
  kind: "media" | "document" | "text";
  title?: string;
  segments: ContentSegment[];
  durationSec?: number;
  pages?: number;
  language?: string;
  method: "plain" | "readability" | "pdf_text" | "office_xml" | "vision" | "whisper";
};

export const contentKey = (sourceId: string) => `content/${sourceId}.json`;

/** ~150k tokens; enough for a long lecture or a book chapter while keeping costs bounded. */
const MAX_PROMPT_CHARS = 600_000;

const mmss = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

export function anchorKind(c: ExtractedContent): "time" | "page" | null {
  const a = c.segments.find((s) => s.anchor)?.anchor;
  return a ? a.kind : null;
}

/** Content as the model sees it, with [mm:ss] / [p. N] markers it can cite. */
export function renderForPrompt(c: ExtractedContent): string {
  let lastPage = 0;
  const out: string[] = [];
  for (const s of c.segments) {
    if (s.anchor?.kind === "time") out.push(`[${mmss(s.anchor.at)}]${s.speaker ? ` ${s.speaker}:` : ""} ${s.text}`);
    else if (s.anchor?.kind === "page") {
      if (s.anchor.page !== lastPage) out.push(`\n[p. ${s.anchor.page}]`);
      lastPage = s.anchor.page;
      out.push(s.heading ? `${s.heading}\n${s.text}` : s.text);
    } else out.push(s.text);
  }
  const text = out.join("\n");
  return text.length > MAX_PROMPT_CHARS ? `${text.slice(0, MAX_PROMPT_CHARS)}\n\n[Content truncated]` : text;
}

/** Split plain text into paragraph segments. */
export function paragraphs(text: string, idPrefix = "s"): ContentSegment[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .map((p, i) => ({ id: `${idPrefix}${i + 1}`, text: p }));
}
