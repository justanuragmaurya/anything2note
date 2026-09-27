import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image, type ImageSource } from "expo-image";
import { alpha, fontFamily, palette } from "@/theme";

/**
 * Registry of AI artwork used in the app (prompts live in docs/image-prompts.md, same ids).
 * To swap a placeholder for the real image: drop `assets/art/<id>.png` in, then add
 * `"<id>": require("@/assets/art/<id>.png")` to `READY` below.
 */
export type ArtId = "empty-library" | "empty-review" | "empty-actions" | "onboarding-1" | "onboarding-2" | "onboarding-3";

export const ART: Record<ArtId, { label: string; aspect: number; tint: string }> = {
  "empty-library": { label: "Empty library illustration", aspect: 1.4, tint: palette.lecture },
  "empty-review": { label: "All caught up illustration", aspect: 1.4, tint: palette.podcast },
  "empty-actions": { label: "No action items illustration", aspect: 1.4, tint: palette.meeting },
  "onboarding-1": { label: "Cassette, PDF and polaroid falling into a notebook", aspect: 1, tint: palette.meeting },
  "onboarding-2": { label: "Seven colour-coded note cards fanned out", aspect: 1, tint: palette.lecture },
  "onboarding-3": { label: "Flashcard flipping over a red notebook", aspect: 1, tint: palette.interview },
};

/** Real images, once they exist. Keys present here render instead of the placeholder. */
export const READY: Partial<Record<ArtId, ImageSource | number>> = {};

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
