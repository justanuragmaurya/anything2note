import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { palette } from "@/theme";

type Props = { children?: ReactNode; tone?: "night" | "paper"; style?: StyleProp<ViewStyle> };

/** 1px frame with small squares on each corner (Cloudflare grid cells). */
export function CornerFrame({ children, tone = "night", style }: Props) {
  const line = tone === "night" ? palette.nightLine : palette.lineStrong;
  const sq = tone === "night" ? palette.nightMuted : palette.muted;
  const bg = tone === "night" ? palette.night : palette.paper;
  const corners: ViewStyle[] = [
    { top: -4, left: -4 },
    { top: -4, right: -4 },
    { bottom: -4, left: -4 },
    { bottom: -4, right: -4 },
  ];
  return (
    <View style={[{ borderWidth: 1, borderColor: line }, style]}>
      {children}
      {corners.map((c, i) => (
        <View key={i} pointerEvents="none" style={[styles.square, c, { borderColor: sq, backgroundColor: bg }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  square: { position: "absolute", width: 7, height: 7, borderWidth: 1 },
});
