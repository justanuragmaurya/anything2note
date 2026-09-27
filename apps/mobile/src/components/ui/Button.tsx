import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { fontFamily, gradients, palette } from "@/theme";
import { Icon, type IconName } from "./Icon";
import { PressableScale } from "./PressableScale";

export type ButtonVariant = "red" | "ink" | "ghost" | "cream" | "night";
export type ButtonSize = "sm" | "md" | "lg";

type Props = {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  /** Icon before the label instead of after. */
  leadingIcon?: IconName;
  block?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 52 };
const FONT: Record<ButtonSize, number> = { sm: 13, md: 14, lg: 15 };

const FG: Record<ButtonVariant, string> = {
  red: palette.cream,
  ink: "#f6ece8",
  ghost: palette.ink,
  cream: palette.ink,
  night: palette.nightText,
};

/**
 * Pill button (`.btn`). Red and ink are top-lit gradients with a 1px dark border and a
 * top inner highlight line; ghost is outlined; cream sits on red or night panels.
 */
export function Button({
  children,
  onPress,
  variant = "red",
  size = "md",
  icon,
  leadingIcon,
  block,
  loading,
  disabled,
  style,
  accessibilityLabel,
}: Props) {
  const h = HEIGHT[size];
  const fg = FG[variant];
  const gradient = variant === "red" ? gradients.buttonRed : variant === "ink" ? gradients.buttonInk : null;

  const content = (
    <View style={[styles.row, { height: h - 2, paddingHorizontal: size === "sm" ? 14 : size === "lg" ? 24 : 18 }]}>
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {leadingIcon ? <Icon name={leadingIcon} size={FONT[size] + 2} color={fg} weight="semibold" /> : null}
          <Text numberOfLines={1} style={[styles.label, { color: fg, fontSize: FONT[size] }]}>
            {children}
          </Text>
          {icon ? <Icon name={icon} size={FONT[size]} color={fg} weight="semibold" /> : null}
        </>
      )}
    </View>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      haptics={variant === "red" ? "press" : "tap"}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        { height: h, borderRadius: h / 2 },
        variant === "red" && styles.redShadow,
        variant === "ink" && styles.inkShadow,
        variant === "ghost" && styles.ghost,
        variant === "cream" && styles.cream,
        variant === "night" && styles.night,
        gradient && { borderColor: variant === "red" ? palette.red700 : "#140b0a" },
        block && { alignSelf: "stretch" },
        style,
      ]}
    >
      {gradient ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: h / 2 }]} />
      ) : null}
      {gradient ? <View pointerEvents="none" style={[styles.highlight, { borderRadius: h / 2 }]} /> : null}
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: "transparent",
    overflow: "hidden",
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  label: { fontFamily: fontFamily.sansMedium, letterSpacing: -0.1 },
  /** Top inner highlight line (the CSS `inset 0 1px 1px rgba(255,255,255,.33)`). */
  highlight: {
    ...StyleSheet.absoluteFill,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.33)",
  },
  redShadow: {
    shadowColor: "#5a140a",
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  inkShadow: {
    shadowColor: "#1d1311",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ghost: { borderColor: palette.lineStrong, backgroundColor: "transparent" },
  cream: { backgroundColor: palette.cream, borderColor: palette.cream },
  night: { borderColor: "rgba(243, 226, 219, 0.24)", backgroundColor: "transparent" },
});
