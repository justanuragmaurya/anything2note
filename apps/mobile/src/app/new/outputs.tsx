import { useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { TopBar } from "@/components/navigation/TopBar";
import { NoteTypeShape } from "@/components/note-type/NoteTypeShape";
import { Body, Button, Chip, Eyebrow, H, Icon, Label, PressableScale, Rise, Screen, SerifAccent, Small } from "@/components/ui";
import { getPending, setDraftOptions } from "@/lib/draft";
import { OUTPUT_LABELS, noteType, type NoteTypeKey, type OutputKey } from "@/lib/note-types";
import { languageOptions, usePreferences } from "@/lib/preferences";
import { fontFamily, palette, spring } from "@/theme";

/** A focused paragraph ("focus on the exam topics, skip the admin") is all instructions need. */
const MAX_INSTRUCTIONS = 500;

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

/** Outputs to make (for a chosen type), plus this item's language and instructions. */
export default function Outputs() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ source?: string; label?: string; type?: string }>();
  const auto = params.type === "auto";
  const nt = noteType((auto ? "general" : params.type) as NoteTypeKey);
  const { settings } = usePreferences();
  // A draft picked back up keeps what was chosen before; a new one starts from the settings.
  const saved = getPending()?.options;
  const [selected, setSelected] = useState<Set<OutputKey>>(() => new Set(saved?.noteType === nt.key && saved.outputs ? saved.outputs : nt.defaults));
  const [language, setLanguage] = useState(saved?.language ?? settings.language);
  const [instructions, setInstructions] = useState(saved?.instructions ?? "");

  const toggle = (k: OutputKey) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const go = () => {
    setDraftOptions({
      noteType: auto ? "auto" : nt.key,
      outputs: auto ? undefined : [...selected],
      language,
      instructions: instructions.trim() || undefined,
    });
    router.push({ pathname: "/new/progress", params: { source: params.source ?? "", label: params.label ?? "", type: auto ? "auto" : nt.key } });
  };

  return (
    <Screen>
      <TopBar title={params.label} />
      {/* Type card and question stay put; only the checklist and details scroll. */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <Rise>
          <View style={[styles.hero, { backgroundColor: auto ? palette.night : nt.color }]}>
            {auto ? <Icon name="sparkles" size={34} color={palette.red400} /> : <NoteTypeShape type={nt.key} width={220} height={60} />}
            <Eyebrow color={auto ? palette.nightMuted : palette.inkSoft} style={{ marginTop: 14 }}>
              Note type
            </Eyebrow>
            <SerifAccent upright color={auto ? palette.nightText : palette.ink} size={34}>
              {auto ? "Auto-detect" : nt.label}
            </SerifAccent>
            <Small style={{ color: auto ? palette.nightMuted : palette.inkSoft }}>
              {auto ? "We read it, pick the best type and make its usual notes." : nt.blurb}
            </Small>
          </View>
        </Rise>

        <Rise delay={80}>
          <H level={2} style={{ marginTop: 26 }}>
            {auto ? (
              <>
                Any <SerifAccent>details</SerifAccent>?
              </>
            ) : (
              <>
                What should we <SerifAccent>make</SerifAccent>?
              </>
            )}
          </H>
          <Body style={{ marginTop: 4 }}>{auto ? "Both are optional." : "Transcript and chat are always included."}</Body>
        </Rise>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {auto ? null : (
          <View style={{ gap: 8, marginTop: 4 }}>
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
        )}

        <Rise delay={160}>
          <Eyebrow style={{ marginTop: auto ? 4 : 24, marginBottom: 10 }}>Notes language</Eyebrow>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }}>
            {languageOptions(language).map((o) => (
              <Chip key={o.value} size="sm" label={o.label} active={o.value === language} onPress={() => setLanguage(o.value)} />
            ))}
          </ScrollView>

          <Eyebrow style={{ marginTop: 22, marginBottom: 10 }}>Instructions for the AI</Eyebrow>
          <TextInput
            value={instructions}
            onChangeText={(v) => setInstructions(v.slice(0, MAX_INSTRUCTIONS))}
            placeholder="Optional, e.g. focus on the exam topics and skip the admin at the start"
            placeholderTextColor={palette.muted}
            multiline
            style={styles.instructions}
          />
          {instructions.length > MAX_INSTRUCTIONS * 0.8 ? (
            <Small style={{ marginTop: 6, textAlign: "right" }}>
              {instructions.length}/{MAX_INSTRUCTIONS}
            </Small>
          ) : null}
        </Rise>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Small>{auto ? "Type picked for you" : `${selected.size} outputs`}</Small>
        <Button size="lg" icon="sparkles" onPress={go} disabled={!auto && selected.size === 0}>
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
  instructions: {
    minHeight: 96,
    maxHeight: 180,
    textAlignVertical: "top",
    fontFamily: fontFamily.sans,
    fontSize: 15,
    color: palette.ink,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.card,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
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
