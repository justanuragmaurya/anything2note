import { forwardRef, useImperativeHandle } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import type { Anchor, Flashcard as Card, Rating } from "@a2n/shared";
import { AnchorChip, Body, Eyebrow, SerifAccent, Small } from "@/components/ui";
import { palette, spring } from "@/theme";

export type { Rating };
export type FlashcardHandle = { fling: (r: Rating) => void; flip: () => void };

type Props = {
  card: Pick<Card, "front" | "back" | "anchor">;
  index: number;
  total: number;
  source: string;
  onRated: (r: Rating) => void;
  /** Where tapping the card's source chip goes (the item screen provides its own). */
  onAnchor?: (a: Anchor) => void;
  /** Front colour; the note type's by default at the call site. */
  tint?: string;
  /** Footer hint on the answer side. */
  backHint?: string;
  /** Show the Good / Again stamps while swiping (off when swipes aren't ratings). */
  stamps?: boolean;
  onFlip?: (flipped: boolean) => void;
  width: number;
  /** Defaults to a tall 1 : 1.12 card. */
  height?: number;
};

const SWIPE = 110;

/**
 * 3D flip card (rotateY with backface hidden). Tap flips; once flipped, swipe
 * right = Good, left = Again, up = Easy. Buttons call `fling` via the ref.
 */
export const Flashcard = forwardRef<FlashcardHandle, Props>(function Flashcard(
  { card, index, total, source, onRated, onAnchor, tint, backHint = "Swipe or rate below", stamps = true, onFlip, width, height },
  ref,
) {
  const rot = useSharedValue(0); // 0 front, 180 back
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const flipped = useSharedValue(false);

  const flip = () => {
    const next = !flipped.get();
    flipped.set(next);
    rot.set(withSpring(next ? 180 : 0, { damping: 16, stiffness: 140, mass: 1 }));
    onFlip?.(next);
  };

  const fling = (r: Rating) => {
    const dx = r === "again" ? -1 : r === "hard" ? -0.6 : r === "good" ? 1 : 0.2;
    const dy = r === "easy" ? -1.4 : r === "hard" ? 0.3 : 0;
    tx.set(withTiming(dx * width * 1.3, { duration: 260 }));
    ty.set(
      withTiming(dy * width, { duration: 260 }, (fin) => {
        if (fin) scheduleOnRN(onRated, r);
      }),
    );
  };

  useImperativeHandle(ref, () => ({ fling, flip }));

  const pan = Gesture.Pan()
    .onChange((e) => {
      tx.set(e.translationX);
      ty.set(Math.min(0, e.translationY) * 0.8);
    })
    .onEnd((e) => {
      if (!flipped.get()) {
        tx.set(withSpring(0, spring));
        ty.set(withSpring(0, spring));
        return;
      }
      if (e.translationX > SWIPE) scheduleOnRN(fling, "good");
      else if (e.translationX < -SWIPE) scheduleOnRN(fling, "again");
      else if (e.translationY < -SWIPE) scheduleOnRN(fling, "easy");
      else {
        tx.set(withSpring(0, spring));
        ty.set(withSpring(0, spring));
      }
    });
  const tap = Gesture.Tap().onEnd(() => scheduleOnRN(flip));
  const gesture = Gesture.Exclusive(pan, tap);

  const wrap = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { rotateZ: `${interpolate(tx.value, [-width, width], [-12, 12])}deg` }],
  }));
  const front = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${rot.value}deg` }],
    opacity: rot.value > 90 ? 0 : 1,
  }));
  const back = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${rot.value + 180}deg` }],
    opacity: rot.value > 90 ? 1 : 0,
  }));
  const goodHint = useAnimatedStyle(() => ({ opacity: interpolate(tx.value, [20, SWIPE], [0, 1], "clamp") }));
  const againHint = useAnimatedStyle(() => ({ opacity: interpolate(tx.value, [-SWIPE, -20], [1, 0], "clamp") }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height: height ?? width * 1.12 }, wrap]}>
        <Animated.View style={[styles.face, styles.front, tint ? { backgroundColor: tint } : null, front]}>
          <Eyebrow color={alphaInk}>
            Card {index + 1} / {total}
          </Eyebrow>
          <SerifAccent upright color={palette.ink} size={30} style={{ lineHeight: 36 }} numberOfLines={7} adjustsFontSizeToFit minimumFontScale={0.6}>
            {card.front}
          </SerifAccent>
          <View style={styles.footer}>
            <Small style={{ color: alphaInk }}>Tap to flip</Small>
            <Eyebrow color={alphaInk} numberOfLines={1} style={{ maxWidth: "60%" }}>
              {source}
            </Eyebrow>
          </View>
        </Animated.View>

        <Animated.View style={[styles.face, styles.back, back]}>
          <Eyebrow color={palette.nightMuted}>Answer</Eyebrow>
          <Body style={{ color: palette.nightText, fontSize: 20, lineHeight: 28 }} numberOfLines={9} adjustsFontSizeToFit minimumFontScale={0.6}>{card.back}</Body>
          <View style={styles.footer}>
            {card.anchor ? <AnchorChip anchor={card.anchor} onPress={onAnchor} tone="night" /> : <View />}
            <Small style={{ color: palette.nightMuted }}>{backHint}</Small>
          </View>
        </Animated.View>

        {stamps ? (
          <>
            <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampGood, goodHint]}>
              <Eyebrow color={palette.success}>Good</Eyebrow>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampAgain, againHint]}>
              <Eyebrow color={palette.red600}>Again</Eyebrow>
            </Animated.View>
          </>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
});

const alphaInk = "rgba(42,14,12,0.6)";

const styles = StyleSheet.create({
  face: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    padding: 24,
    justifyContent: "space-between",
    backfaceVisibility: "hidden",
    shadowColor: "#3c140a",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  front: { backgroundColor: palette.lecture },
  back: { backgroundColor: palette.night },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stamp: { position: "absolute", top: 22, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5, backgroundColor: palette.card },
  stampGood: { left: 22, borderColor: palette.success, transform: [{ rotate: "-8deg" }] },
  stampAgain: { right: 22, borderColor: palette.red500, transform: [{ rotate: "8deg" }] },
});
