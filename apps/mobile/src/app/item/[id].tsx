import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Player } from "@/components/item/Player";
import { OutputView } from "@/components/item/OutputView";
import { Chat } from "@/components/item/renderers/Chat";
import { Transcript } from "@/components/item/renderers/Transcript";
import { TopBar } from "@/components/navigation/TopBar";
import { Body, Chip, Display, Eyebrow, Icon, PressableScale, Rise, SeekContext, SlidingTabs, type TabItem } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { itemById } from "@/lib/mock/items";
import { OUTPUT_LABELS, noteType, type OutputKey } from "@/lib/note-types";
import { palette } from "@/theme";

type TabKey = OutputKey | "transcript" | "chat";

/** Short tab labels for the long registry names. */
const SHORT: Partial<Record<OutputKey, string>> = {
  minutes: "Minutes",
  summary: "Summary",
  detailed_notes: "Notes",
  open_questions: "Open questions",
  revision_points: "Revision",
  mind_map: "Mind map",
  follow_up_email: "Follow-up",
  step_by_step: "Steps",
  code_snippets: "Code",
  scorecard: "Scorecard",
};

export default function ItemScreen() {
  const { id, t } = useLocalSearchParams<{ id: string; t?: string }>();
  const item = itemById(id);
  const insets = useSafeAreaInsets();

  const [time, setTime] = useState(() => (t ? Number(t) : (item?.transcript[0]?.at ?? 0)));
  const [playing, setPlaying] = useState(!!t);

  const tabs = useMemo<TabItem<TabKey>[]>(() => {
    if (!item) return [];
    const nt = noteType(item.type);
    const keys: OutputKey[] = [...nt.defaults, ...nt.optional.filter((k) => item.outputs[k])];
    return [
      ...keys.map((k) => ({ value: k as TabKey, label: SHORT[k] ?? OUTPUT_LABELS[k] })),
      { value: "transcript", label: "Transcript" },
      { value: "chat", label: "Chat" },
    ];
  }, [item]);
  const [tab, setTab] = useState<TabKey>(tabs[0]?.value ?? "chat");

  const duration = item?.duration ?? 0;
  useEffect(() => {
    if (!playing || !duration) return;
    const id2 = setInterval(() => setTime((s) => (s + 1 >= duration ? 0 : s + 1)), 1000);
    return () => clearInterval(id2);
  }, [playing, duration]);

  const seek = (s: number) => {
    haptic.select();
    setTime(Math.min(Math.max(0, s), duration || s));
    setPlaying(true);
  };

  if (!item) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <TopBar tone="night" />
        <Body style={{ color: palette.nightMuted, textAlign: "center", marginTop: 40 }}>That item doesn&apos;t exist.</Body>
      </View>
    );
  }
  const nt = noteType(item.type);

  return (
    <SeekContext.Provider value={seek}>
      <StatusBar style="light" />
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <TopBar
          tone="night"
          title={`${nt.label} · ${item.createdAt}`}
          right={
            <PressableScale hitSlop={10} accessibilityLabel="More" style={styles.more}>
              <Icon name="more" size={16} color={palette.nightText} />
            </PressableScale>
          }
        />
        {/* Pinned header: title + player stay put while outputs scroll */}
        <Rise style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <Display size={26} color={palette.nightText} numberOfLines={2}>
            {item.title}
          </Display>
        </Rise>
        <Player
          duration={duration || 1}
          time={time}
          playing={playing}
          onToggle={() => setPlaying((p) => !p)}
          onSeek={seek}
          seed={item.id.length}
          label={item.sourceLabel}
          isDocument={!item.duration}
        />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheet} keyboardVerticalOffset={0}>
          <View style={styles.sheetHead}>
            <View style={styles.typeRow}>
              <Chip size="sm" label={nt.label} noteType={item.type} />
              <Eyebrow>{tabs.length - 2} outputs</Eyebrow>
            </View>
            <SlidingTabs scrollable size="sm" value={tab} onChange={setTab} items={tabs} />
          </View>

          {tab === "chat" ? (
            <View style={{ flex: 1, paddingBottom: insets.bottom }}>
              <Chat item={item} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
              <Animated.View key={tab} entering={FadeIn.duration(220)}>
                <Rise>{tab === "transcript" ? <Transcript lines={item.transcript} time={time} /> : <OutputView output={tab} item={item} />}</Rise>
              </Animated.View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>
    </SeekContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.night },
  more: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.nightLine, backgroundColor: palette.night2 },
  sheet: { flex: 1, marginTop: 16, backgroundColor: palette.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  sheetHead: { paddingTop: 14, paddingBottom: 10, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.lineStrong },
  typeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
});
