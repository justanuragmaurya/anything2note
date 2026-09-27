/**
 * Registry of AI-generated artwork used across the site and app.
 *
 * Every entry has a matching prompt in `docs/image-prompts.md` (same id).
 * To swap a placeholder for the real image:
 *   1. Save the file as `apps/web/public/art/<id>.<ext>` (transparent WebP for cut-outs)
 *   2. Set `ready: true`, plus its `ext` and the trimmed image's `aspect`, below.
 */

export type ArtId =
  | "hero-cassette"
  | "hero-pdf"
  | "hero-tv"
  | "hero-polaroid"
  | "hero-mic"
  | "hero-slides"
  | "hero-notebook"
  | "flow-notebook-hand"
  | "feature-study"
  | "feature-meeting"
  | "feature-assistant"
  | "persona-student"
  | "persona-teamlead"
  | "persona-researcher"
  | "empty-library"
  | "empty-review"
  | "empty-actions"
  | "og-default";

type ArtEntry = {
  label: string;
  /** width / height */
  aspect: number;
  ready: boolean;
  ext?: "png" | "jpg" | "webp";
};

export const ART: Record<ArtId, ArtEntry> = {
  "hero-cassette": { label: "Cassette tape cut-out", aspect: 1.605, ready: true, ext: "webp" },
  "hero-pdf": { label: "Curled PDF pages", aspect: 0.859, ready: true, ext: "webp" },
  "hero-tv": { label: "Retro TV with play button", aspect: 0.968, ready: true, ext: "webp" },
  "hero-polaroid": { label: "Polaroid of a whiteboard", aspect: 0.786, ready: true, ext: "webp" },
  "hero-mic": { label: "Vintage microphone", aspect: 0.502, ready: true, ext: "webp" },
  "hero-slides": { label: "Fanned slide deck", aspect: 1.727, ready: true, ext: "webp" },
  "hero-notebook": { label: "Open red notebook, notes spilling out", aspect: 1.485, ready: true, ext: "webp" },
  "flow-notebook-hand": { label: "Hand holding open notebook", aspect: 1.1, ready: false },
  "feature-study": { label: "Pixel art: student with flashcards", aspect: 1.016, ready: true, ext: "webp" },
  "feature-meeting": { label: "Pixel art: meeting table", aspect: 1.154, ready: true, ext: "webp" },
  "feature-assistant": { label: "Pixel art: chatting with notes", aspect: 1.694, ready: true, ext: "webp" },
  "persona-student": { label: "Polaroid: student", aspect: 1, ready: true, ext: "webp" },
  "persona-teamlead": { label: "Polaroid: team lead", aspect: 1, ready: true, ext: "webp" },
  "persona-researcher": { label: "Polaroid: researcher", aspect: 1, ready: true, ext: "webp" },
  "empty-library": { label: "Empty library illustration", aspect: 0.924, ready: true, ext: "webp" },
  "empty-review": { label: "All caught up illustration", aspect: 1.282, ready: true, ext: "webp" },
  "empty-actions": { label: "No action items illustration", aspect: 1.439, ready: true, ext: "webp" },
  "og-default": { label: "Social share image", aspect: 1.905, ready: true, ext: "jpg" },
};

export function artSrc(id: ArtId): string {
  return `/art/${id}.${ART[id].ext ?? "png"}`;
}
