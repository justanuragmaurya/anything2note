import { useRef, useState } from "react";
import { StyleSheet, View, useWindowDimensions, type ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { ArtPlaceholder, Body, Button, Display, Eyebrow, PressableScale, Rise, SerifAccent, type ArtId } from "@/components/ui";
import { usePreferences } from "@/lib/preferences";
import { palette } from "@/theme";

type Page = { art: ArtId; eyebrow: string; before: string; accent: string; after: string; body: string };

const PAGES: Page[] = [
  {
    art: "onboarding-1",
    eyebrow: "01 · Drop in anything",
    before: "Record, upload or paste ",
    accent: "anything",
    after: ".",
    body: "Lectures you record in class, PDFs, slides, web articles, whiteboard photos. If it has words, it becomes notes.",
  },
  {
    art: "onboarding-2",
    eyebrow: "02 · Pick the kind",
    before: "Notes shaped for ",
    accent: "what it is",
    after: ".",
    body: "Detailed notes, flashcards and deadlines for your lectures. Q&A breakdowns for interviews. Six note types in all.",
  },
  {
    art: "onboarding-3",
    eyebrow: "03 · Keep it",
    before: "Study it, ask it, ",
    accent: "remember",
    after: " it.",
    body: "Every line links back to the moment it was said. Chat with any item, review cards daily.",
  },
];

function Dot({ i, x, width }: { i: number; x: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const p = x.value / width;
    const d = Math.min(1, Math.abs(p - i));
    return {
      width: interpolate(d, [0, 1], [22, 7]),
      backgroundColor: d < 0.5 ? palette.red500 : palette.lineStrong,
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { finishOnboarding } = usePreferences();
  const x = useSharedValue(0);
  const [page, setPage] = useState(0);
  const ref = useRef<ScrollView>(null);
  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });

  const done = () => {
    finishOnboarding();
    router.replace("/sign-in");
  };
  const next = () => {
    if (page >= PAGES.length - 1) return done();
    ref.current?.scrollTo({ x: (page + 1) * width, animated: true });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.top}>
        <Eyebrow>anything2note</Eyebrow>
        <PressableScale onPress={done} hitSlop={12}>
          <Eyebrow color={palette.inkSoft}>Skip</Eyebrow>
        </PressableScale>
      </View>

      <Animated.ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}
      >
        {PAGES.map((p, i) => (
          <View key={p.art} style={{ width, paddingHorizontal: 24, justifyContent: "center" }}>
            <Rise index={i === 0 ? 0 : 0}>
              <ArtPlaceholder id={p.art} style={{ maxHeight: width * 0.78, alignSelf: "center" }} width={Math.min(width - 48, 340)} />
            </Rise>
            <Rise delay={120}>
              <Eyebrow style={{ marginTop: 32 }} color={palette.red600}>
                {p.eyebrow}
              </Eyebrow>
            </Rise>
            <Rise delay={180}>
              <Display size={40} style={{ marginTop: 12 }}>
                {p.before}
                <SerifAccent size={46}>{p.accent}</SerifAccent>
                {p.after}
              </Display>
            </Rise>
            <Rise delay={240}>
              <Body style={{ marginTop: 14, fontSize: 16, lineHeight: 24 }}>{p.body}</Body>
            </Rise>
          </View>
        ))}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((p, i) => (
            <Dot key={p.art} i={i} x={x} width={width} />
          ))}
        </View>
        <Button onPress={next} size="lg" icon={page === PAGES.length - 1 ? "arrowUpRight" : "arrowRight"}>
          {page === PAGES.length - 1 ? "Get started" : "Next"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.paper },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingVertical: 14 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 12 },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { height: 7, borderRadius: 4 },
});
