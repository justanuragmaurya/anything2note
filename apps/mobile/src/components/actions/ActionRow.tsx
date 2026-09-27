import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Icon, PressableScale, Small, TimestampChip } from "@/components/ui";
import type { ActionItem } from "@/lib/mock/types";
import { fontFamily, palette } from "@/theme";

type Props = { item: ActionItem; onToggle: () => void; source?: string; showSource?: boolean };

/** Owner / due pill. Missing values are simply left out so rows stay quiet. */
function Meta({ icon, value }: { icon: "person" | "calendar"; value: string | null }) {
  if (value === null) return null;
  return (
    <View style={styles.meta}>
      <Icon name={icon} size={11} color={palette.muted} />
      <Text style={styles.metaText}>{value}</Text>
    </View>
  );
}

/** Action item with an animated tick (checkbox scale-in); done tasks fade to muted and strike through. */
export function ActionRow({ item, onToggle, source, showSource = true }: Props) {
  const v = useSharedValue(item.done ? 1 : 0);
  useEffect(() => {
    v.set(withTiming(item.done ? 1 : 0, { duration: 260 }));
  }, [item.done, v]);

  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(v.value, [0, 1], [palette.card, palette.red500]),
    borderColor: interpolateColor(v.value, [0, 1], [palette.lineStrong, palette.red500]),
    // Pops mid-transition, settles at 1.
    transform: [{ scale: 1 + Math.sin(v.value * Math.PI) * 0.2 }],
  }));
  const check = useAnimatedStyle(() => ({ transform: [{ scale: v.value }], opacity: v.value }));
  const text = useAnimatedStyle(() => ({ color: interpolateColor(v.value, [0, 1], [palette.ink, palette.muted]) }));

  return (
    <View style={styles.row}>
      <PressableScale onPress={onToggle} haptics="select" scaleTo={0.85} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked: item.done }}>
        <Animated.View style={[styles.box, box]}>
          <Animated.View style={check}>
            <Icon name="check" size={13} color={palette.cream} weight="bold" />
          </Animated.View>
        </Animated.View>
      </PressableScale>
      <View style={{ flex: 1, gap: 8 }}>
        <Animated.Text style={[styles.task, item.done && styles.taskDone, text]}>{item.task}</Animated.Text>
        <View style={styles.metaRow}>
          <Meta icon="person" value={item.owner} />
          <Meta icon="calendar" value={item.due} />
          <TimestampChip at={item.at} onSeek={(s) => router.push({ pathname: "/item/[id]", params: { id: item.itemId, t: String(s) } })} />
        </View>
        {showSource && source ? (
          <Small numberOfLines={1} style={{ fontSize: 12 }}>
            from {source}
          </Small>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.card,
  },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 1 },
  task: { fontFamily: fontFamily.sans, fontSize: 15, lineHeight: 21 },
  taskDone: { textDecorationLine: "line-through", textDecorationColor: palette.muted },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: palette.panel },
  metaText: { fontFamily: fontFamily.sans, fontSize: 12, color: palette.inkSoft },
});
