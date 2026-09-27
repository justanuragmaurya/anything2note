import { useEffect, useState } from "react";
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { palette } from "@/theme";

type Props = { width?: DimensionValue; height?: number; radius?: number; style?: StyleProp<ViewStyle>; tone?: "paper" | "red" };

/** `.skeleton` shimmer: a soft highlight sweeping across a panel-coloured block. */
export function Skeleton({ width = "100%", height = 14, radius = 8, style, tone = "paper" }: Props) {
  const t = useSharedValue(0);
  const [w, setW] = useState(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, false));
  }, [t]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: (t.value * 2 - 1) * w }] }));
  const base = tone === "red" ? palette.red100 : palette.panel;
  const hi = tone === "red" ? "rgba(255,255,255,0.7)" : "rgba(252,249,244,0.9)";
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ width, height, borderRadius: radius, backgroundColor: base, overflow: "hidden" }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, sweep]}>
        <LinearGradient colors={["transparent", hi, "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}
