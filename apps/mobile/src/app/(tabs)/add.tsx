import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { LiveWaveform } from "@/components/add/LiveWaveform";
import { RecordButton } from "@/components/add/RecordButton";
import { SourceTile } from "@/components/add/SourceTile";
import { Body, Button, Display, Eyebrow, Icon, PressableScale, Rise, Screen, SerifAccent, Small } from "@/components/ui";
import { fmtTime } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import type { SourceKind } from "@/lib/mock/types";
import { fontFamily, palette } from "@/theme";

type RecState = "idle" | "recording" | "paused";
type Paste = "link" | "text" | null;

function startFlow(source: SourceKind, label: string) {
  router.push({ pathname: "/new/type", params: { source, label } });
}

export default function Add() {
  const [rec, setRec] = useState<RecState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [consent, setConsent] = useState(true);
  const [paste, setPaste] = useState<Paste>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (rec !== "recording") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [rec]);

  const toggleMain = () => {
    if (rec === "idle") {
      haptic.heavy();
      setSeconds(0);
      setRec("recording");
      return;
    }
    stop();
  };
  const stop = () => {
    haptic.success();
    const len = seconds;
    setRec("idle");
    setSeconds(0);
    startFlow("recording", `Recording · ${fmtTime(Math.max(len, 1))}`);
  };

  const submitPaste = () => {
    const v = value.trim();
    if (!v) return haptic.warn();
    setPaste(null);
    setValue("");
    if (paste === "link") startFlow(v.includes("youtu") ? "youtube" : "link", v.replace(/^https?:\/\//, "").slice(0, 40));
    else startFlow("text", `Pasted text · ${v.split(/\s+/).length} words`);
  };

  const live = rec !== "idle";

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Rise className="px-5 pt-4">
          <Eyebrow>New item</Eyebrow>
          <Display size={40} style={{ marginTop: 6 }}>
            Add <SerifAccent size={46}>anything</SerifAccent>
          </Display>
        </Rise>

        {consent ? (
          <Animated.View entering={FadeInDown.delay(80)} exiting={FadeOut.duration(180)} layout={LinearTransition} style={styles.consent}>
            <Icon name="shield" size={18} color={palette.red600} />
            <Small style={{ flex: 1, color: palette.inkSoft }}>
              Recording other people? Tell them first. Some places require everyone&apos;s consent.
            </Small>
            <PressableScale onPress={() => setConsent(false)} hitSlop={10} accessibilityLabel="Dismiss">
              <Icon name="close" size={14} color={palette.muted} />
            </PressableScale>
          </Animated.View>
        ) : null}

        <Animated.View layout={LinearTransition.springify().damping(18)} style={styles.recorder}>
          <RecordButton state={rec} onPress={toggleMain} />
          <Animated.Text key={live ? "t" : "i"} entering={FadeIn} style={[styles.timer, live && { color: palette.ink }]}>
            {live ? fmtTime(seconds) : "Tap to record"}
          </Animated.Text>
          <View style={{ alignSelf: "stretch", paddingHorizontal: 28, marginTop: 14 }}>
            <LiveWaveform active={rec === "recording"} />
          </View>
          {live ? (
            <Animated.View entering={FadeInDown.springify().damping(16)} exiting={FadeOut.duration(150)} style={styles.controls}>
              <Button
                variant="ghost"
                leadingIcon={rec === "paused" ? "mic" : "pause"}
                onPress={() => {
                  haptic.tap();
                  setRec(rec === "paused" ? "recording" : "paused");
                }}
              >
                {rec === "paused" ? "Resume" : "Pause"}
              </Button>
              <Button variant="ink" leadingIcon="stop" onPress={stop}>
                Stop & make notes
              </Button>
            </Animated.View>
          ) : (
            <Small style={{ marginTop: 14, textAlign: "center" }}>Keeps recording with the screen locked · up to 60 min on Free</Small>
          )}
          {rec === "paused" ? (
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              <Eyebrow color={palette.red600} style={{ marginTop: 10 }}>
                Paused
              </Eyebrow>
            </Animated.View>
          ) : null}
        </Animated.View>

        <Rise delay={140} className="px-5 pt-2">
          <Eyebrow style={{ marginBottom: 12 }}>Or bring something in</Eyebrow>
          <View style={styles.grid}>
            <View style={styles.row}>
              <SourceTile icon="upload" title="Upload file" hint="Audio, video, PDF, slides" tint={palette.tutorial} onPress={() => startFlow("upload", "lecture-week-3.mp4")} />
              <SourceTile icon="camera" title="Photo" hint="Whiteboards, handouts, pages" tint={palette.lecture} onPress={() => startFlow("photo", "IMG_2107.heic")} />
            </View>
            <View style={styles.row}>
              <SourceTile icon="link" title="Paste link" hint="YouTube, podcasts, articles" tint={palette.meeting} onPress={() => setPaste(paste === "link" ? null : "link")} />
              <SourceTile icon="paste" title="Paste text" hint="Notes, emails, transcripts" tint={palette.podcast} onPress={() => setPaste(paste === "text" ? null : "text")} />
            </View>
          </View>

          {paste ? (
            <Animated.View key={paste} entering={FadeInDown.springify().damping(18)} exiting={FadeOut.duration(150)} style={styles.pasteCard}>
              <Eyebrow>{paste === "link" ? "Paste a link" : "Paste text"}</Eyebrow>
              <TextInput
                autoFocus
                value={value}
                onChangeText={setValue}
                placeholder={paste === "link" ? "https://youtube.com/watch?v=…" : "Paste or type anything…"}
                placeholderTextColor={palette.muted}
                multiline={paste === "text"}
                autoCapitalize={paste === "link" ? "none" : "sentences"}
                keyboardType={paste === "link" ? "url" : "default"}
                style={[styles.pasteInput, paste === "text" && { minHeight: 110, textAlignVertical: "top" }]}
              />
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                <Button variant="ghost" size="sm" onPress={() => setPaste(null)}>
                  Cancel
                </Button>
                <Button size="sm" icon="arrowRight" onPress={submitPaste}>
                  Continue
                </Button>
              </View>
            </Animated.View>
          ) : null}

          <Body style={{ marginTop: 18, fontSize: 13, textAlign: "center", color: palette.muted }}>
            Tip: share a link or file to anything2note from any app.
          </Body>
        </Rise>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  consent: {
    marginHorizontal: 20,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: palette.red50,
    borderWidth: 1,
    borderColor: palette.red100,
  },
  recorder: { alignItems: "center", paddingTop: 4, paddingBottom: 24 },
  timer: { fontFamily: fontFamily.mono, fontSize: 30, letterSpacing: 1, color: palette.muted, marginTop: -8 },
  controls: { flexDirection: "row", gap: 10, marginTop: 18 },
  grid: { gap: 10 },
  row: { flexDirection: "row", gap: 10 },
  pasteCard: { marginTop: 12, padding: 16, gap: 12, borderRadius: 22, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.lineStrong },
  pasteInput: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    color: palette.ink,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.paper,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
