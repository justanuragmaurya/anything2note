import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette } from "@/theme";

type Props = { children: ReactNode; tone?: "paper" | "night"; edges?: ("top" | "bottom")[]; style?: StyleProp<ViewStyle> };

/** Full-bleed screen background (paper by default) that pads for the safe area. */
export function Screen({ children, tone = "paper", edges = ["top"], style }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: tone === "paper" ? palette.paper : palette.night,
          paddingTop: edges.includes("top") ? insets.top : 0,
          paddingBottom: edges.includes("bottom") ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
