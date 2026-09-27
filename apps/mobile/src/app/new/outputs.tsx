import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { TopBar } from "@/components/navigation/TopBar";
import { NoteTypeShape } from "@/components/note-type/NoteTypeShape";
import { Body, Button, Eyebrow, H, Icon, Label, PressableScale, Rise, Screen, SerifAccent, Small } from "@/components/ui";
import { detectType, parseSource } from "@/lib/flow";
import { NOTE_TYPES, OUTPUT_LABELS, noteType, type NoteTypeKey, type OutputKey } from "@/lib/note-types";
import { palette, spring } from "@/theme";

function Check({ on }: { on: boolean }) {
  const tick = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(on ? 1 : 0, spring) }] }));
  return (
    <View style={[styles.box, on && styles.boxOn]}>
      <Animated.View style={tick}>
        <Icon name="check" size={12} color={palette.cream} weight="bold" />
      </Animated.View>
    </View>
  );
}

function Row({ k, on, onToggle, optional }: { k: OutputKey; on: boolean; onToggle: () => void; optional?: boolean }) {
  return (
    <PressableScale onPress={onToggle} haptics="select" scaleTo={0.98} style={[styles.row, on && { borderColor: palette.lineStrong, backgroundColor: palette.card }]}>
      <Check on={on} />
      <Label style={{ flex: 1, color: on ? palette.ink : palette.inkSoft }}>{OUTPUT_LABELS[k]}</Label>
      {optional ? <Eyebrow>Optional</Eyebrow> : null}
    </PressableScale>
  );
}

export default function Outputs() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ source?: string; label?: string; type?: string }>();
  const source = parseSource(params.source);
  const auto = params.type === "auto" || !NOTE_TYPES.some((n) => n.key === params.type);
  const typeKey: NoteTypeKey = auto ? detectType(source) : (params.type as NoteTypeKey);
  const nt = noteType(typeKey);
  const [selected, setSelected] = useState<Set<OutputKey>>(() => new Set(nt.defaults));

  const toggle = (k: OutputKey) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const go = () =>
    router.push({
      pathname: "/new/progress",
      params: { source, label: params.label ?? "", type: typeKey, outputs: [...selected].join(",") },
    });

  return (
    <Screen>
      <TopBar title={params.label} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}>
        <Rise>
          <View style={[styles.hero, { backgroundColor: nt.color }]}>
            <NoteTypeShape type={nt.key} width={220} height={60} />
            <Eyebrow color={palette.inkSoft} style={{ marginTop: 14 }}>
              {auto ? "Auto-detected" : "Note type"}
            </Eyebrow>
            <SerifAccent upright color={palette.ink} size={34}>
              {nt.label}
            </SerifAccent>
            <Small style={{ color: palette.inkSoft }}>{nt.blurb}</Small>
          </View>
        </Rise>

        <Rise delay={80}>
          <H level={2} style={{ marginTop: 26 }}>
            What should we <SerifAccent>make</SerifAccent>?
          </H>
          <Body style={{ marginTop: 4 }}>Transcript and chat are always included.</Body>
        </Rise>

        <View style={{ gap: 8, marginTop: 16 }}>
          {nt.defaults.map((k, i) => (
            <Rise key={k} index={i} delay={120}>
              <Row k={k} on={selected.has(k)} onToggle={() => toggle(k)} />
            </Rise>
          ))}
          <Eyebrow style={{ marginTop: 12, marginBottom: 2 }}>Extras</Eyebrow>
          {nt.optional.map((k, i) => (
            <Rise key={k} index={i + nt.defaults.length} delay={120}>
              <Row k={k} on={selected.has(k)} onToggle={() => toggle(k)} optional />
            </Rise>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Small>{selected.size} outputs</Small>
        <Button size="lg" icon="sparkles" onPress={go} disabled={selected.size === 0}>
          Make my notes
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 6, padding: 18, gap: 2, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.paperGlow,
  },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: palette.lineStrong, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: palette.red500, borderColor: palette.red500 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: palette.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.lineStrong,
  },
});
