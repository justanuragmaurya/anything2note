import { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from "expo-audio";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { UPLOAD_LIMITS, isYoutubeUrl, planDef, youtubeIdOf, youtubeThumbnailUrl, type SourceKind } from "@a2n/shared";
import { LiveWaveform } from "@/components/add/LiveWaveform";
import { RecordButton } from "@/components/add/RecordButton";
import { SourceTile } from "@/components/add/SourceTile";
import { Button, Display, Eyebrow, Icon, Label, PressableScale, Rise, Screen, SerifAccent, Small } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { clearDraft, draftKind, normaliseUrl, pickDocument, pickPhoto, recordingDraft, setDraft, useDraftSubmitting, usePendingDraft, type Draft, type PendingDraft } from "@/lib/draft";
import { fmtTime } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { showMenu } from "@/lib/menu";
import { useMe } from "@/lib/queries";
import { fontFamily, palette } from "@/theme";

type RecState = "idle" | "recording" | "paused";
type Paste = "link" | "text" | null;

/**
 * Mono AAC at 48 kbps: plenty for speech, and small (~21 MB an hour, so even a 6-hour Pro
 * recording is ~130 MB). Metering drives the live waveform.
 */
const REC_OPTIONS: RecordingOptions = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 48_000, isMeteringEnabled: true };
/** Text under this length is rejected by the API ("Paste at least a few sentences."). */
const MIN_TEXT = 20;

function startFlow(draft: Draft, source: SourceKind, label: string) {
  setDraft(draft, label);
  router.push({ pathname: "/new/type", params: { source, label } });
}

/** Picks an unfinished draft (e.g. from before the app closed) back up where it stopped. */
function resumeFlow(p: PendingDraft) {
  const source = draftKind(p.draft);
  if (p.options) router.push({ pathname: "/new/progress", params: { source, label: p.label, type: p.options.noteType } });
  else router.push({ pathname: "/new/type", params: { source, label: p.label } });
}

/** "2 h", "90 min" */
const fmtLimit = (sec: number) => (sec % 3600 === 0 ? `${sec / 3600} h` : `${Math.round(sec / 60)} min`);

/** Metering is dBFS (about -160 silent … 0 loudest); speech sits roughly between -50 and -10. */
const level = (db: number | undefined) => (db === undefined ? 0 : Math.min(1, Math.max(0, (db + 55) / 45)));

export default function Add() {
  const recorder = useAudioRecorder(REC_OPTIONS);
  const recState = useAudioRecorderState(recorder, 100);
  const [rec, setRec] = useState<RecState>("idle");
  const [consent, setConsent] = useState(true);
  const [paste, setPaste] = useState<Paste>(null);
  const [value, setValue] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = usePendingDraft();
  const submitting = useDraftSubmitting();
  const billing = useMe().data?.billing;
  // Recordings stop at the plan's longest recording, so they don't fail after uploading.
  const plan = billing?.plan ? planDef(billing.plan) : null;
  const maxMs = (plan?.maxMediaSeconds ?? UPLOAD_LIMITS.maxRecordingSeconds) * 1000;

  const seconds = Math.floor(recState.durationMillis / 1000);

  const start = async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Microphone is off", "Allow microphone access in Settings to record lectures.", [
        { text: "Not now", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      haptic.heavy();
      setRec("recording");
    } catch (e) {
      Alert.alert("Couldn't start recording", errorMessage(e));
    }
  };

  const stop = async () => {
    try {
      await recorder.stop();
    } finally {
      setRec("idle");
      // Hand the audio session back to playback (and the loudspeaker).
      void setAudioModeAsync({ allowsRecording: false, allowsBackgroundRecording: false });
    }
    const uri = recorder.uri;
    if (!uri) return Alert.alert("Recording failed", "Nothing was saved. Try recording again.");
    if (recState.durationMillis < 2000) return Alert.alert("Too short", "Record at least a couple of seconds.");
    haptic.success();
    try {
      startFlow(recordingDraft(uri), "recording", `Recording · ${fmtTime(seconds)}`);
    } catch (e) {
      Alert.alert("Can't use this recording", errorMessage(e));
    }
  };

  useEffect(() => {
    if (rec === "recording" && recState.durationMillis >= maxMs) {
      void stop();
      Alert.alert("Recording stopped", `${plan?.name ?? "Your"} plan recordings can be up to ${fmtLimit(maxMs / 1000)}. We're making notes from what you recorded.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec, recState.durationMillis, maxMs]);

  const toggleMain = () => {
    if (rec === "idle") void start();
    else void stop();
  };

  const pauseResume = () => {
    haptic.tap();
    if (rec === "paused") {
      recorder.record();
      setRec("recording");
    } else {
      recorder.pause();
      setRec("paused");
    }
  };

  /** Runs a picker; a thrown error is a user-facing reason the file can't be used. */
  const pick = async (fn: () => Promise<Draft | null>) => {
    if (busy) return;
    setBusy(true);
    try {
      const d = await fn();
      if (d && d.type === "upload") startFlow(d, d.kind, d.file.name);
    } catch (e) {
      Alert.alert("Can't use that file", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const photo = () =>
    showMenu("Add a photo", [
      { label: "Take photo", onPress: () => void pick(() => pickPhoto("camera")) },
      { label: "Choose from library", onPress: () => void pick(() => pickPhoto("library")) },
    ]);

  // A pasted YouTube link: a video to preview, or a channel/playlist that can't be used.
  const link = paste === "link" ? normaliseUrl(value) : null;
  const videoId = link ? youtubeIdOf(link) : null;
  const notAVideo = !!link && !videoId && isYoutubeUrl(link);

  const submitPaste = () => {
    const v = value.trim();
    if (!v) return haptic.warn();
    if (paste === "link") {
      if (notAVideo) return haptic.warn();
      const url = normaliseUrl(v);
      if (!url) {
        haptic.warn();
        return setPasteError("That doesn't look like a web link.");
      }
      setPaste(null);
      setValue("");
      // The API tells YouTube from web pages; the kind here only shapes the next screens.
      if (videoId) startFlow({ type: "url", url }, "youtube", "YouTube video");
      else startFlow({ type: "url", url }, "web", new URL(url).hostname.replace(/^www\./, ""));
    } else {
      if (v.length < MIN_TEXT) {
        haptic.warn();
        return setPasteError("Paste at least a few sentences.");
      }
      setPaste(null);
      setValue("");
      startFlow({ type: "text", text: v }, "text", `Pasted text · ${v.split(/\s+/).length} words`);
    }
  };

  const openPaste = (p: Exclude<Paste, null>) => {
    setPasteError(null);
    setPaste(paste === p ? null : p);
  };

  const live = rec !== "idle";

  const discardPending = () =>
    Alert.alert("Discard this item?", "What you picked or recorded won't be turned into notes.", [
      { text: "Keep", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: clearDraft },
    ]);

  return (
    <Screen>
      <Rise className="px-5 pt-4">
        <Eyebrow>New item</Eyebrow>
        <Display size={40} style={{ marginTop: 6 }}>
          Add <SerifAccent size={46}>anything</SerifAccent>
        </Display>
      </Rise>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {consent ? (
          <Animated.View entering={FadeInDown.delay(80)} exiting={FadeOut.duration(180)} layout={LinearTransition} style={styles.consent}>
            <Icon name="shield" size={18} color={palette.red600} />
            <Small style={{ flex: 1, color: palette.inkSoft }}>
              Recording a class? Check that your lecturer or institution allows it first.
            </Small>
            <PressableScale onPress={() => setConsent(false)} hitSlop={10} accessibilityLabel="Dismiss">
              <Icon name="close" size={14} color={palette.muted} />
            </PressableScale>
          </Animated.View>
        ) : null}

        {pending && !live ? (
          <Animated.View entering={FadeInDown.delay(60)} exiting={FadeOut.duration(180)} layout={LinearTransition} style={styles.resume}>
            <View style={{ flex: 1, gap: 2 }}>
              <Eyebrow color={palette.red600}>{submitting ? "Uploading…" : pending.upload && !pending.upload.done ? "Upload paused" : "Not finished"}</Eyebrow>
              <Label numberOfLines={1}>{pending.label}</Label>
            </View>
            {submitting ? null : (
              <Button size="sm" variant="ghost" onPress={discardPending}>
                Discard
              </Button>
            )}
            <Button size="sm" icon="arrowRight" onPress={() => resumeFlow(pending)}>
              {submitting ? "View" : "Continue"}
            </Button>
          </Animated.View>
        ) : null}

        <Animated.View layout={LinearTransition.springify().damping(18)} style={styles.recorder}>
          <RecordButton state={rec} onPress={toggleMain} />
          <Animated.Text key={live ? "t" : "i"} entering={FadeIn} style={[styles.timer, live && { color: palette.ink }]}>
            {live ? fmtTime(seconds) : "Tap to record a lecture"}
          </Animated.Text>
          {live ? (
            <Animated.View entering={FadeIn} exiting={FadeOut.duration(150)} style={{ alignSelf: "stretch", paddingHorizontal: 28, marginTop: 12 }}>
              <LiveWaveform active={rec === "recording"} level={level(recState.metering)} at={recState.durationMillis} height={40} />
            </Animated.View>
          ) : null}
          {live ? (
            <Animated.View entering={FadeInDown.springify().damping(16)} exiting={FadeOut.duration(150)} style={styles.controls}>
              <Button variant="ghost" leadingIcon={rec === "paused" ? "mic" : "pause"} onPress={pauseResume}>
                {rec === "paused" ? "Resume" : "Pause"}
              </Button>
              <Button variant="ink" leadingIcon="stop" onPress={() => void stop()}>
                Stop & make notes
              </Button>
            </Animated.View>
          ) : (
            <Small style={{ marginTop: 6, textAlign: "center", paddingHorizontal: 28 }}>
              Keeps recording with the screen locked{plan ? ` · up to ${fmtLimit(plan.maxMediaSeconds)} on ${plan.name}` : ""}
            </Small>
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
              <SourceTile icon="upload" title="Upload file" hint="PDF, Word, slides, audio & video" tint={palette.tutorial} onPress={() => void pick(pickDocument)} />
              <SourceTile icon="camera" title="Photo" hint="Whiteboards, handouts, pages" tint={palette.lecture} onPress={photo} />
            </View>
            <View style={styles.row}>
              <SourceTile icon="link" title="Paste link" hint="YouTube videos, articles, web pages" tint={palette.interview} onPress={() => openPaste("link")} />
              <SourceTile icon="paste" title="Paste text" hint="Notes, emails, transcripts" tint={palette.podcast} onPress={() => openPaste("text")} />
            </View>
          </View>

          {paste ? (
            <Animated.View key={paste} entering={FadeInDown.springify().damping(18)} exiting={FadeOut.duration(150)} style={styles.pasteCard}>
              <Eyebrow>{paste === "link" ? "Paste a link" : "Paste text"}</Eyebrow>
              <TextInput
                autoFocus
                value={value}
                onChangeText={(v) => {
                  setValue(v);
                  setPasteError(null);
                }}
                placeholder={paste === "link" ? "https://…" : "Paste or type anything…"}
                placeholderTextColor={palette.muted}
                multiline={paste === "text"}
                autoCapitalize={paste === "link" ? "none" : "sentences"}
                autoCorrect={paste !== "link"}
                keyboardType={paste === "link" ? "url" : "default"}
                style={[styles.pasteInput, paste === "text" && { minHeight: 110, maxHeight: 240, textAlignVertical: "top" }]}
              />
              {videoId ? (
                <Animated.View entering={FadeIn} style={styles.preview}>
                  <Image source={{ uri: youtubeThumbnailUrl(videoId) }} style={styles.previewThumb} contentFit="cover" transition={200} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Icon name="youtube" size={14} color={palette.red600} />
                      <Label>YouTube video</Label>
                    </View>
                    <Small numberOfLines={1}>Notes with timestamps back to the video</Small>
                  </View>
                </Animated.View>
              ) : notAVideo ? (
                <View style={styles.notice}>
                  <Icon name="youtube" size={15} color={palette.red600} />
                  <Small style={{ flex: 1, color: palette.inkSoft }}>That&apos;s a channel or playlist. Paste the link to a single video.</Small>
                </View>
              ) : pasteError ? (
                <Small style={{ color: palette.red600 }}>{pasteError}</Small>
              ) : null}
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                <Button variant="ghost" size="sm" onPress={() => setPaste(null)}>
                  Cancel
                </Button>
                <Button size="sm" icon="arrowRight" onPress={submitPaste} disabled={notAVideo}>
                  Continue
                </Button>
              </View>
            </Animated.View>
          ) : null}
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
  resume: {
    marginHorizontal: 20,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    paddingLeft: 16,
    borderRadius: 18,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.lineStrong,
  },
  recorder: { alignItems: "center", paddingTop: 4, paddingBottom: 20 },
  timer: { fontFamily: fontFamily.mono, fontSize: 20, letterSpacing: 0.5, color: palette.muted },
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
  preview: { flexDirection: "row", alignItems: "center", gap: 12, padding: 8, borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
  previewThumb: { width: 96, height: 54, borderRadius: 10, backgroundColor: palette.panel },
  notice: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 12, backgroundColor: palette.red50 },
});
