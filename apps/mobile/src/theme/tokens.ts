/**
 * Mobile theme: re-exports the shared design tokens (packages/ui-tokens) and adds
 * the native-only bits (font family names per weight, letter-spacing helper).
 *
 * Colours used via NativeWind classes (`bg-paper`, `text-ink`, `bg-nt-meeting`) come from
 * tailwind.config.ts, which is generated from the same tokens.
 */
import { gradients, motion, noteTypeColor, palette, radius, spacing, type } from "@a2n/ui-tokens";

export { gradients, motion, noteTypeColor, palette, radius, spacing, type };
export type { NoteTypeKey } from "@a2n/ui-tokens";

/** Font family names registered by `useFonts` in the root layout. */
export const fontFamily = {
  sans: "DMSans_400Regular",
  sansMedium: "DMSans_500Medium",
  sansSemibold: "DMSans_600SemiBold",
  serif: "InstrumentSerif_400Regular",
  serifItalic: "InstrumentSerif_400Regular_Italic",
  mono: "JetBrainsMono_400Regular",
  monoMedium: "JetBrainsMono_500Medium",
} as const;

/** Tokens express tracking in em; React Native wants absolute points. */
export const tracking = (size: number, em: number): number => Math.round(size * em * 100) / 100;

/** Hex colour → rgba() with the given alpha. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Spring used for indicators, flips and presses (mirrors `motion.easeSpring`). */
export const spring = { damping: 18, stiffness: 220, mass: 0.9 } as const;
