import { createContext, useContext } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Anchor } from "@a2n/shared";
import { fmtAnchor } from "@/lib/format";
import { fontFamily, palette } from "@/theme";
import { Icon } from "./Icon";
import { PressableScale } from "./PressableScale";

/**
 * Provided by the item screen: a time anchor seeks the player, a page anchor jumps to that page.
 * Returns null when the item can't jump to that kind of anchor, so chips render but stay inert.
 */
export const AnchorContext = createContext<((a: Anchor) => void) | null>(null);

type Props = { anchor: Anchor; onPress?: (a: Anchor) => void; tone?: "paper" | "night" };

/** Red mono chip ("2:12" with a play glyph, or "p. 3"); tapping jumps to that spot in the source. */
export function AnchorChip({ anchor, onPress, tone = "paper" }: Props) {
  const ctx = useContext(AnchorContext);
  const go = onPress ?? ctx;
  const night = tone === "night";
  const time = anchor.kind === "time";
  return (
    <PressableScale
      haptics="select"
      scaleTo={0.92}
      disabled={!go}
      onPress={() => go?.(anchor)}
      accessibilityRole="button"
      accessibilityLabel={time ? `Play from ${fmtAnchor(anchor)}` : `Go to page ${anchor.page}`}
      hitSlop={8}
      style={{ opacity: 1 }}
    >
      <View style={[styles.chip, night && styles.night]}>
        <Icon name={time ? "play" : "pdf"} size={time ? 8 : 9} color={night ? palette.red300 : palette.red700} weight="bold" />
        <Text style={[styles.text, night && { color: palette.red200 }]}>{fmtAnchor(anchor)}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.red200,
    backgroundColor: palette.red50,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  night: { borderColor: "rgba(255,138,118,0.35)", backgroundColor: "rgba(229,55,43,0.12)" },
  text: { fontFamily: fontFamily.mono, fontSize: 10.5, color: palette.red700 },
});
