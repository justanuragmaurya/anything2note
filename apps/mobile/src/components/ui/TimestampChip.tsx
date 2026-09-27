import { createContext, useContext } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fmtTime } from "@/lib/format";
import { fontFamily, palette } from "@/theme";
import { Icon } from "./Icon";
import { PressableScale } from "./PressableScale";

/** Provided by the item screen so any chip can seek the pinned player. */
export const SeekContext = createContext<((seconds: number) => void) | null>(null);

type Props = { at: number; onSeek?: (s: number) => void; tone?: "paper" | "night" };

/** Red mono timestamp with a play glyph; tapping seeks the player. */
export function TimestampChip({ at, onSeek, tone = "paper" }: Props) {
  const ctxSeek = useContext(SeekContext);
  const seek = onSeek ?? ctxSeek;
  const night = tone === "night";
  return (
    <PressableScale
      haptics="select"
      scaleTo={0.92}
      disabled={!seek}
      onPress={() => seek?.(at)}
      accessibilityRole="button"
      accessibilityLabel={`Play from ${fmtTime(at)}`}
      hitSlop={8}
      style={{ opacity: 1 }}
    >
      <View style={[styles.chip, night && styles.night]}>
        <Icon name="play" size={8} color={night ? palette.red300 : palette.red700} weight="bold" />
        <Text style={[styles.text, night && { color: palette.red200 }]}>{fmtTime(at)}</Text>
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
