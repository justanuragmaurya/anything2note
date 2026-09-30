import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TopBar } from "@/components/navigation/TopBar";
import { NightDots } from "@/components/note-type/NoteTypeShape";
import { PLANS, TRIAL } from "@a2n/shared";
import { Button, Display, Eyebrow, Icon, Rise, SerifAccent, Small } from "@/components/ui";
import { openWebBilling } from "@/lib/billing";
import { useMe } from "@/lib/queries";
import { fontFamily, palette } from "@/theme";

export default function Paywall() {
  const insets = useSafeAreaInsets();
  // Screens below in the stack stay mounted; only claim the light status bar while on top.
  const focused = useIsFocused();
  const { width } = useWindowDimensions();
  const billing = useMe().data?.billing;
  const current = billing?.canUse ? billing.plan : null;

  return (
    <View style={{ flex: 1, backgroundColor: palette.night }}>
      <StatusBar style={focused ? "light" : "dark"} />
      <NightDots width={width} height={420} />
      <LinearGradient colors={["rgba(229,55,43,0.28)", "transparent"]} style={[StyleSheet.absoluteFill, { height: 380 }]} />
      <View style={{ paddingTop: Math.max(insets.top - 30, 6) }}>
        <TopBar tone="night" icon="close" />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 24 }}>
        <Rise style={{ paddingHorizontal: 4 }}>
          <Eyebrow color={palette.red300}>anything2note plans</Eyebrow>
          <Display size={40} color={palette.nightText} style={{ marginTop: 8 }}>
            Notes for the <SerifAccent size={46} color={palette.red400}>whole</SerifAccent> semester.
          </Display>
          <Small style={{ color: palette.nightMuted, marginTop: 10 }}>
            Every plan starts with a {TRIAL.days}-day free trial. 1 credit is a minute of audio or a page.
          </Small>
        </Rise>

        {PLANS.map((p, i) => {
          const isCurrent = p.key === current;
          return (
            <Rise key={p.key} delay={60 + i * 60} style={{ marginTop: 14 }}>
              <View style={[styles.card, isCurrent && styles.cardCurrent]}>
                <View style={styles.cardHead}>
                  <Text style={styles.planName}>{p.name}</Text>
                  {isCurrent ? (
                    <View style={styles.popular}>
                      <Small style={{ fontSize: 11, color: palette.red600 }}>Your plan</Small>
                    </View>
                  ) : p.key === "plus" ? (
                    <View style={styles.popular}>
                      <Small style={{ fontSize: 11, color: palette.inkSoft }}>✦ Most popular</Small>
                    </View>
                  ) : null}
                </View>
                <Small>{p.blurb}</Small>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>${p.price}</Text>
                  <Small style={{ marginLeft: 6, marginBottom: 8 }}>/month</Small>
                </View>
                <View style={styles.features}>
                  {p.features.map((f) => (
                    <View key={f} style={styles.feature}>
                      <Icon name="check" size={14} color={palette.red500} weight="bold" />
                      <Small style={{ color: palette.ink, fontSize: 14, flex: 1 }}>{f}</Small>
                    </View>
                  ))}
                </View>
              </View>
            </Rise>
          );
        })}

        {/* Plans are sold on the web for now; no in-app purchase (plan.md §8). */}
        <Rise delay={260} style={{ marginTop: 20, paddingHorizontal: 4, gap: 12 }}>
          <Button block size="lg" variant="cream" icon="arrowUpRight" onPress={() => void openWebBilling()}>
            {current ? "Manage plan on the web" : "Start on the web"}
          </Button>
          <Small style={{ color: palette.nightMuted, textAlign: "center", fontSize: 13 }}>
            {current
              ? "Change plans, update your card or cancel in Plan & billing, signed in with this account."
              : "Start your trial or subscribe signed in with this account. Your credits show up here straight away."}
          </Small>
        </Rise>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.card, borderRadius: 30, padding: 22 },
  cardCurrent: { borderWidth: 2, borderColor: palette.red400 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  popular: { borderWidth: 1, borderColor: palette.line, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  planName: { fontFamily: fontFamily.sans, fontSize: 22, letterSpacing: -0.8, color: palette.ink },
  priceRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 12, overflow: "hidden" },
  price: { fontFamily: fontFamily.sans, fontSize: 58, lineHeight: 64, letterSpacing: -3.4, color: palette.ink },
  features: { gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: palette.line },
  feature: { flexDirection: "row", gap: 10, alignItems: "center" },
});
