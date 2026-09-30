import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import type { Anchor, Task, TaskKind } from "@a2n/shared";
import { AnchorChip, Icon, PressableScale, Small } from "@/components/ui";
import { fmtDue } from "@/lib/format";
import { alpha, fontFamily, palette } from "@/theme";

type Props = {
  item: Task;
  onToggle: () => void;
  source?: string;
  showSource?: boolean;
  /** Where the anchor chip goes; inside the item screen the chip uses the screen's own handler. */
  onAnchor?: (a: Anchor) => void;
  /** Tapping the text (or the pencil) edits the task's text, kind and due date. */
  onEdit?: () => void;
};

const KIND: Record<TaskKind, { label: string; tint: string }> = {
  homework: { label: "Homework", tint: palette.lecture },
  reading: { label: "Reading", tint: palette.reading },
  exam: { label: "Exam", tint: palette.red200 },
  project: { label: "Project", tint: palette.tutorial },
};

/** What kind of task the lecturer set: homework, a reading, an exam or project work. */
function KindChip({ kind }: { kind: TaskKind }) {
  const k = KIND[kind];
  return (
    <View style={[styles.kind, { backgroundColor: alpha(k.tint, 0.6) }]}>
      <Text style={styles.kindText}>{k.label}</Text>
    </View>
  );
}

/** Due pill. A deadline the lecturer never gave shows as "Not mentioned" rather than a guess. */
function Due({ value }: { value: string | null }) {
  return (
    <View style={styles.meta}>
      <Icon name="calendar" size={11} color={palette.muted} />
      <Text style={[styles.metaText, value === null && styles.metaMissing]}>{value ? fmtDue(value) : "Not mentioned"}</Text>
    </View>
  );
}

/** Task from class with an animated tick (checkbox scale-in); done tasks fade to muted and strike through. */
export function TaskRow({ item, onToggle, source, showSource = true, onAnchor, onEdit }: Props) {
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
        <Pressable onPress={onEdit} disabled={!onEdit} accessibilityRole={onEdit ? "button" : undefined} accessibilityHint={onEdit ? "Edit this task" : undefined}>
          <Animated.Text style={[styles.task, item.done && styles.taskDone, text]}>{item.task}</Animated.Text>
        </Pressable>
        <View style={styles.metaRow}>
          <KindChip kind={item.kind} />
          <Due value={item.due} />
          {item.anchor ? <AnchorChip anchor={item.anchor} onPress={onAnchor} /> : null}
        </View>
        {showSource && source ? (
          <Small numberOfLines={1} style={{ fontSize: 12 }}>
            from {source}
          </Small>
        ) : null}
      </View>
      {onEdit ? (
        <PressableScale onPress={onEdit} haptics="tap" hitSlop={10} accessibilityLabel="Edit task" style={styles.edit}>
          <Icon name="edit" size={13} color={palette.muted} />
        </PressableScale>
      ) : null}
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
  edit: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: -3, marginRight: -4 },
  task: { fontFamily: fontFamily.sans, fontSize: 15, lineHeight: 21 },
  taskDone: { textDecorationLine: "line-through", textDecorationColor: palette.muted },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: palette.panel },
  metaText: { fontFamily: fontFamily.sans, fontSize: 12, color: palette.inkSoft },
  metaMissing: { fontFamily: fontFamily.serifItalic, fontSize: 13, color: palette.muted },
  kind: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  kindText: { fontFamily: fontFamily.monoMedium, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: palette.ink },
});
