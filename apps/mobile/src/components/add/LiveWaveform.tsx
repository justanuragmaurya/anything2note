import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { palette } from "@/theme";

const BARS = 36;

function Bar({ level, active }: { level: number; active: boolean }) {
  const h = useSharedValue(0.1);
  useEffect(() => {
    h.set(withTiming(active ? level : 0.08, { duration: 140 }));
  }, [active, h, level]);
  const style = useAnimatedStyle(() => ({ height: `${Math.max(8, h.value * 100)}%` }));
  return <Animated.View style={[{ flex: 1, borderRadius: 2, backgroundColor: active ? palette.red500 : palette.lineStrong }, style]} />;
}

/**
 * Scrolling history of the microphone's input level (0..1, from the recorder's metering).
 * A new bar is pushed per reading (`at` is the reading's recording time); bars hold still while paused.
 */
export function LiveWaveform({ active, level, at, height = 56 }: { active: boolean; level: number; at: number; height?: number }) {
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: BARS }, () => 0.1));
  const [lastAt, setLastAt] = useState(at);
  // One bar per reading: `at` moves with every recorder status poll.
  if (active && at !== lastAt) {
    setLastAt(at);
    setLevels((prev) => [...prev.slice(1), level]);
  }
  return (
    <View style={{ height, flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "stretch" }}>
      {levels.map((l, i) => (
        <Bar key={i} level={l} active={active} />
      ))}
    </View>
  );
}
