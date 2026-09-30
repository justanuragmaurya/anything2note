import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import type { StatsResponse } from "@a2n/shared";
import { TopBar } from "@/components/navigation/TopBar";
import { Body, Button, Card, Display, Eyebrow, H, Mono, PressableScale, Rise, Screen, SerifAccent, Skeleton, Small } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { useStats } from "@/lib/queries";
import { palette } from "@/theme";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKS = 26;
const GAP = 3;

/** One hue, light → dark, for review counts; no reviews is the paper panel. */
const HEAT = [palette.panel, palette.red100, palette.red200, palette.red400, palette.red600];

function heatStep(n: number, max: number) {
  if (n <= 0 || max <= 0) return 0;
  return Math.min(4, Math.ceil((n / max) * 4));
}

/** "Mon 3 Aug" for the heatmap cell `i` (last cell = today). */
function cellDate(i: number, total: number) {
  const d = new Date();
  d.setDate(d.getDate() - (total - 1 - i));
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card style={{ flex: 1, gap: 4 }}>
      <Eyebrow>{label}</Eyebrow>
      <Display size={30}>{value}</Display>
      {hint ? <Small numberOfLines={2}>{hint}</Small> : null}
    </Card>
  );
}

function Heatmap({ heatmap, width }: { heatmap: number[]; width: number }) {
  const [picked, setPicked] = useState<number | null>(null);
  const cells = heatmap.slice(-WEEKS * 7);
  const max = Math.max(0, ...cells);
  const size = Math.floor((width - GAP * (WEEKS - 1)) / WEEKS);
  const total = cells.reduce((a, b) => a + b, 0);
  return (
    <View accessible accessibilityLabel={`${total} reviews in the last ${WEEKS} weeks`}>
      <View style={{ flexDirection: "row", gap: GAP }}>
        {Array.from({ length: WEEKS }, (_, w) => (
          <View key={w} style={{ gap: GAP }}>
            {Array.from({ length: 7 }, (_, d) => {
              const i = w * 7 + d;
              const n = cells[i] ?? 0;
              return (
                <PressableScale
                  key={d}
                  haptics="select"
                  scaleTo={0.8}
                  hitSlop={2}
                  onPress={() => setPicked(picked === i ? null : i)}
                  style={{
                    width: size,
                    height: size,
                    borderRadius: 3,
                    backgroundColor: HEAT[heatStep(n, max)],
                    borderWidth: picked === i ? 1.5 : 0,
                    borderColor: palette.ink,
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.heatFoot}>
        <Small>
          {picked !== null ? `${cellDate(picked, cells.length)} · ${cells[picked] ?? 0} reviews` : `${total.toLocaleString()} reviews in ${WEEKS} weeks`}
        </Small>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Small style={{ fontSize: 11 }}>Less</Small>
          {HEAT.map((c) => (
            <View key={c} style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: c }} />
          ))}
          <Small style={{ fontSize: 11 }}>More</Small>
        </View>
      </View>
    </View>
  );
}

function Weekly({ weekly }: { weekly: number[] }) {
  const max = Math.max(1, ...weekly);
  const today = (new Date().getDay() + 6) % 7;
  return (
    <View style={styles.bars} accessible accessibilityLabel={`This week: ${weekly.map((n, i) => `${DAYS[i]} ${n}`).join(", ")}`}>
      {weekly.map((n, i) => (
        <View key={i} style={{ flex: 1, alignItems: "center", gap: 6 }}>
          <Mono style={{ fontSize: 11, color: n ? palette.inkSoft : palette.muted }}>{n}</Mono>
          <View style={styles.barTrack}>
            <View style={[styles.bar, { height: `${Math.max(n ? 6 : 0, (n / max) * 100)}%`, backgroundColor: i === today ? palette.red500 : palette.ink }]} />
          </View>
          <Small style={{ fontSize: 11, color: i === today ? palette.red600 : palette.muted }}>{DAYS[i]}</Small>
        </View>
      ))}
    </View>
  );
}

function Content({ s, width }: { s: StatsResponse; width: number }) {
  const change = s.cardsReviewedThisMonth - s.cardsReviewedLastMonth;
  return (
    <>
      <Rise delay={60} style={{ flexDirection: "row", gap: 10 }}>
        <Tile label="Streak" value={`${s.streak}`} hint={s.streak === 1 ? "day" : "days in a row"} />
        <Tile
          label="This month"
          value={s.cardsReviewedThisMonth.toLocaleString()}
          hint={s.cardsReviewedLastMonth || change ? `${change >= 0 ? "+" : "−"}${Math.abs(change).toLocaleString()} on last month` : "cards reviewed"}
        />
        <Tile label="Quiz" value={s.quizAccuracy === null ? "—" : `${Math.round(s.quizAccuracy)}%`} hint={s.quizAccuracy === null ? "No quizzes yet" : "answered right"} />
      </Rise>

      <Rise delay={120}>
        <Card style={{ gap: 14, marginTop: 14 }}>
          <H level={3}>Reviews</H>
          <Heatmap heatmap={s.heatmap} width={width - 32} />
        </Card>
      </Rise>

      <Rise delay={160}>
        <Card style={{ gap: 14, marginTop: 14 }}>
          <H level={3}>This week</H>
          <Weekly weekly={s.weekly} />
        </Card>
      </Rise>

      <Rise delay={200}>
        <Card style={{ gap: 12, marginTop: 14 }}>
          <H level={3}>Weak topics</H>
          {s.weakTopics.length ? (
            s.weakTopics.map((t) => {
              // Accuracy is a percentage (0–100), like quizAccuracy.
              const pct = Math.round(t.accuracy);
              return (
                <View key={`${t.topic}-${t.item}`} style={styles.topic}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Body style={{ fontSize: 15, color: palette.ink }} numberOfLines={1}>
                      {t.topic}
                    </Body>
                    <Small numberOfLines={1}>{t.item}</Small>
                  </View>
                  <Mono style={{ fontSize: 12, color: pct < 50 ? palette.red600 : palette.inkSoft }}>{pct}%</Mono>
                </View>
              );
            })
          ) : (
            <Small>Nothing stands out yet. Topics you often miss in reviews and quizzes show up here.</Small>
          )}
        </Card>
      </Rise>
    </>
  );
}

/** Streak, reviews over time, quiz accuracy and the topics worth another look. */
export default function Stats() {
  const { width } = useWindowDimensions();
  const stats = useStats();
  const [refreshing, setRefreshing] = useState(false);
  const cardWidth = Math.min(width, 560) - 40;

  const refresh = async () => {
    setRefreshing(true);
    await stats.refetch();
    setRefreshing(false);
  };

  return (
    <Screen>
      <TopBar title="Stats" />
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <Display size={38}>
          How it&apos;s <SerifAccent size={44}>sticking</SerifAccent>
        </Display>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.red500} colors={[palette.red500]} />}
      >
        {stats.data ? (
          <Content s={stats.data} width={cardWidth} />
        ) : stats.isError ? (
          <Rise style={{ alignItems: "center", paddingTop: 40 }}>
            <Body style={{ textAlign: "center" }}>{errorMessage(stats.error)}</Body>
            <Button style={{ marginTop: 16 }} variant="ink" leadingIcon="refresh" loading={stats.isFetching} onPress={() => void stats.refetch()}>
              Try again
            </Button>
          </Rise>
        ) : (
          <View style={{ gap: 14 }}>
            <Skeleton height={110} radius={24} />
            <Skeleton height={190} radius={24} />
            <Skeleton height={150} radius={24} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heatFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 8 },
  bars: { flexDirection: "row", gap: 8, height: 130 },
  barTrack: { flex: 1, width: "70%", justifyContent: "flex-end" },
  bar: { width: "100%", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  topic: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
});
