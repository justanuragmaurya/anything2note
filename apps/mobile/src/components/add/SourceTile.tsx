import { StyleSheet, View } from "react-native";
import { Icon, Label, PressableScale, Small, type IconName } from "@/components/ui";
import { palette } from "@/theme";

type Props = { icon: IconName; title: string; hint: string; tint: string; onPress: () => void };

export function SourceTile({ icon, title, hint, tint, onPress }: Props) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.96} style={styles.tile} accessibilityRole="button" accessibilityLabel={title}>
      <View style={[styles.icon, { backgroundColor: tint }]}>
        <Icon name={icon} size={18} color={palette.ink} />
      </View>
      <View style={{ gap: 2, marginTop: 10 }}>
        <Label>{title}</Label>
        <Small numberOfLines={2}>{hint}</Small>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 108,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.card,
  },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
