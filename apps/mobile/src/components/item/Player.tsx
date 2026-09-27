import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { NightDots } from "@/components/note-type/NoteTypeShape";
import { Eyebrow, Icon, Mono, PressableScale } from "@/components/ui";
import { fmtTime, wave } from "@/lib/format";
import { palette, spring } from "@/theme";

const BARS = 56;

type Props = {
  duration: number;
  time: number;
  playing: boolean;
  onToggle: () => void;
  onSeek: (s: number) => void;
  seed?: number;
  label: string;
  isDocument?: boolean;
};

/** Mock source player: night panel, dotted grid, waveform (tap to seek), cream play button. */
export function Player({ duration, time, playing, onToggle, onSeek, seed = 0, label, isDocument }: Props) {
  const [w, setW] = useState(0);
  const progress = duration ? time / duration : 0;
  const knob = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(playing ? 1 : 0.92, spring) }] }));

  return (
    <View style={styles.panel} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? <NightDots width={w} height={188} /> : null}
      <View style={styles.top}>
        <Eyebrow color={palette.nightMuted} numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Eyebrow>
        <View style={[styles.live, playing && { backgroundColor: palette.red500 }]} />
      </View>

      {isDocument ? (
        <View style={styles.docWrap}>
          {[0.92, 0.8, 0.86, 0.6].map((f, i) => (
            <View key={i} style={[styles.docLine, { width: `${f * 100}%` }]} />
          ))}
        </View>
      ) : (
        <Pressable
          style={styles.wave}
          onPress={(e) => {
            if (w) onSeek(Math.round((e.nativeEvent.locationX / (w - 40)) * duration));
          }}
          accessibilityLabel="Seek"
        >
          {Array.from({ length: BARS }).map((_, i) => {
            const played = i / BARS <= progress;
            return <View key={i} style={[styles.bar, { height: `${18 + wave(i, seed) * 82}%`, backgroundColor: played ? palette.red400 : "rgba(243,230,225,0.2)" }]} />;
          })}
        </Pressable>
      )}

      <View style={styles.controls}>
        <PressableScale onPress={() => onSeek(Math.max(0, time - 10))} haptics="tap" hitSlop={8} accessibilityLabel="Back 10 seconds">
          <Icon name="retry" size={18} color={palette.nightMuted} />
        </PressableScale>
        <PressableScale onPress={onToggle} haptics="press" scaleTo={0.9} accessibilityLabel={playing ? "Pause" : "Play"}>
          <Animated.View style={[styles.play, knob]}>
            <Icon name={playing ? "pause" : "play"} size={20} color={palette.ink} weight="bold" />
          </Animated.View>
        </PressableScale>
        <Mono style={{ color: palette.nightMuted, fontSize: 11 }}>{fmtTime(time)}</Mono>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <Mono style={{ color: palette.nightMuted, fontSize: 11 }}>{fmtTime(duration)}</Mono>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    height: 188,
    marginHorizontal: 16,
    borderRadius: 22,
    backgroundColor: palette.night2,
    borderWidth: 1,
    borderColor: palette.nightLine,
    overflow: "hidden",
    padding: 16,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  top: { flexDirection: "row", alignItems: "center", gap: 10 },
  live: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.night3 },
  wave: { height: 64, flexDirection: "row", alignItems: "flex-end", gap: 2.5 },
  bar: { flex: 1, borderRadius: 2 },
  docWrap: { gap: 8, paddingVertical: 6 },
  docLine: { height: 8, borderRadius: 4, backgroundColor: "rgba(243,230,225,0.14)" },
  controls: { flexDirection: "row", alignItems: "center", gap: 12 },
  play: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.cream, alignItems: "center", justifyContent: "center" },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "rgba(243,230,225,0.15)", overflow: "hidden" },
  fill: { height: "100%", backgroundColor: palette.red400 },
});
