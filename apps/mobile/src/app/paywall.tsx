import { useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { TopBar } from "@/components/navigation/TopBar";
import { NightDots } from "@/components/note-type/NoteTypeShape";
import { Button, CornerFrame, Display, Eyebrow, Icon, Rise, SerifAccent, SlidingTabs, Small } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { useSession } from "@/lib/session";
import { fontFamily, palette } from "@/theme";

type Period = "monthly" | "yearly";
type Region = "in" | "intl";

// Placeholder prices, same as the web pricing section (plan.md §8 leaves numbers open).
const PRICES = { in: { monthly: 199, yearly: 1499, symbol: "₹" }, intl: { monthly: 12, yearly: 96, symbol: "$" } } as const;

const PRO = [
  "2,000 media minutes / month",
  "2,000 document pages / month",
  "Up to 5 hours per recording",
  "Speaker labels for meetings & interviews",
  "Generous AI chat",
  "PDF, DOCX & Anki export + share links",
];

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { upgrade } = useSession();
  const [period, setPeriod] = useState<Period>("yearly");
  const [region, setRegion] = useState<Region>("intl");
  const [busy, setBusy] = useState(false);
  const p = PRICES[region];
  const value = period === "monthly" ? p.monthly : p.yearly;

  const buy = () => {
    setBusy(true);
    setTimeout(() => {
      haptic.success();
      upgrade();
      router.back();
    }, 900);
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.night }}>
      <StatusBar style="light" />
      <NightDots width={width} height={420} />
      <LinearGradient colors={["rgba(229,55,43,0.28)", "transparent"]} style={[StyleSheet.absoluteFill, { height: 380 }]} />
      <View style={{ paddingTop: Math.max(insets.top - 30, 6) }}>
        <TopBar tone="night" icon="close" />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 24 }}>
        <Rise style={{ paddingHorizontal: 4 }}>
          <Eyebrow color={palette.red300}>anything2note Pro</Eyebrow>
          <Display size={40} color={palette.nightText} style={{ marginTop: 8 }}>
            Notes for the <SerifAccent size={46} color={palette.red400}>whole</SerifAccent> semester.
          </Display>
        </Rise>

        <Rise delay={60} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
          <SlidingTabs
            tone="night"
            value={period}
            onChange={setPeriod}
            items={[
              { value: "monthly", label: "Monthly" },
              { value: "yearly", label: "Yearly −33%" },
            ]}
          />
          <SlidingTabs
            tone="night"
            size="sm"
            value={region}
            onChange={setRegion}
            items={[
              { value: "in", label: "India" },
              { value: "intl", label: "Everywhere else" },
            ]}
          />
        </Rise>

        {/* Web Pro card, inside a night corner frame */}
        <Rise delay={120} style={{ marginTop: 20 }}>
          <CornerFrame tone="night" style={{ padding: 8, borderRadius: 2 }}>
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <LinearGradient colors={["#ffd2b8", palette.red400, palette.red600]} start={{ x: 0.3, y: 0.3 }} end={{ x: 1, y: 1 }} style={styles.orb} />
                <View style={styles.popular}>
                  <Small style={{ fontSize: 11, color: palette.inkSoft }}>✦ Most popular</Small>
                </View>
              </View>
              <Text style={styles.planName}>Pro</Text>
              <Small>For semesters, sprints and research projects.</Small>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{p.symbol}</Text>
                <Animated.Text key={`${region}-${period}`} entering={FadeInDown.duration(300)} style={styles.price}>
                  {value.toLocaleString("en-IN")}
                </Animated.Text>
                <Text style={[styles.price, { color: palette.lineStrong }]}>.00</Text>
                <Small style={{ marginLeft: 6, marginBottom: 8 }}>/{period === "monthly" ? "month" : "year"}</Small>
              </View>
              <Small style={{ fontSize: 12 }}>
                {period === "yearly" ? `That's ${p.symbol}${Math.round(p.yearly / 12)}/month, billed yearly.` : "Billed monthly. Cancel anytime."}
              </Small>
              <View style={styles.features}>
                {PRO.map((f) => (
                  <View key={f} style={styles.feature}>
                    <Icon name="check" size={14} color={palette.red500} weight="bold" />
                    <Small style={{ color: palette.ink, fontSize: 14, flex: 1 }}>{f}</Small>
                  </View>
                ))}
              </View>
              <Button block size="lg" icon="arrowUpRight" loading={busy} onPress={buy} style={{ marginTop: 24 }}>
                {`Go Pro ${period === "yearly" ? "for the year" : "monthly"}`}
              </Button>
              <Small style={{ textAlign: "center", fontSize: 11, marginTop: 10 }}>Billed through the App Store / Google Play. Mock purchase in this preview.</Small>
            </View>
          </CornerFrame>
        </Rise>

        <Button variant="night" block style={{ marginTop: 18 }} onPress={() => router.back()}>
          Restore purchases
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.card, borderRadius: 30, padding: 22 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orb: { width: 32, height: 32, borderRadius: 9 },
  popular: { borderWidth: 1, borderColor: palette.line, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  planName: { fontFamily: fontFamily.sans, fontSize: 22, letterSpacing: -0.8, color: palette.ink, marginTop: 20 },
  priceRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 16, marginBottom: 6, overflow: "hidden" },
  price: { fontFamily: fontFamily.sans, fontSize: 58, lineHeight: 64, letterSpacing: -3.4, color: palette.ink },
  features: { gap: 12, marginTop: 22, paddingTop: 20, borderTopWidth: 1, borderTopColor: palette.line },
  feature: { flexDirection: "row", gap: 10, alignItems: "center" },
});
