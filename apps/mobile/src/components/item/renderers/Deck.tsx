import { useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import type { Flashcard as Card } from "@a2n/shared";
import { Flashcard, type FlashcardHandle } from "@/components/review/Flashcard";
import { Button, Small } from "@/components/ui";

/**
 * Item-scoped flashcards to flip through. Practice only: spaced-repetition ratings are
 * recorded in the Review tab, which schedules these same cards.
 */
export function Deck({ cards, source, tint }: { cards: Card[]; source: string; tint?: string }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width - 40, 420);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const ref = useRef<FlashcardHandle>(null);
  const card = cards[i % cards.length];
  if (!card) return null;
  const next = () => {
    setFlipped(false);
    setI((n) => n + 1);
  };
  return (
    <View style={{ alignItems: "center" }}>
      <Animated.View key={`${card.id}-${i}`} entering={ZoomIn.springify().damping(16).withInitialValues({ transform: [{ scale: 0.92 }] })}>
        <Flashcard
          ref={ref}
          card={card}
          index={i % cards.length}
          total={cards.length}
          width={w}
          height={Math.round(w * 0.78)}
          source={source}
          tint={tint}
          stamps={false}
          backHint="Swipe for the next card"
          onFlip={setFlipped}
          onRated={next}
        />
      </Animated.View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
        <Button size="sm" variant="ghost" leadingIcon="refresh" onPress={() => ref.current?.flip()}>
          {flipped ? "Show question" : "Show answer"}
        </Button>
        <Button size="sm" variant={flipped ? "red" : "ghost"} icon="arrowRight" onPress={() => ref.current?.fling("good")}>
          Next card
        </Button>
      </View>
      <Small style={{ marginTop: 12, textAlign: "center" }}>Rate these cards in Review to schedule them.</Small>
    </View>
  );
}
