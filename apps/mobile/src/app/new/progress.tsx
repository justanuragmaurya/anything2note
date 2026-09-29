import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import type { ItemDetail, OutputKey, SourceKind } from "@a2n/shared";
import { OutputView } from "@/components/item/OutputView";
import { SOURCE_ICON } from "@/components/library/ItemCard";
import { TopBar } from "@/components/navigation/TopBar";
import { Body, Button, Display, Eyebrow, Icon, Label, ProgressBar, Rise, Screen, SerifAccent, Skeleton, Small } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { draftKind, getDraft, submitDraft } from "@/lib/draft";
import { haptic } from "@/lib/haptics";
import { OUTPUT_LABELS, noteType, type NoteTypeKey } from "@/lib/note-types";
import { apiLanguage, usePreferences } from "@/lib/preferences";
import { keys, queryClient, useItem, useRetryItem } from "@/lib/queries";
import { palette } from "@/theme";

type StepKey = "upload" | "read" | "generate";
type StepState = "todo" | "active" | "done" | "failed";

const MEDIA: SourceKind[] = ["audio", "video", "recording"];

/** Where the item is, from what the API reports (plus the upload, which happens here). */
function stepStates(detail: ItemDetail | undefined, phase: "upload" | "create" | "track", failed: boolean): Record<StepKey, StepState> {
  const s = detail?.item.status;
  const upload: StepState = phase === "upload" ? (failed ? "failed" : "active") : "done";
  // Creating the item is the hand-off between the upload and reading, so a failure there shows on "reading".
  if (!s) return { upload, read: phase === "create" ? (failed ? "failed" : "active") : "todo", generate: "todo" };
  if (s.state === "ready") return { upload, read: "done", generate: "done" };
  if (s.state === "failed") {
    const reading = !detail.content;
    return { upload, read: reading ? "failed" : "done", generate: reading ? "todo" : "failed" };
  }
  if (s.state === "queued") return { upload, read: "active", generate: "todo" };
  return s.step === "generating" ? { upload, read: "done", generate: "active" } : { upload, read: "active", generate: "todo" };
}

export default function Progress() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ source?: string; label?: string; type?: string; outputs?: string }>();
  const { prefs } = usePreferences();
  const draft = getDraft();
  const kind: SourceKind = draft ? draftKind(draft) : ((params.source as SourceKind) ?? "text");
  const auto = params.type === "auto";
  const chosen = (params.outputs ?? "").split(",").filter(Boolean) as OutputKey[];

  const [itemId, setItemId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"upload" | "create" | "track">(draft?.type === "upload" ? "upload" : "create");
  const [uploaded, setUploaded] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(draft ? null : "There's nothing to add. Go back and pick a source again.");
  const started = useRef(false);

  const submit = async () => {
    const d = getDraft();
    if (!d) return;
    setSubmitError(null);
    setPhase(d.type === "upload" ? "upload" : "create");
    setUploaded(0);
    try {
      const item = await submitDraft(
        d,
        { noteType: auto ? "auto" : ((params.type as NoteTypeKey) ?? "auto"), outputs: auto ? undefined : chosen, language: apiLanguage(prefs.outputLanguage) },
        (f) => {
          setUploaded(f);
          if (f >= 1) setPhase("create");
        },
      );
      setItemId(item.id);
      setPhase("track");
      void queryClient.invalidateQueries({ queryKey: keys.library });
    } catch (e) {
      haptic.warn();
      setSubmitError(errorMessage(e));
    }
  };

  useEffect(() => {
    if (started.current || !draft) return;
    started.current = true;
    void submit();
    // Runs once: the draft is submitted when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: detail, error: loadError } = useItem(itemId ?? undefined);
  const retry = useRetryItem();
  const status = detail?.item.status;
  const ready = status?.state === "ready";
  const serverFailed = status?.state === "failed";
  const failed = !!submitError || serverFailed;

  useEffect(() => {
    if (ready) haptic.success();
    else if (serverFailed) haptic.warn();
  }, [ready, serverFailed]);

  // Before auto-detect has read the source, the API has no type (it says "general" with no outputs).
  const typeKnown = !!detail && (!auto || detail.item.outputs.length > 0);
  const nt = noteType(typeKnown ? detail.item.noteType : ((params.type as NoteTypeKey) ?? "general"));
  const outputs = detail?.item.outputs ?? chosen;
  const primary = detail && typeKnown ? ([nt.primary, ...outputs].find((k) => detail.outputs[k]?.status === "ready") ?? null) : null;

  const media = MEDIA.includes(kind);
  const steps: { key: StepKey; label: string; hint: string }[] = [
    ...(draft?.type === "upload" || kind === "recording" ? [{ key: "upload" as const, label: "Uploading", hint: "Sending the file to anything2note" }] : []),
    media
      ? { key: "read", label: "Transcribing", hint: "Speech to text with timestamps" }
      : kind === "web"
        ? { key: "read", label: "Reading the page", hint: "Fetching the article and pulling out its text" }
        : { key: "read", label: "Reading", hint: kind === "text" ? "Taking in your text" : "Pulling out the text, page by page" },
    { key: "generate", label: "Writing notes", hint: auto && !typeKnown ? "Picking the type, then writing its notes" : `Shaped for a ${nt.label.toLowerCase()}` },
  ];
  const states = stepStates(detail, phase, failed);

  // Real numbers only: the upload's bytes, then the pipeline's own progress.
  const pct = phase === "upload" ? uploaded : status?.state === "processing" ? status.progress / 100 : ready ? 1 : 0;
  const eyebrow = ready
    ? "Ready"
    : failed
      ? "Something went wrong"
      : phase === "upload"
        ? `Uploading · ${Math.round(uploaded * 100)}%`
        : !status || status.state === "queued"
          ? "Starting"
          : `${Math.round(status.state === "processing" ? status.progress : 0)}% done`;

  const error =
    submitError ??
    (status?.state === "failed" ? status.error : retry.isError ? errorMessage(retry.error) : loadError ? errorMessage(loadError) : null);

  const openItem = () => {
    if (!itemId) return;
    router.dismissAll();
    router.push({ pathname: "/item/[id]", params: { id: itemId } });
  };
  const toLibrary = () => {
    router.dismissAll();
    router.navigate("/library");
  };

  return (
    <Screen>
      <TopBar title={params.label} icon="close" onBack={() => router.dismissAll()} />
      {/* Heading and the progress frame stay put; steps and the first output scroll. */}
      <View style={{ paddingHorizontal: 20 }}>
        <Rise>
          <Eyebrow color={palette.red600}>{eyebrow}</Eyebrow>
          <Display size={38} style={{ marginTop: 8 }}>
            {ready ? (
              <>
                Your notes are <SerifAccent size={44}>ready</SerifAccent>.
              </>
            ) : failed ? (
              <>
                That didn&apos;t <SerifAccent size={44}>work</SerifAccent>.
              </>
            ) : typeKnown || !auto ? (
              <>
                Making your <SerifAccent size={44}>{nt.label.toLowerCase()}</SerifAccent> notes…
              </>
            ) : (
              <>
                Making your <SerifAccent size={44}>notes</SerifAccent>…
              </>
            )}
          </Display>
        </Rise>

        <Rise delay={80}>
          <View style={styles.frame}>
            <View style={styles.sourceRow}>
              <View style={[styles.sourceIcon, { backgroundColor: typeKnown || !auto ? nt.color : palette.panel }]}>
                <Icon name={SOURCE_ICON[kind]} size={16} color={palette.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Label numberOfLines={1}>{detail?.item.title ?? params.label}</Label>
                <Small>{typeKnown || !auto ? nt.label : "Type is detected after reading"}</Small>
              </View>
              <Eyebrow>{Math.round(pct * 100)}%</Eyebrow>
            </View>
            <ProgressBar value={pct} color={failed ? palette.red700 : palette.red500} style={{ marginTop: 14 }} />
          </View>
        </Rise>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 }}>
        <View style={{ gap: 14 }}>
          {steps.map((s, i) => {
            const state = states[s.key];
            return (
              <Rise key={s.key} index={i} delay={140}>
                <View style={styles.stage}>
                  <View style={[styles.stageDot, state === "done" && styles.stageDone, (state === "active" || state === "failed") && styles.stageActive]}>
                    {state === "done" ? (
                      <Animated.View entering={ZoomIn.springify()}>
                        <Icon name="check" size={12} color={palette.cream} weight="bold" />
                      </Animated.View>
                    ) : state === "failed" ? (
                      <Icon name="close" size={11} color={palette.red600} weight="bold" />
                    ) : (
                      <Eyebrow color={state === "active" ? palette.red600 : palette.muted}>{i + 1}</Eyebrow>
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Label style={{ color: state === "todo" ? palette.muted : palette.ink }}>{s.label}</Label>
                    <Small>{s.hint}</Small>
                    {state === "active" && s.key === "upload" ? <ProgressBar value={uploaded} height={5} /> : null}
                    {/* The pipeline reports progress for the whole item (above), so the active step just shimmers. */}
                    {state === "active" && s.key !== "upload" ? <Skeleton height={5} radius={3} tone="red" /> : null}
                    {s.key === "generate" && detail && outputs.length ? <OutputChips detail={detail} outputs={outputs} /> : null}
                  </View>
                </View>
              </Rise>
            );
          })}
        </View>

        {error ? (
          <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.error}>
            <Icon name="info" size={16} color={palette.red600} />
            <Body style={{ flex: 1, fontSize: 14, color: palette.red700 }}>{error}</Body>
          </Animated.View>
        ) : null}

        {primary && detail ? (
          <Animated.View entering={FadeInDown.springify().damping(16)} style={{ marginTop: 28 }}>
            <Eyebrow style={{ marginBottom: 12 }}>{ready ? OUTPUT_LABELS[primary] : `First up · ${OUTPUT_LABELS[primary]}`}</Eyebrow>
            <OutputView output={primary} detail={detail} />
          </Animated.View>
        ) : !failed && !ready ? (
          <Body style={{ marginTop: 24, fontSize: 13, color: palette.muted }}>
            {phase === "upload"
              ? "Keep the app open until the upload finishes."
              : "This usually takes a few minutes. You can leave — it keeps going and appears in your library."}
          </Body>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {ready ? (
          <Button block size="lg" icon="arrowRight" onPress={openItem}>
            Open my notes
          </Button>
        ) : failed && (itemId || getDraft()) ? (
          <Button block size="lg" leadingIcon="retry" loading={retry.isPending} onPress={() => (itemId && !submitError ? retry.mutate(itemId) : void submit())}>
            Try again
          </Button>
        ) : failed ? (
          <Button block size="lg" variant="ghost" onPress={() => router.dismissAll()}>
            Back
          </Button>
        ) : itemId ? (
          <Button block size="lg" variant="ghost" onPress={toLibrary}>
            Back to library
          </Button>
        ) : (
          <Button block size="lg" disabled>
            {phase === "upload" ? "Uploading…" : "Starting…"}
          </Button>
        )}
      </View>
    </Screen>
  );
}

/** Each output's real state: queued, being written, written, or failed. */
function OutputChips({ detail, outputs }: { detail: ItemDetail; outputs: OutputKey[] }) {
  return (
    <Animated.View entering={FadeIn} style={styles.outputs}>
      {outputs.map((k) => {
        const s = detail.outputs[k]?.status ?? "queued";
        return (
          <View key={k} style={[styles.outChip, s === "ready" && { borderColor: palette.red200 }, s === "queued" && { opacity: 0.6 }]}>
            {s === "ready" ? (
              <Icon name="check" size={10} color={palette.red600} weight="bold" />
            ) : s === "running" ? (
              <ActivityIndicator size="small" color={palette.red500} style={{ width: 10, height: 10, transform: [{ scale: 0.55 }] }} />
            ) : s === "failed" ? (
              <Icon name="close" size={10} color={palette.red700} weight="bold" />
            ) : (
              <View style={styles.queuedDot} />
            )}
            <Small style={{ color: s === "failed" ? palette.red700 : palette.ink }}>{OUTPUT_LABELS[k]}</Small>
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { marginTop: 24, padding: 16, borderRadius: 22, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.card },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  sourceIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stage: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  stageDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: palette.lineStrong, alignItems: "center", justifyContent: "center", marginTop: -2 },
  stageActive: { borderColor: palette.red500, backgroundColor: palette.red50 },
  stageDone: { borderColor: palette.red500, backgroundColor: palette.red500 },
  outputs: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  outChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.line },
  queuedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.lineStrong },
  error: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 24, padding: 14, borderRadius: 16, backgroundColor: palette.red50, borderWidth: 1, borderColor: palette.red100 },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
});
