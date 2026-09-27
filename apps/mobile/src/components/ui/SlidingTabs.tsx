import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { fontFamily, palette, spring } from "@/theme";
import { PressableScale } from "./PressableScale";

export type TabItem<T extends string> = { value: T; label: string; badge?: string | number };
type Tone = "paper" | "ink" | "night";

type Props<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  tone?: Tone;
  size?: "sm" | "md";
  /** Horizontally scrollable row (item output tabs); keeps the active tab in view. */
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TONES: Record<Tone, { track: string; indicator: string; active: string; idle: string; border: string }> = {
  paper: { track: palette.panel, indicator: palette.card, active: palette.ink, idle: palette.muted, border: palette.line },
  ink: { track: palette.panel, indicator: palette.ink, active: palette.cream, idle: palette.inkSoft, border: palette.line },
  night: { track: palette.night3, indicator: palette.cream, active: palette.ink, idle: palette.nightMuted, border: palette.nightLine },
};

/** Pill tabs with a spring-animated indicator (`<SlidingTabs>` on web). */
export function SlidingTabs<T extends string>({ items, value, onChange, tone = "paper", size = "md", scrollable, style }: Props<T>) {
  const c = TONES[tone];
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);
  const h = size === "sm" ? 32 : 40;

  const active = layouts[value];
  useEffect(() => {
    if (!active) return;
    x.set(withSpring(active.x, spring));
    w.set(withSpring(active.width, spring));
    if (scrollable) scrollRef.current?.scrollTo({ x: Math.max(0, active.x - 40), animated: true });
  }, [active, scrollable, w, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: w.value }));

  const onItemLayout = (v: T) => (e: LayoutChangeEvent) => {
    const { x: lx, width } = e.nativeEvent.layout;
    setLayouts((prev) => (prev[v]?.x === lx && prev[v]?.width === width ? prev : { ...prev, [v]: { x: lx, width } }));
  };

  const row = (
    <View style={[styles.track, { backgroundColor: c.track, borderColor: c.border, height: h + 8 }, !scrollable && style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          { height: h, borderRadius: h / 2, backgroundColor: c.indicator, opacity: active ? 1 : 0 },
          tone === "paper" && styles.indicatorShadow,
          indicator,
        ]}
      />
      {items.map((it) => {
        const on = it.value === value;
        return (
          <PressableScale
            key={it.value}
            haptics="select"
            scaleTo={0.96}
            onLayout={onItemLayout(it.value)}
            onPress={() => onChange(it.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.item, { height: h, paddingHorizontal: size === "sm" ? 12 : 16 }]}
          >
            <Text style={[styles.label, { color: on ? c.active : c.idle, fontSize: size === "sm" ? 12.5 : 14 }]}>{it.label}</Text>
            {it.badge !== undefined ? (
              <View style={[styles.badge, { backgroundColor: on ? palette.red500 : c.border }]}>
                <Text style={[styles.badgeText, { color: on ? palette.cream : c.idle }]}>{it.badge}</Text>
              </View>
            ) : null}
          </PressableScale>
        );
      })}
    </View>
  );

  if (!scrollable) return row;
  return (
    <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} style={style} contentContainerStyle={{ paddingHorizontal: 20 }}>
      {row}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
  },
  indicator: { position: "absolute", left: 0, top: 3 },
  indicatorShadow: {
    shadowColor: "#3c140a",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  label: { fontFamily: fontFamily.sansMedium, letterSpacing: -0.1 },
  badge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { fontFamily: fontFamily.mono, fontSize: 10 },
});
