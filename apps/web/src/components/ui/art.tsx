import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { ART, artSrc, type ArtId } from "@/lib/art";

type Props = {
  id: ArtId;
  className?: string;
  /** Tint for the placeholder background, e.g. "var(--nt-lecture)" */
  tint?: string;
  priority?: boolean;
  sizes?: string;
  /** Hide the label, e.g. for tiny floating placeholders */
  bare?: boolean;
};

/**
 * Renders the AI artwork for `id` once it's marked ready in lib/art.ts;
 * until then, a tinted placeholder that names the prompt id to generate.
 */
export function Art({ id, className = "", tint, priority, sizes = "50vw", bare }: Props) {
  const entry = ART[id];

  if (entry.ready) {
    return (
      <div className={`relative ${className}`} style={{ aspectRatio: entry.aspect }}>
        <Image src={artSrc(id)} alt={entry.label} fill priority={priority} sizes={sizes} className="object-contain" />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${entry.label} (placeholder)`}
      className={`img-placeholder flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 text-center ${className}`}
      style={{ aspectRatio: entry.aspect, ["--ph-tint" as string]: tint }}
    >
      <ImageIcon className="size-4 text-red-600/60" strokeWidth={1.5} />
      {!bare && (
        <>
          <span className="font-mono text-[10px] tracking-wide text-red-700/70">{id}</span>
          <span className="max-w-[16ch] text-[11px] leading-tight text-ink-soft/70">{entry.label}</span>
        </>
      )}
    </div>
  );
}
