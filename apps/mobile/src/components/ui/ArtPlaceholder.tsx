import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image, type ImageSource } from "expo-image";
import { alpha, fontFamily, palette } from "@/theme";

/**
 * Registry of AI artwork used in the app (prompts live in docs/image-prompts.md, same ids).
 * To swap a placeholder for the real image: drop `assets/art/<id>.webp` in, add
 * `"<id>": require("@/assets/art/<id>.webp")` to `READY`, and set its `aspect` below.
 */
export type ArtId = "empty-library" | "empty-review" | "empty-actions" | "onboarding-1" | "onboarding-2" | "onboarding-3";

export const ART: Record<ArtId, { label: string; aspect: number; tint: string }> = {
  "empty-library": { label: "Empty box with a blank page floating above it", aspect: 0.924, tint: palette.lecture },
  "empty-review": { label: "Stretching next to a finished stack of flashcards", aspect: 1.282, tint: palette.podcast },
  "empty-actions": { label: "Clipboard with every box ticked", aspect: 1.439, tint: palette.meeting },
  "onboarding-1": { label: "A video, cassette, page and photo pulled into a phone", aspect: 1.51, tint: palette.meeting },
  "onboarding-2": { label: "A recording turning into neat lines of notes", aspect: 1.848, tint: palette.lecture },
  "onboarding-3": { label: "Flipping a flashcard beside a streak calendar", aspect: 1.284, tint: palette.interview },
};

/** Real images, once they exist. Keys present here render instead of the placeholder. */
export const READY: Partial<Record<ArtId, ImageSource | number>> = {
  "empty-library": require("@/assets/art/empty-library.webp"),
  "empty-review": require("@/assets/art/empty-review.webp"),
  "empty-actions": require("@/assets/art/empty-actions.webp"),
  "onboarding-1": require("@/assets/art/onboarding-1.webp"),
  "onboarding-2": require("@/assets/art/onboarding-2.webp"),
  "onboarding-3": require("@/assets/art/onboarding-3.webp"),
};

type Props = { id: ArtId; style?: StyleProp<ViewStyle>; width?: number };

export function ArtPlaceholder({ id, style, width }: Props) {
  const art = ART[id];
  const src = READY[id];
  const size = width ? { width, aspectRatio: art.aspect } : { width: "100%" as const, aspectRatio: art.aspect };
  if (src !== undefined) {
    return (
      <View style={[size, style]}>
        <Image source={src} contentFit="contain" style={{ width: "100%", height: "100%" }} accessibilityLabel={art.label} transition={300} />
      </View>
    );
  }
  return (
    <View style={[styles.tile, size, { backgroundColor: alpha(art.tint, 0.35), borderColor: alpha(palette.ink, 0.22) }, style]} accessibilityLabel={art.label}>
      <Text style={styles.id}>{id}</Text>
      <Text style={styles.label}>{art.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 6,
  },
  id: { fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: palette.inkSoft },
  label: { fontFamily: fontFamily.serifItalic, fontSize: 17, color: palette.muted, textAlign: "center" },
});
