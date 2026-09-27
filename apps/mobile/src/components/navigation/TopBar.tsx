import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Eyebrow, Icon, PressableScale, type IconName } from "@/components/ui";
import { palette } from "@/theme";

type Props = { title?: string; tone?: "paper" | "night"; icon?: IconName; onBack?: () => void; right?: ReactNode };

/** Compact bar for pushed screens: round back button, mono title, optional right slot. */
export function TopBar({ title, tone = "paper", icon = "back", onBack, right }: Props) {
  const night = tone === "night";
  return (
    <View style={styles.bar}>
      <PressableScale
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/library")))}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={[styles.back, night ? styles.backNight : styles.backPaper]}
      >
        <Icon name={icon} size={15} color={night ? palette.nightText : palette.ink} weight="semibold" />
      </PressableScale>
      {title ? (
        <Eyebrow numberOfLines={1} color={night ? palette.nightMuted : palette.muted} style={{ flex: 1, textAlign: "center" }}>
          {title}
        </Eyebrow>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={{ minWidth: 36, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, height: 52 },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  backPaper: { borderColor: palette.lineStrong, backgroundColor: palette.card },
  backNight: { borderColor: palette.nightLine, backgroundColor: palette.night2 },
});
