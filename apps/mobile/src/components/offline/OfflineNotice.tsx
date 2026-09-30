import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { Small } from "@/components/ui";
import { useOnline, useQueuedChanges } from "@/lib/offline";
import { palette } from "@/theme";

/**
 * Small pill above the tab bar while there's no connection (or queued changes are still going
 * out). Touches pass straight through it.
 */
export function OfflineNotice() {
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const queued = useQueuedChanges();
  if (online && queued === 0) return null;
  const label = online
    ? `Syncing ${queued} ${queued === 1 ? "change" : "changes"}…`
    : queued
      ? `Offline · ${queued} ${queued === 1 ? "change" : "changes"} will sync`
      : "Offline · changes will sync";
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { justifyContent: "flex-end", alignItems: "center", paddingBottom: Math.max(insets.bottom, 10) + 70 }]}>
      <Animated.View entering={FadeInDown.springify().damping(16)} exiting={FadeOutDown.duration(160)} style={styles.pill} accessibilityLiveRegion="polite">
        <View style={[styles.dot, { backgroundColor: online ? palette.success : palette.red400 }]} />
        <Small style={{ color: palette.cream, fontSize: 12 }}>{label}</Small>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: palette.ink,
    shadowColor: "#3c140a",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
