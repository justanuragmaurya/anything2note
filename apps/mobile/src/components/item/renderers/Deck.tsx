import { useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Flashcard, type FlashcardHandle } from "@/components/review/Flashcard";
import { Button, Small } from "@/components/ui";
import type { Flashcard as Card } from "@/lib/mock/types";

/** Item-scoped flashcards: same 3D card as Review, cycling through the deck. */
export function Deck({ cards, source }: { cards: Card[]; source: string }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width - 40, 420);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const ref = useRef<FlashcardHandle>(null);
  const card = cards[i % cards.length];
  if (!card) return null;
  return (
    <View style={{ alignItems: "center" }}>
      <Animated.View key={`${card.id}-${i}`} entering={ZoomIn.springify().damping(16).withInitialValues({ transform: [{ scale: 0.92 }] })}>
        <Flashcard
          ref={ref}
          card={card}
          index={i % cards.length}
          total={cards.length}
          width={w}
          source={source}
          onFlip={setFlipped}
          onRated={() => {
            setFlipped(false);
            setI((n) => n + 1);
          }}
        />
      </Animated.View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
        {(["again", "hard", "good", "easy"] as const).map((r) => (
          <Button key={r} size="sm" variant={r === "good" && flipped ? "red" : "ghost"} onPress={() => (flipped ? ref.current?.fling(r) : ref.current?.flip())}>
            {r[0]!.toUpperCase() + r.slice(1)}
          </Button>
        ))}
      </View>
      <Small style={{ marginTop: 10 }}>{flipped ? "Swipe right if you knew it, left to see it again" : "Tap the card to see the answer"}</Small>
    </View>
  );
}
