import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Divider, LinkRow, SelectRow } from "@/components/profile/SettingRow";
import { UsageBar } from "@/components/profile/UsageBar";
import { Body, Button, Card, Display, Eyebrow, H, NestedCard, Rise, Screen, SerifAccent, Skeleton, Small } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { NOTE_TYPES } from "@/lib/note-types";
import { authClient } from "@/lib/auth-client";
import { usePreferences, type AutoType } from "@/lib/preferences";
import { planSubtitle, planTitle } from "@/lib/billing";
import { queryClient, useMe } from "@/lib/queries";
import { palette } from "@/theme";

const LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Japanese", "Same as source"] as const;

export default function Profile() {
  const { data: session } = authClient.useSession();
  const me = useMe();
  const { prefs, setPref } = usePreferences();
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const billing = me.data?.billing;
  const onPlan = !!billing?.canUse;
  const email = me.data?.user.email ?? session?.user.email ?? "";
  // Email-code accounts start without a name; greet them by their address instead.
  const name = (me.data?.user.name ?? session?.user.name ?? "").trim().split(/\s+/)[0] || email.split("@")[0];

  const signOut = async () => {
    setSigningOut(true);
    // The client drops the stored session before the request goes out, so this signs out even
    // offline; the session guard in _layout then routes back to sign-in.
    try {
      await authClient.signOut();
    } catch {}
    // Nothing from this account should show for the next one.
    queryClient.clear();
    setSigningOut(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    await me.refetch();
    setRefreshing(false);
  };

  return (
    <Screen>
      <Rise className="px-5 pt-4 pb-2">
        <Eyebrow numberOfLines={1}>{email}</Eyebrow>
        <Display size={40} style={{ marginTop: 6 }}>
          Hi, <SerifAccent size={46}>{name}</SerifAccent>
        </Display>
      </Rise>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.red500} colors={[palette.red500]} />}
      >
        <Rise delay={60} style={{ paddingHorizontal: 16, marginTop: 10 }}>
          <NestedCard>
            <View style={styles.planHead}>
              <View style={[styles.orb, onPlan ? styles.orbPro : styles.orbFree]}>
                <View style={styles.orbDot} />
              </View>
              <View style={{ flex: 1 }}>
                <H level={3}>{planTitle(billing)}</H>
                <Small style={{ marginTop: 2 }}>{billing ? planSubtitle(billing) : me.isError ? errorMessage(me.error) : "Loading your plan…"}</Small>
              </View>
              {me.data?.streak ? (
                <View style={{ alignItems: "flex-end" }}>
                  <H level={3}>{me.data.streak}</H>
                  <Small>day streak</Small>
                </View>
              ) : null}
            </View>
            <View style={{ gap: 14, marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: palette.line }}>
              {billing && onPlan ? (
                <>
                  <UsageBar label="Credits used" used={billing.credits.cycleGranted - billing.credits.cycleRemaining} limit={billing.credits.cycleGranted} unit="" />
                  <UsageBar label="AI chat used" used={billing.chat.allowance - billing.chat.remaining} limit={billing.chat.allowance} unit="msgs" />
                </>
              ) : billing ? (
                <Small>Plans and your 7-day free trial are on anything2note.com. Sign in there with this account and your credits show up here.</Small>
              ) : me.isError ? (
                <Button variant="ghost" size="sm" leadingIcon="refresh" loading={me.isFetching} onPress={() => void me.refetch()}>
                  Try again
                </Button>
              ) : (
                [0, 1, 2].map((i) => <Skeleton key={i} height={26} />)
              )}
            </View>
            {onPlan || !me.data ? null : (
              <Button block size="lg" icon="arrowUpRight" style={{ marginTop: 20 }} onPress={() => router.push("/paywall")}>
                See plans
              </Button>
            )}
          </NestedCard>
        </Rise>

        <Rise delay={120} style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <Eyebrow style={{ marginLeft: 6, marginBottom: 8 }}>Notes</Eyebrow>
          <Card padded={false}>
            <SelectRow<AutoType>
              icon="sparkles"
              title="Default note type"
              value={prefs.defaultNoteType}
              onChange={(v) => setPref("defaultNoteType", v)}
              options={[{ value: "auto", label: "Auto-detect" }, ...NOTE_TYPES.map((n) => ({ value: n.key, label: n.label, noteType: n.key }))]}
            />
            <Divider />
            <SelectRow
              icon="globe"
              title="Output language"
              value={prefs.outputLanguage}
              onChange={(v) => setPref("outputLanguage", v)}
              options={LANGUAGES.map((l) => ({ value: l, label: l }))}
            />
          </Card>
        </Rise>

        <Rise delay={200} style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Card padded={false}>
            <LinkRow icon="crown" title="Plans & pricing" onPress={() => router.push("/paywall")} />
          </Card>
          <Button
            variant="ghost"
            block
            leadingIcon="logout"
            style={{ marginTop: 20 }}
            loading={signingOut}
            onPress={() => void signOut()}
          >
            Sign out
          </Button>
          <Body style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: palette.muted }}>anything2note · v1.0.0 (preview)</Body>
        </Rise>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  planHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  orb: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  orbFree: { backgroundColor: palette.ink },
  orbPro: { backgroundColor: palette.red500, shadowColor: palette.red400, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  orbDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.cream, shadowColor: "#fff", shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
});
