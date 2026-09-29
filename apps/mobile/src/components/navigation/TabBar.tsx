import { StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Icon, PressableScale, type IconName } from "@/components/ui";
import { fontFamily, gradients, palette, spring } from "@/theme";

const META: Record<string, { label: string; icon: IconName }> = {
  library: { label: "Library", icon: "library" },
  add: { label: "Add", icon: "add" },
  review: { label: "Review", icon: "review" },
  tasks: { label: "Tasks", icon: "tasks" },
  profile: { label: "Profile", icon: "profile" },
};

function TabIcon({ focused, icon, label }: { focused: boolean; icon: IconName; label: string }) {
  const dot = useAnimatedStyle(() => ({
    opacity: withSpring(focused ? 1 : 0, spring),
    transform: [{ scale: withSpring(focused ? 1 : 0.2, spring) }],
  }));
  const color = focused ? palette.red500 : palette.muted;
  return (
    <View style={styles.item}>
      <Icon name={icon} size={22} color={color} weight={focused ? "semibold" : "regular"} />
      <Text style={[styles.label, { color: focused ? palette.ink : palette.muted }]}>{label}</Text>
      <Animated.View style={[styles.dot, dot]} />
    </View>
  );
}

/** Paper tab bar with a red active tint; "Add" is a raised red pill (the hero action). */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = META[route.name] ?? { label: route.name, icon: "more" as const };
        const onPress = () => {
          const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        if (route.name === "add") {
          return (
            <PressableScale key={route.key} onPress={onPress} haptics="press" scaleTo={0.92} style={styles.item} accessibilityRole="tab" accessibilityLabel="Add" accessibilityState={{ selected: focused }}>
              <View style={[styles.addBtn, focused && styles.addBtnOn]}>
                <LinearGradient colors={focused ? gradients.buttonInk : gradients.buttonRed} style={StyleSheet.absoluteFill} />
                <View style={styles.addHighlight} />
                <Icon name="add" size={22} color={palette.cream} weight="bold" />
              </View>
            </PressableScale>
          );
        }
        return (
          <PressableScale key={route.key} onPress={onPress} haptics="select" scaleTo={0.94} style={styles.item} accessibilityRole="tab" accessibilityLabel={meta.label} accessibilityState={{ selected: focused }}>
            <TabIcon focused={focused} icon={meta.icon} label={meta.label} />
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: palette.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.lineStrong,
    paddingTop: 8,
    paddingHorizontal: 6,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  label: { fontFamily: fontFamily.sansMedium, fontSize: 10.5, letterSpacing: 0 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: palette.red500, marginTop: 1 },
  addBtn: {
    width: 54,
    height: 38,
    borderRadius: 19,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.red700,
  },
  addBtnOn: { borderColor: "#140b0a" },
  addHighlight: { ...StyleSheet.absoluteFill, borderRadius: 19, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.33)" },
});
