import { useEffect } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { palette } from "@/theme";

/** Blinking red caret (`.caret`). */
export function Caret({ height = 16 }: { height?: number }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.set(withRepeat(withSequence(withTiming(0, { duration: 450 }), withTiming(1, { duration: 450 })), -1));
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 2, height, borderRadius: 1, backgroundColor: palette.red500 }, style]} />;
}
