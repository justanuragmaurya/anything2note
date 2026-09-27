import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const ok = Platform.OS === "ios" || Platform.OS === "android";

/** Fire-and-forget haptics; no-ops on web. */
export const haptic = {
  tap: () => {
    if (ok) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  press: () => {
    if (ok) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  heavy: () => {
    if (ok) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },
  select: () => {
    if (ok) void Haptics.selectionAsync();
  },
  success: () => {
    if (ok) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  warn: () => {
    if (ok) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
};
