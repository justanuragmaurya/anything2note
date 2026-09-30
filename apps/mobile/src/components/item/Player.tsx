import { useEffect, useImperativeHandle, useRef, useState, type ComponentType, type Ref } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useEvent, useEventListener } from "expo";
import type { AudioPlayer, AudioStatus } from "expo-audio";
import { VideoView, useVideoPlayer, type VideoPlayer } from "expo-video";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import YoutubeIframeBase, { PLAYER_STATES, type YoutubeIframeProps, type YoutubeIframeRef } from "react-native-youtube-iframe";
import { NightDots } from "@/components/note-type/NoteTypeShape";
import { Button, Eyebrow, Icon, Mono, PressableScale } from "@/components/ui";
import { fmtTime } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { palette, spring } from "@/theme";

const HEIGHT = 112;

// The package types its component as React.VFC, which React 19's types dropped (it would be `any`).
const YoutubeIframe = YoutubeIframeBase as unknown as ComponentType<YoutubeIframeProps>;

type Props = {
  player: AudioPlayer;
  status: AudioStatus;
  /** From the API, shown until the stream reports its own duration. */
  durationHint?: number;
  label: string;
};

/** The item's own recording or upload, streamed: night panel, dotted grid, tap-to-seek track, cream play button. */
export function Player({ player, status, durationHint, label }: Props) {
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
          {label}
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

/** What the item screen drives on the embedded video: anchors and ?t= deep links play from a moment. */
export type VideoHandle = { playFrom: (seconds: number) => void };

type VideoProps = {
  videoId: string;
  /** The watch page, for "Open on YouTube". */
  url?: string;
  /** Channel name. */
  label: string;
  ref?: Ref<VideoHandle>;
  onReady: () => void;
  /** The playhead in seconds, so the transcript can follow the video. */
  onTime: (seconds: number) => void;
};

function readPlayhead(frame: YoutubeIframeRef | null, onTime: (seconds: number) => void) {
  try {
    void frame?.getCurrentTime().then(onTime);
  } catch {
    // The web view is gone (screen closing); nothing to follow.
  }
}

/** A YouTube source, embedded 16:9 at screen width where the audio player would sit. */
export function YouTubePlayer({ videoId, url, label, ref, onReady, onTime }: VideoProps) {
  const { width } = useWindowDimensions();
  const height = Math.round((width * 9) / 16);
  const frame = useRef<YoutubeIframeRef>(null);
  const [playing, setPlaying] = useState(false);
  // A seek asked for before the iframe is ready is applied once it is.
  const ready = useRef(false);
  const pending = useRef<number | null>(null);

  const readTime = () => readPlayhead(frame.current, onTime);

  useImperativeHandle(ref, () => ({
    playFrom: (s) => {
      if (ready.current) frame.current?.seekTo(s, true);
      else pending.current = s;
      onTime(s);
      setPlaying(true);
    },
  }));

  // The iframe API has no time events, so the playhead is polled while the video plays.
  useEffect(() => {
    if (!playing) return;
    const tick = setInterval(() => readPlayhead(frame.current, onTime), 500);
    return () => clearInterval(tick);
  }, [playing, onTime]);

  const open = () => {
    if (!url) return;
    setPlaying(false);
    // Hands off to the YouTube app when it's installed.
    void Linking.openURL(url);
  };

  return (
    <View>
      <View style={{ width, height, backgroundColor: "#000" }}>
        <YoutubeIframe
          ref={frame}
          videoId={videoId}
          width={width}
          height={height}
          play={playing}
          onReady={() => {
            ready.current = true;
            if (pending.current !== null) frame.current?.seekTo(pending.current, true);
            pending.current = null;
            onReady();
          }}
          onChangeState={(state) => {
            // Mirror the video's own controls so `play` and the polling stay in step with it.
            if (state === PLAYER_STATES.PLAYING) setPlaying(true);
            else if (state === PLAYER_STATES.PAUSED || state === PLAYER_STATES.ENDED) {
              setPlaying(false);
              readTime();
            }
          }}
          initialPlayerParams={{ rel: false }}
          // Android can crash when a web view animates with its screen; a hair under 1 avoids it.
          webViewStyle={{ opacity: 0.99 }}
        />
      </View>
      <View style={styles.videoMeta}>
        <Eyebrow color={palette.nightMuted} numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Eyebrow>
        {url ? (
          <Button size="sm" variant="night" icon="arrowUpRight" onPress={open}>
            Open on YouTube
          </Button>
        ) : null}
      </View>
    </View>
  );
}

type FileVideoProps = {
  /** The signed URL of the user's own video upload. */
  uri: string;
  label: string;
  ref?: Ref<VideoHandle>;
  onReady: () => void;
  /** The playhead in seconds, so the transcript can follow the video. */
  onTime: (seconds: number) => void;
};

/** Setting `currentTime` is how expo-video seeks (outside the component, where the player isn't hook state). */
function playVideoFrom(player: VideoPlayer, seconds: number) {
  player.currentTime = seconds;
  player.play();
}

/**
 * A video upload, with its picture, 16:9 at screen width like the YouTube embed. Driven the same
 * way (anchors and ?t= links call `playFrom`), with the system's own playback controls.
 */
export function FileVideoPlayer({ uri, label, ref, onReady, onTime }: FileVideoProps) {
  const { width } = useWindowDimensions();
  const height = Math.round((width * 9) / 16);
  const player = useVideoPlayer(uri, (p) => {
    p.timeUpdateEventInterval = 0.25;
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });
  useEventListener(player, "timeUpdate", ({ currentTime }) => onTime(currentTime));
  // A seek asked for before the video has loaded is applied once it has.
  const pending = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "readyToPlay") return;
    if (pending.current !== null) {
      playVideoFrom(player, pending.current);
      pending.current = null;
    }
    onReady();
  }, [status, player, onReady]);

  useImperativeHandle(ref, () => ({
    playFrom: (s) => {
      if (player.status === "readyToPlay") playVideoFrom(player, s);
      else pending.current = s;
      onTime(s);
    },
  }));

  return (
    <View>
      <View style={{ width, height, backgroundColor: "#000" }}>
        <VideoView player={player} style={{ width, height }} contentFit="contain" nativeControls allowsPictureInPicture={false} />
        {status === "loading" || status === "idle" ? (
          <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]} pointerEvents="none">
            <ActivityIndicator color={palette.cream} />
          </View>
        ) : null}
      </View>
      <View style={styles.videoMeta}>
        <Eyebrow color={status === "error" ? palette.red300 : palette.nightMuted} numberOfLines={1} style={{ flex: 1 }}>
          {status === "error" ? "This video couldn't be played" : label}
        </Eyebrow>
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
  videoMeta: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 10 },
});
