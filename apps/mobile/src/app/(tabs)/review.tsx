import { useRef, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { Flashcard, type FlashcardHandle, type Rating } from "@/components/review/Flashcard";
import { ArtPlaceholder, Body, Button, Display, Eyebrow, Mono, PressableScale, ProgressBar, Rise, Screen, SerifAccent, Small } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { DUE_CARDS, itemById } from "@/lib/mock/items";
import { fontFamily, palette } from "@/theme";

const RATINGS: { r: Rating; label: string; hint: string }[] = [
  { r: "again", label: "Again", hint: "<1m" },
  { r: "hard", label: "Hard", hint: "6m" },
  { r: "good", label: "Good", hint: "1d" },
  { r: "easy", label: "Easy", hint: "4d" },
];

export default function Review() {
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - 40, 420);
  const [queue, setQueue] = useState(DUE_CARDS);
  const [reviewed, setReviewed] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState<Record<Rating, number>>({ again: 0, hard: 0, good: 0, easy: 0 });
  const ref = useRef<FlashcardHandle>(null);

  const total = DUE_CARDS.length;
  const card = queue[0];

  const onRated = (r: Rating) => {
    setTally((t) => ({ ...t, [r]: t[r] + 1 }));
    setFlipped(false);
    setQueue((q) => {
      const [head, ...rest] = q;
      // "Again" puts the card back at the end of today's queue.
      return r === "again" && head ? [...rest, head] : rest;
    });
    if (r !== "again") setReviewed((n) => n + 1);
  };

  const rate = (r: Rating) => {
    if (!flipped) {
      ref.current?.flip();
      return;
    }
    haptic.select();
    ref.current?.fling(r);
  };

  const restart = () => {
    setQueue(DUE_CARDS);
    setReviewed(0);
    setTally({ again: 0, hard: 0, good: 0, easy: 0 });
  };

  return (
    <Screen>
      <Rise className="px-5 pt-4">
        <View style={styles.headRow}>
          <Eyebrow>{card ? `${queue.length} due today` : "Session complete"}</Eyebrow>
          <Mono>
            {reviewed}/{total}
          </Mono>
        </View>
        <Display size={40} style={{ marginTop: 6 }}>
          Daily <SerifAccent size={46}>review</SerifAccent>
        </Display>
        <ProgressBar value={reviewed / total} style={{ marginTop: 14 }} />
      </Rise>

      {card ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Animated.View key={card.id + queue.length} entering={ZoomIn.springify().damping(16).withInitialValues({ transform: [{ scale: 0.92 }] })}>
            <Flashcard
              ref={ref}
              card={card}
              index={reviewed}
              total={total}
              width={cardW}
              source={itemById(card.itemId)?.title ?? ""}
              onRated={onRated}
              onFlip={setFlipped}
            />
          </Animated.View>
        </View>
      ) : (
        <Animated.View entering={FadeInDown.springify()} style={styles.done}>
          <ArtPlaceholder id="empty-review" width={250} />
          <Display size={30} style={{ textAlign: "center", marginTop: 20 }}>
            All caught <SerifAccent size={34}>up</SerifAccent>.
          </Display>
          <Body style={{ textAlign: "center", marginTop: 6 }}>
            {tally.good + tally.easy} remembered · {tally.hard} hard · {tally.again} again. Next cards are due tomorrow.
          </Body>
          <Button variant="ghost" style={{ marginTop: 18, alignSelf: "center" }} leadingIcon="retry" onPress={restart}>
            Review again
          </Button>
        </Animated.View>
      )}

      {card ? (
        <Animated.View entering={FadeIn} style={styles.ratings}>
          {RATINGS.map(({ r, label, hint }) => {
            const primary = r === "good";
            return (
              <PressableScale
                key={r}
                onPress={() => rate(r)}
                haptics={false}
                scaleTo={0.94}
                style={[styles.rate, primary && flipped && styles.ratePrimary, !flipped && { opacity: 0.55 }]}
                accessibilityRole="button"
                accessibilityLabel={`${label}, next in ${hint}`}
              >
                <Small style={[styles.rateLabel, primary && flipped && { color: palette.cream }]}>{label}</Small>
                <Mono style={[{ fontSize: 10 }, primary && flipped && { color: palette.red100 }]}>{hint}</Mono>
              </PressableScale>
            );
          })}
        </Animated.View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  done: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  ratings: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 18 },
  rate: {
    flex: 1,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    backgroundColor: palette.card,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  ratePrimary: { backgroundColor: palette.red500, borderColor: palette.red700 },
  rateLabel: { fontFamily: fontFamily.sansMedium, color: palette.ink, fontSize: 14 },
});
