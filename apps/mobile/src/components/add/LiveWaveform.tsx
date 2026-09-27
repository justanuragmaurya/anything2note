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

/** Live input level bars. Mock levels until expo-audio metering is wired in. */
export function LiveWaveform({ active, height = 56 }: { active: boolean; height?: number }) {
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: BARS }, () => 0.1));
  useEffect(() => {
    if (!active) return;
    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      setLevels((prev) => {
        const next = prev.slice(1);
        const speech = Math.abs(Math.sin(tick * 0.35)) * 0.6 + Math.random() * 0.4;
        next.push(Math.min(1, speech));
        return next;
      });
    }, 110);
    return () => clearInterval(id);
  }, [active]);
  return (
    <View style={{ height, flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "stretch" }}>
      {levels.map((l, i) => (
        <Bar key={i} level={l} active={active} />
      ))}
    </View>
  );
}
