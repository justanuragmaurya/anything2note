import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { SOURCE_ICON } from "@/components/library/ItemCard";
import { TopBar } from "@/components/navigation/TopBar";
import { Body, Button, Display, Eyebrow, Icon, Label, ProgressBar, Rise, Screen, SerifAccent, Skeleton, Small } from "@/components/ui";
import { demoItemFor, parseSource } from "@/lib/flow";
import { haptic } from "@/lib/haptics";
import { OUTPUT_LABELS, noteType, type NoteTypeKey, type OutputKey } from "@/lib/note-types";
import { palette } from "@/theme";

type Stage = { key: "extracting" | "transcribing" | "generating"; label: string; hint: string; ms: number };

const STAGES: Stage[] = [
  { key: "extracting", label: "Extracting", hint: "Reading the file and pulling out audio, pages or text", ms: 1600 },
  { key: "transcribing", label: "Transcribing", hint: "Speech to text with timestamps", ms: 2600 },
  { key: "generating", label: "Generating", hint: "Writing notes shaped for this type", ms: 2800 },
];

export default function Progress() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ source?: string; label?: string; type?: string; outputs?: string }>();
  const source = parseSource(params.source);
  const type = (params.type ?? "general") as NoteTypeKey;
  const nt = noteType(type);
  const outputs = (params.outputs ?? "").split(",").filter(Boolean) as OutputKey[];
  const skipsTranscribe = source === "text" || source === "photo" || source === "pdf";
  const stages = STAGES.filter((s) => !(skipsTranscribe && s.key === "transcribing"));

  const [idx, setIdx] = useState(0);
  const [pct, setPct] = useState(0);
  const done = idx >= stages.length;

  useEffect(() => {
    if (done) {
      haptic.success();
      return;
    }
    const stage = stages[idx]!;
    const started = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / stage.ms);
      setPct(p);
      if (p >= 1) {
        clearInterval(id);
        setIdx((i) => i + 1);
        setPct(0);
      }
    }, 80);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, done]);

  const overall = done ? 1 : (idx + pct) / stages.length;

  const open = () => {
    router.dismissAll();
    router.push({ pathname: "/item/[id]", params: { id: demoItemFor(type) } });
  };

  return (
    <Screen>
      <TopBar title={params.label} icon="close" onBack={() => router.dismissAll()} />
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <Rise>
          <Eyebrow color={palette.red600}>{done ? "Ready" : `Step ${idx + 1} of ${stages.length}`}</Eyebrow>
          <Display size={38} style={{ marginTop: 8 }}>
            {done ? (
              <>
                Your notes are <SerifAccent size={44}>ready</SerifAccent>.
              </>
            ) : (
              <>
                Making your <SerifAccent size={44}>{nt.label.toLowerCase()}</SerifAccent> notes…
              </>
            )}
          </Display>
        </Rise>

        <Rise delay={80}>
          <View style={styles.frame}>
            <View style={styles.sourceRow}>
              <View style={[styles.sourceIcon, { backgroundColor: nt.color }]}>
                <Icon name={SOURCE_ICON[source]} size={16} color={palette.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Label numberOfLines={1}>{params.label}</Label>
                <Small>{nt.label}</Small>
              </View>
              <Eyebrow>{Math.round(overall * 100)}%</Eyebrow>
            </View>
            <ProgressBar value={overall} style={{ marginTop: 14 }} />
          </View>
        </Rise>

        <View style={{ gap: 14, marginTop: 24 }}>
          {stages.map((s, i) => {
            const state = i < idx ? "done" : i === idx ? "active" : "todo";
            return (
              <Rise key={s.key} index={i} delay={140}>
                <View style={styles.stage}>
                  <View style={[styles.stageDot, state === "done" && styles.stageDone, state === "active" && styles.stageActive]}>
                    {state === "done" ? (
                      <Animated.View entering={ZoomIn.springify()}>
                        <Icon name="check" size={12} color={palette.cream} weight="bold" />
                      </Animated.View>
                    ) : (
                      <Eyebrow color={state === "active" ? palette.red600 : palette.muted}>{i + 1}</Eyebrow>
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Label style={{ color: state === "todo" ? palette.muted : palette.ink }}>{s.label}</Label>
                    <Small>{s.hint}</Small>
                    {state === "active" ? <Skeleton height={5} radius={3} tone="red" width={`${Math.max(8, pct * 100)}%`} /> : null}
                  </View>
                </View>
              </Rise>
            );
          })}
        </View>

        {done ? (
          <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.outputs}>
            {outputs.slice(0, 6).map((k) => (
              <View key={k} style={styles.outChip}>
                <Icon name="check" size={10} color={palette.red600} weight="bold" />
                <Small style={{ color: palette.ink }}>{OUTPUT_LABELS[k]}</Small>
              </View>
            ))}
          </Animated.View>
        ) : (
          <Body style={{ marginTop: 24, fontSize: 13, color: palette.muted }}>You can leave this screen — we&apos;ll notify you when it&apos;s done.</Body>
        )}
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) }}>
        <Button block size="lg" disabled={!done} onPress={open} icon={done ? "arrowUpRight" : undefined}>
          {done ? "Open notes" : "Working…"}
        </Button>
      </View>
    </Screen>
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
  outputs: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 24 },
  outChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.line },
});
