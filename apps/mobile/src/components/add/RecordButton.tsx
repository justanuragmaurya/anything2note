import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { Icon, PressableScale } from "@/components/ui";
import { gradients, palette, spring } from "@/theme";

type Props = { state: "idle" | "recording" | "paused"; onPress: () => void; size?: number };

function Ring({ delay, active, size }: { delay: number; active: boolean; size: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      cancelAnimation(t);
      t.set(withTiming(0, { duration: 200 }));
      return;
    }
    const id = setTimeout(() => {
      t.set(0);
      t.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false));
    }, delay);
    return () => clearTimeout(id);
  }, [active, delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: active ? 0.55 * (1 - t.value) : 0,
    transform: [{ scale: 1 + t.value * 0.55 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, style]} />;
}

/** The hero: big red circular record button with a pulsing ring (`.rec-pulse`). */
export function RecordButton({ state, onPress, size = 120 }: Props) {
  const recording = state === "recording";
  const inner = useSharedValue(1);
  useEffect(() => {
    inner.set(withSpring(state === "idle" ? 1 : 0, spring));
  }, [inner, state]);
  // Mic glyph (idle) morphs into a rounded stop square (recording/paused).
  const glyph = useAnimatedStyle(() => ({
    width: 30 + inner.value * 8,
    height: 30 + inner.value * 8,
    borderRadius: 8 + inner.value * 14,
    opacity: 1 - inner.value,
  }));
  const mic = useAnimatedStyle(() => ({ opacity: inner.value, transform: [{ scale: 0.6 + inner.value * 0.4 }] }));

  return (
    <View style={{ width: size * 1.35, height: size * 1.35, alignItems: "center", justifyContent: "center" }}>
      <Ring delay={0} active={recording} size={size} />
      <Ring delay={600} active={recording} size={size} />
      <Ring delay={1200} active={recording} size={size} />
      <View style={[styles.halo, { width: size + 24, height: size + 24, borderRadius: (size + 24) / 2 }]} />
      <PressableScale
        onPress={onPress}
        haptics="press"
        scaleTo={0.95}
        accessibilityRole="button"
        accessibilityLabel={state === "idle" ? "Start recording" : "Stop recording"}
        style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <LinearGradient colors={gradients.buttonRed} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.highlight, { borderRadius: size / 2 }]} />
        <Animated.View style={[styles.stop, glyph]} />
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, mic]}>
          <Icon name="mic" size={40} color={palette.cream} weight="semibold" />
        </Animated.View>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: "absolute", borderWidth: 2, borderColor: palette.red400, backgroundColor: "rgba(246,95,72,0.12)" },
  halo: { position: "absolute", backgroundColor: palette.red50, borderWidth: 1, borderColor: palette.red100 },
  button: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.red700,
    shadowColor: palette.red600,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  highlight: { borderTopWidth: 1.5, borderColor: "rgba(255,255,255,0.35)" },
  center: { alignItems: "center", justifyContent: "center" },
  stop: { backgroundColor: palette.cream },
});
