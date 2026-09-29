import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import type { AudioPlayer, AudioStatus } from "expo-audio";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { NightDots } from "@/components/note-type/NoteTypeShape";
import { Eyebrow, Icon, Mono, PressableScale } from "@/components/ui";
import { fmtTime } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { palette, spring } from "@/theme";

const HEIGHT = 112;

type Props = {
  player: AudioPlayer;
  status: AudioStatus;
  /** From the API, shown until the stream reports its own duration. */
  durationHint?: number;
  label: string;
  /** Video sources play their soundtrack here. */
  video?: boolean;
};

/** The item's own recording or upload, streamed: night panel, dotted grid, tap-to-seek track, cream play button. */
export function Player({ player, status, durationHint, label, video }: Props) {
  const [w, setW] = useState(0);
  const [trackW, setTrackW] = useState(0);
  const duration = status.duration || durationHint || 0;
  const time = status.currentTime;
  const progress = duration ? Math.min(1, time / duration) : 0;
  const playing = status.playing;
  const knob = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(playing ? 1 : 0.92, spring) }] }));

  const seek = (s: number) => {
    haptic.select();
    void player.seekTo(Math.min(Math.max(0, s), duration || s));
  };
  const toggle = () => {
    if (playing) return player.pause();
    // Replay from the start once it has finished.
    if (duration && time >= duration - 0.5) void player.seekTo(0);
    player.play();
  };

  return (
    <View style={styles.panel} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? <NightDots width={w} height={HEIGHT} /> : null}
      <View style={styles.top}>
        <Eyebrow color={palette.nightMuted} numberOfLines={1} style={{ flex: 1 }}>
          {video ? `${label} · audio` : label}
        </Eyebrow>
        <View style={[styles.live, playing && { backgroundColor: palette.red500 }]} />
      </View>

      <View style={styles.controls}>
        <PressableScale onPress={() => seek(time - 10)} haptics="tap" hitSlop={8} accessibilityLabel="Back 10 seconds">
          <Icon name="retry" size={18} color={palette.nightMuted} />
        </PressableScale>
        <PressableScale onPress={toggle} disabled={!status.isLoaded} haptics="press" scaleTo={0.9} accessibilityLabel={playing ? "Pause" : "Play"}>
          <Animated.View style={[styles.play, knob]}>
            {!status.isLoaded || status.isBuffering ? (
              <ActivityIndicator size="small" color={palette.ink} />
            ) : (
              <Icon name={playing ? "pause" : "play"} size={17} color={palette.ink} weight="bold" />
            )}
          </Animated.View>
        </PressableScale>
        <Mono style={{ color: palette.nightMuted, fontSize: 11 }}>{fmtTime(time)}</Mono>
        <Pressable
          style={styles.hit}
          onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
          onPress={(e) => {
            if (trackW && duration) seek((e.nativeEvent.locationX / trackW) * duration);
          }}
          accessibilityRole="adjustable"
          accessibilityLabel="Seek"
        >
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
        </Pressable>
        <Mono style={{ color: palette.nightMuted, fontSize: 11 }}>{duration ? fmtTime(duration) : "–:––"}</Mono>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    height: HEIGHT,
    marginHorizontal: 16,
    borderRadius: 22,
    backgroundColor: palette.night2,
    borderWidth: 1,
    borderColor: palette.nightLine,
    overflow: "hidden",
    paddingVertical: 14,
    paddingHorizontal: 18,
    justifyContent: "space-between",
  },
  top: { flexDirection: "row", alignItems: "center", gap: 10 },
  live: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.night3 },
  controls: { flexDirection: "row", alignItems: "center", gap: 12 },
  play: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.cream, alignItems: "center", justifyContent: "center" },
  hit: { flex: 1, height: 28, justifyContent: "center" },
  track: { height: 4, borderRadius: 2, backgroundColor: "rgba(243,230,225,0.15)", overflow: "hidden" },
  fill: { height: "100%", backgroundColor: palette.red400 },
});
