import { useRef, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import type { Anchor, ReviewCard } from "@a2n/shared";
import { Flashcard, type FlashcardHandle, type Rating } from "@/components/review/Flashcard";
import { ArtPlaceholder, Body, Button, Display, Eyebrow, Icon, Mono, PressableScale, ProgressBar, Rise, Screen, SerifAccent, Skeleton, Small } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { fmtUntil } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { noteType } from "@/lib/note-types";
import { useDueCards, useMe, useRateCard } from "@/lib/queries";
import { fontFamily, palette } from "@/theme";

const RATINGS: { r: Rating; label: string }[] = [
  { r: "again", label: "Again" },
  { r: "hard", label: "Hard" },
  { r: "good", label: "Good" },
  { r: "easy", label: "Easy" },
];

const openAt = (itemId: string, a: Anchor) =>
  router.push({ pathname: "/item/[id]", params: a.kind === "time" ? { id: itemId, t: String(a.at) } : { id: itemId, p: String(a.page) } });

export default function Review() {
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - 40, 420);
  const due = useDueCards();
  const me = useMe();
  const rate = useRateCard();
  const [session, setSession] = useState<ReviewCard[] | null>(null);
  const [queue, setQueue] = useState<ReviewCard[]>([]);
  const [reviewed, setReviewed] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState<Record<Rating, number>>({ again: 0, hard: 0, good: 0, easy: 0 });
  const [nextDue, setNextDue] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const ref = useRef<FlashcardHandle>(null);

  const [adopted, setAdopted] = useState(0);
  // A session is the due cards as loaded; a refetch (e.g. coming back to the tab) only starts a new
  // one when there's nothing left to review, so it never reshuffles a session in progress.
  if (due.data && due.dataUpdatedAt !== adopted && (session === null || (queue.length === 0 && due.data.cards.length > 0))) {
    setAdopted(due.dataUpdatedAt);
    setSession(due.data.cards);
    setQueue(due.data.cards);
    setReviewed(0);
    setNextDue(null);
    setTally({ again: 0, hard: 0, good: 0, easy: 0 });
  }

  const total = session?.length ?? 0;
  const card = queue[0];
  // A new account has no cards at all, which is different from finishing today's session.
  const empty = session !== null && total === 0;

  const onRated = (r: Rating) => {
    const head = queue[0];
    if (!head) return;
    setTally((t) => ({ ...t, [r]: t[r] + 1 }));
    setFlipped(false);
    setQueue((q) => {
      const [first, ...rest] = q;
      // "Again" also puts the card back at the end of today's queue.
      return r === "again" && first ? [...rest, first] : rest;
    });
    if (r !== "again") setReviewed((n) => n + 1);
    setSaveError(null);
    rate.mutate(
      { cardId: head.id, rating: r },
      {
        onSuccess: ({ nextDue: at }) => {
          if (r !== "again") setNextDue((n) => (n === null ? at : Math.min(n, at)));
        },
        onError: (e) => setSaveError(`That rating wasn't saved: ${errorMessage(e)}`),
      },
    );
  };

  const press = (r: Rating) => {
    if (!flipped) {
      ref.current?.flip();
      return;
    }
    haptic.select();
    ref.current?.fling(r);
  };

  /** Asks the server what's due now; anything new starts a fresh session (above). */
  const reload = () => void due.refetch();

  const streak = me.data?.streak ?? 0;

  return (
    <Screen>
      <Rise className="px-5 pt-4">
        <View style={styles.headRow}>
          <Eyebrow>
            {session === null
              ? due.isError
                ? "Offline"
                : "Loading…"
              : card
                ? `${queue.length} due today`
                : empty
                  ? "Nothing due"
                  : "Session complete"}
            {streak ? ` · ${streak}-day streak` : ""}
          </Eyebrow>
          {session && !empty ? (
            <Mono>
              {reviewed}/{total}
            </Mono>
          ) : null}
        </View>
        <View style={styles.titleRow}>
          <Display size={40} style={{ marginTop: 6 }}>
            Daily <SerifAccent size={46}>review</SerifAccent>
          </Display>
          <PressableScale onPress={() => router.push("/stats")} style={styles.statsBtn} accessibilityRole="button" accessibilityLabel="Your stats">
            <Icon name="bolt" size={13} color={palette.red600} />
            <Small style={{ color: palette.ink, fontSize: 13 }}>Stats</Small>
          </PressableScale>
        </View>
        <ProgressBar value={total ? reviewed / total : 0} style={{ marginTop: 14 }} />
        {saveError ? <Small style={{ color: palette.red600, marginTop: 8 }}>{saveError}</Small> : null}
      </Rise>

      {session === null ? (
        due.isError ? (
          <View style={styles.done}>
            <Display size={26} style={{ textAlign: "center" }}>
              Couldn&apos;t load your <SerifAccent size={30}>cards</SerifAccent>.
            </Display>
            <Body style={{ textAlign: "center", marginTop: 8 }}>{errorMessage(due.error)}</Body>
            <Button style={{ marginTop: 18, alignSelf: "center" }} variant="ink" leadingIcon="refresh" loading={due.isFetching} onPress={() => void due.refetch()}>
              Try again
            </Button>
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Skeleton width={cardW} height={cardW * 1.12} radius={24} />
          </View>
        )
      ) : card ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Animated.View key={card.id + queue.length} entering={ZoomIn.springify().damping(16).withInitialValues({ transform: [{ scale: 0.92 }] })}>
            <Flashcard
              ref={ref}
              card={card}
              index={reviewed}
              total={total}
              width={cardW}
              source={card.itemTitle}
              tint={noteType(card.noteType).color}
              onAnchor={(a) => openAt(card.itemId, a)}
              onRated={onRated}
              onFlip={setFlipped}
            />
          </Animated.View>
        </View>
      ) : empty ? (
        <Animated.View entering={FadeInDown.springify()} style={styles.done}>
          <ArtPlaceholder id="empty-review" width={250} />
          <Display size={30} style={{ textAlign: "center", marginTop: 20 }}>
            No cards <SerifAccent size={34}>due</SerifAccent>.
          </Display>
          <Body style={{ textAlign: "center", marginTop: 6 }}>
            Flashcards from your notes land here when they&apos;re due, so you remember what you learned.
          </Body>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 18, alignSelf: "center" }}>
            <Button variant="ghost" leadingIcon="refresh" loading={due.isFetching} onPress={reload}>
              Check again
            </Button>
            <Button icon="add" onPress={() => router.navigate("/add")}>
              Add something
            </Button>
          </View>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.springify()} style={styles.done}>
          <ArtPlaceholder id="empty-review" width={250} />
          <Display size={30} style={{ textAlign: "center", marginTop: 20 }}>
            All caught <SerifAccent size={34}>up</SerifAccent>.
          </Display>
          <Body style={{ textAlign: "center", marginTop: 6 }}>
            {tally.good + tally.easy} remembered · {tally.hard} hard · {tally.again} again.
            {nextDue ? ` The next of these comes back ${fmtUntil(nextDue)}.` : ""}
          </Body>
          <Button variant="ghost" style={{ marginTop: 18, alignSelf: "center" }} leadingIcon="refresh" loading={due.isFetching} onPress={reload}>
            Check for more
          </Button>
        </Animated.View>
      )}

      {card ? (
        <Animated.View entering={FadeIn} style={styles.ratings}>
          {RATINGS.map(({ r, label }) => {
            const primary = r === "good";
            return (
              <PressableScale
                key={r}
                onPress={() => press(r)}
                haptics={false}
                scaleTo={0.94}
                style={[styles.rate, primary && flipped && styles.ratePrimary, !flipped && { opacity: 0.55 }]}
                accessibilityRole="button"
                accessibilityLabel={label}
              >
                <Small style={[styles.rateLabel, primary && flipped && { color: palette.cream }]}>{label}</Small>
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
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  statsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    backgroundColor: palette.card,
  },
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
