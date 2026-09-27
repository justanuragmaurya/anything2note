import { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { palette, spring } from "@/theme";

type Props = { value: number; color?: string; track?: string; height?: number; style?: StyleProp<ViewStyle> };

/** Thin rounded bar; `value` 0..1 springs in. */
export function ProgressBar({ value, color = palette.red500, track = palette.panel, height = 6, style }: Props) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withSpring(Math.min(1, Math.max(0, value)), spring));
  }, [v, value]);
  const fill = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: track, overflow: "hidden" }, style]}>
      <Animated.View style={[{ height: "100%", borderRadius: height / 2, backgroundColor: color }, fill]} />
    </View>
  );
}
