import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Switch, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Chip, Icon, Label, PressableScale, Small, type IconName } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import type { NoteTypeKey } from "@/lib/note-types";
import { palette, spring } from "@/theme";

function Shell({ icon, title, hint, right, onPress }: { icon: IconName; title: string; hint?: string; right: ReactNode; onPress?: () => void }) {
  const inner = (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Icon name={icon} size={16} color={palette.inkSoft} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Label>{title}</Label>
        {hint ? <Small>{hint}</Small> : null}
      </View>
      {right}
    </View>
  );
  if (!onPress) return inner;
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} haptics="select">
      {inner}
    </PressableScale>
  );
}

export function ToggleRow({ icon, title, hint, value, onChange }: { icon: IconName; title: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Shell
      icon={icon}
      title={title}
      hint={hint}
      right={
        <Switch
          value={value}
          onValueChange={(v) => {
            haptic.select();
            onChange(v);
          }}
          trackColor={{ false: palette.lineStrong, true: palette.red500 }}
          thumbColor={palette.cream}
          ios_backgroundColor={palette.lineStrong}
        />
      }
    />
  );
}

type Option<T extends string> = { value: T; label: string; noteType?: NoteTypeKey };

/** Row that expands an inline chip picker (accordion). */
export function SelectRow<T extends string>({ icon, title, value, options, onChange }: { icon: IconName; title: string; value: T; options: Option<T>[]; onChange: (v: T) => void }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: withSpring(open ? "180deg" : "0deg", spring) }] }));
  return (
    <Animated.View layout={LinearTransition.springify().damping(20)}>
      <Shell
        icon={icon}
        title={title}
        onPress={() => setOpen((o) => !o)}
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Small style={{ color: palette.inkSoft }}>{current?.label}</Small>
            <Animated.View style={chevron}>
              <Icon name="chevronDown" size={12} color={palette.muted} />
            </Animated.View>
          </View>
        }
      />
      {open ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingLeft: 58, paddingRight: 16, paddingBottom: 14 }}>
            {options.map((o) => (
              <Chip
                key={o.value}
                size="sm"
                label={o.label}
                noteType={o.noteType}
                active={o.value === value}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              />
            ))}
          </ScrollView>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export function LinkRow({ icon, title, hint, onPress, danger }: { icon: IconName; title: string; hint?: string; onPress: () => void; danger?: boolean }) {
  return <Shell icon={icon} title={title} hint={hint} onPress={onPress} right={<Icon name="forward" size={12} color={danger ? palette.red500 : palette.muted} />} />;
}

export const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, minHeight: 56 },
  icon: { width: 30, height: 30, borderRadius: 9, backgroundColor: palette.panel, alignItems: "center", justifyContent: "center" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.line, marginLeft: 58 },
});
