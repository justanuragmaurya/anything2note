import { StyleSheet, Text, View } from "react-native";
import { fontFamily, noteTypeColor, palette, type NoteTypeKey } from "@/theme";
import { Icon, type IconName } from "./Icon";
import { PressableScale } from "./PressableScale";

type Props = {
  label: string;
  /** Note-type colour coding; omit for a neutral chip. */
  noteType?: NoteTypeKey;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
  size?: "sm" | "md";
  italic?: boolean;
};

/** Pill chip. With `noteType` it shows the type's colour as a dot (inactive) or fill (active). */
export function Chip({ label, noteType, active, onPress, icon, size = "md", italic }: Props) {
  const color = noteType ? noteTypeColor[noteType] : null;
  const h = size === "sm" ? 26 : 34;
  const bg = active ? (color ?? palette.ink) : palette.card;
  const fg = active && !color ? palette.cream : palette.ink;
  const body = (
    <View
      style={[
        styles.chip,
        { height: h, paddingHorizontal: size === "sm" ? 10 : 14, backgroundColor: bg },
        active ? { borderColor: color ? palette.ink : palette.ink } : null,
      ]}
    >
      {color && !active ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      {icon ? <Icon name={icon} size={12} color={active && !color ? palette.cream : palette.muted} /> : null}
      <Text
        style={[
          styles.label,
          { color: fg, fontSize: size === "sm" ? 12 : 13 },
          italic && { fontFamily: fontFamily.serifItalic, fontSize: size === "sm" ? 14 : 15 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableScale onPress={onPress} haptics="select" accessibilityRole="button" accessibilityState={{ selected: !!active }}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
  },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(42,14,12,0.25)" },
  label: { fontFamily: fontFamily.sansMedium, letterSpacing: -0.1 },
});
