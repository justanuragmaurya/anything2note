import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { palette, radius } from "@/theme";

type Props = { children?: ReactNode; style?: StyleProp<ViewStyle>; className?: string; padded?: boolean };

/** Paper card: `card` fill, `line` border, 24pt radius. */
export function Card({ children, style, padded = true, className }: Props) {
  return (
    <View className={className} style={[styles.card, padded && { padding: 16 }, style]}>
      {children}
    </View>
  );
}

/**
 * Yield-style nested card: outer `panel` shell (46pt radius, 14pt padding) around an
 * inner `card` (34pt radius). Pass `inner={false}` to render children straight in the shell.
 */
export function NestedCard({ children, style, innerStyle, inner = true }: Props & { innerStyle?: StyleProp<ViewStyle>; inner?: boolean }) {
  return (
    <View style={[styles.outer, style]}>
      {inner ? <View style={[styles.inner, innerStyle]}>{children}</View> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.lg,
    shadowColor: "#3c140a",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
  },
  outer: {
    backgroundColor: palette.panel,
    borderColor: palette.lineStrong,
    borderWidth: 1,
    borderRadius: 40,
    padding: 10,
  },
  inner: {
    backgroundColor: palette.card,
    borderRadius: 30,
    padding: 22,
    shadowColor: "#3c140a",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
  },
});
