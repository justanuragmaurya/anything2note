/**
 * Registry of AI-generated artwork used across the site and app.
 *
 * Every entry has a matching prompt in `docs/image-prompts.md` (same id).
 * To swap a placeholder for the real image:
 *   1. Save the file as `apps/web/public/art/<id>.png` (transparent PNG unless noted)
 *   2. Set `ready: true` below.
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
  "hero-cassette": { label: "Cassette tape cut-out", aspect: 1.35, ready: false },
  "hero-pdf": { label: "Curled PDF pages", aspect: 0.8, ready: false },
  "hero-tv": { label: "Retro TV with play button", aspect: 1.1, ready: false },
  "hero-polaroid": { label: "Polaroid of a whiteboard", aspect: 0.85, ready: false },
  "hero-mic": { label: "Vintage microphone", aspect: 0.7, ready: false },
  "hero-slides": { label: "Fanned slide deck", aspect: 1.3, ready: false },
  "hero-notebook": { label: "Open red notebook, notes spilling out", aspect: 1.5, ready: false },
  "flow-notebook-hand": { label: "Hand holding open notebook", aspect: 1.1, ready: false },
  "feature-study": { label: "Pixel art: student with flashcards", aspect: 1.2, ready: false },
  "feature-meeting": { label: "Pixel art: meeting table", aspect: 1.2, ready: false },
  "feature-assistant": { label: "Pixel art: chatting with notes", aspect: 1.2, ready: false },
  "persona-student": { label: "Polaroid: student", aspect: 1, ready: false, ext: "jpg" },
  "persona-teamlead": { label: "Polaroid: team lead", aspect: 1, ready: false, ext: "jpg" },
  "persona-researcher": { label: "Polaroid: researcher", aspect: 1, ready: false, ext: "jpg" },
  "empty-library": { label: "Empty library illustration", aspect: 1.4, ready: false },
  "empty-review": { label: "All caught up illustration", aspect: 1.4, ready: false },
  "empty-actions": { label: "No action items illustration", aspect: 1.4, ready: false },
  "og-default": { label: "Social share image", aspect: 1.905, ready: false, ext: "jpg" },
};

export function artSrc(id: ArtId): string {
  return `/art/${id}.${ART[id].ext ?? "png"}`;
}
