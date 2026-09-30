import { useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { router } from "expo-router";
import type { UserSettings } from "@a2n/shared";
import { Divider, LinkRow, SelectRow, ToggleRow } from "@/components/profile/SettingRow";
import { UsageBar } from "@/components/profile/UsageBar";
import { TextPrompt } from "@/components/prompt/TextPrompt";
import { Body, Button, Card, Display, Eyebrow, H, Mono, NestedCard, PressableScale, Rise, Screen, SerifAccent, Skeleton, Small } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { NOTE_TYPES } from "@/lib/note-types";
import { authClient } from "@/lib/auth-client";
import { clearLocalData } from "@/lib/offline";
import { languageOptions, usePreferences, type AutoType } from "@/lib/preferences";
import { openWebBilling, planSubtitle, planTitle } from "@/lib/billing";
import { useMe } from "@/lib/queries";
import { palette } from "@/theme";

/** "1.0.0 (12)" from the installed binary; app.json's version where there's no native one (web). */
const version = (() => {
  const v = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "";
  const build = Application.nativeBuildVersion;
  return build && build !== v ? `${v} (${build})` : v;
})();

export default function Profile() {
  const { data: session } = authClient.useSession();
  const me = useMe();
  const { settings, updateSettings } = usePreferences();
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const billing = me.data?.billing;
  const onPlan = !!billing?.canUse;
  const email = me.data?.user.email ?? session?.user.email ?? "";
  // Email-code accounts start without a name; greet them by their address instead.
  const name = (me.data?.user.name ?? session?.user.name ?? "").trim().split(/\s+/)[0] || email.split("@")[0];

  /** Settings save for every device; if the API says no, the change is undone and explained. */
  const save = (patch: Partial<UserSettings>) =>
    updateSettings(patch).catch((e: unknown) => Alert.alert("Couldn't save that", errorMessage(e)));

  const signOut = async () => {
    setSigningOut(true);
    // The client drops the stored session before the request goes out, so this signs out even
    // offline; the session guard in _layout then routes back to sign-in.
    try {
      await authClient.signOut();
    } catch {}
    // Nothing from this account should show for the next one (cache, offline queue, draft).
    await clearLocalData();
    setSigningOut(false);
  };

  const askDelete = () => {
    const subscribed = billing && billing.plan && !billing.cancelAtPeriodEnd && ["trialing", "active", "past_due", "on_hold", "paused"].includes(billing.status);
    Alert.alert(
      "Delete your account?",
      `This permanently deletes your library, notes, flashcards, tasks and credits, on every device. It can't be undone.${
        subscribed ? "\n\nYour subscription is managed on the web: cancel it in Plan & billing first so it doesn't renew." : ""
      }`,
      [
        { text: "Cancel", style: "cancel" },
        ...(subscribed ? [{ text: "Open Plan & billing", onPress: () => void openWebBilling() }] : []),
        { text: "Continue", style: "destructive" as const, onPress: () => setConfirmDelete(true) },
      ],
    );
  };

  const deleteAccount = async () => {
    const { error } = await authClient.deleteUser({});
    if (error) {
      // Better Auth only deletes from a recent sign-in.
      const stale = error.status === 400 || error.status === 401 || error.code === "SESSION_EXPIRED";
      throw new Error(stale ? "For your security, sign out, sign in again, then delete your account." : (error.message ?? "Couldn't delete your account. Try again."));
    }
    await clearLocalData();
    try {
      await authClient.signOut();
    } catch {}
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
                  <View style={styles.balance}>
                    <View style={{ flex: 1 }}>
                      <Display size={34}>{billing.credits.balance.toLocaleString()}</Display>
                      <Small>credits to spend · 1 per minute or page</Small>
                    </View>
                    {billing.credits.topupRemaining ? (
                      <View style={{ alignItems: "flex-end" }}>
                        <Mono style={{ fontSize: 12 }}>{billing.credits.topupRemaining.toLocaleString()}</Mono>
                        <Small>from top-ups</Small>
                      </View>
                    ) : null}
                  </View>
                  <UsageBar label="Plan credits used" used={billing.credits.cycleGranted - billing.credits.cycleRemaining} limit={billing.credits.cycleGranted} unit="" />
                  <UsageBar label="AI chat used" used={billing.chat.allowance - billing.chat.remaining} limit={billing.chat.allowance} unit="msgs" />
                  <Small>
                    {billing.chat.remaining.toLocaleString()} of {billing.chat.allowance.toLocaleString()} chat messages left this cycle, then 1 credit each.
                  </Small>
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

        <Rise delay={100} style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <Card padded={false}>
            <LinkRow icon="bolt" title="Your stats" hint="Streak, reviews, quiz accuracy, weak topics" onPress={() => router.push("/stats")} />
            <Divider />
            <LinkRow icon="clock" title="Credit history" hint="What your credits were spent on" onPress={() => router.push("/credits")} />
          </Card>
        </Rise>

        <Rise delay={140} style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <Eyebrow style={{ marginLeft: 6, marginBottom: 8 }}>Notes · on every device</Eyebrow>
          <Card padded={false}>
            <SelectRow<AutoType>
              icon="sparkles"
              title="Default note type"
              value={settings.defaultNoteType}
              onChange={(v) => void save({ defaultNoteType: v })}
              options={[{ value: "auto", label: "Auto-detect" }, ...NOTE_TYPES.map((n) => ({ value: n.key, label: n.label, noteType: n.key }))]}
            />
            <Divider />
            <SelectRow icon="globe" title="Output language" value={settings.language} onChange={(v) => void save({ language: v })} options={languageOptions(settings.language)} />
            <Divider />
            <ToggleRow
              icon="trash"
              title="Delete originals after processing"
              hint="Uploads and recordings go once notes are made; the transcript stays"
              value={settings.deleteOriginals}
              onChange={(v) => void save({ deleteOriginals: v })}
            />
          </Card>
        </Rise>

        <Rise delay={180} style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <Eyebrow style={{ marginLeft: 6, marginBottom: 8 }}>Email</Eyebrow>
          <Card padded={false}>
            <ToggleRow icon="mail" title="When notes are ready" value={settings.emailNotesReady} onChange={(v) => void save({ emailNotesReady: v })} />
            <Divider />
            <ToggleRow
              icon="bell"
              title="Daily reminders"
              hint="A morning email when cards or tasks are due"
              value={settings.emailReminders}
              onChange={(v) => void save({ emailReminders: v })}
            />
          </Card>
        </Rise>

        <Rise delay={220} style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <Card padded={false}>
            <LinkRow icon="crown" title="Plans & pricing" onPress={() => router.push("/paywall")} />
            <Divider />
            <LinkRow icon="arrowUpRight" title="Manage plan on the web" hint="Change plan, card or cancel" onPress={() => void openWebBilling()} />
          </Card>
          <Button variant="ghost" block leadingIcon="logout" style={{ marginTop: 20 }} loading={signingOut} onPress={() => void signOut()}>
            Sign out
          </Button>
          <PressableScale onPress={askDelete} style={{ alignSelf: "center", marginTop: 18, padding: 6 }} accessibilityRole="button">
            <Small style={{ color: palette.red600 }}>Delete account</Small>
          </PressableScale>
          <Body style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: palette.muted }}>anything2note · v{version}</Body>
        </Rise>
      </ScrollView>

      <TextPrompt
        visible={confirmDelete}
        title="Delete your account"
        message="Type DELETE to confirm. Everything goes, for good."
        placeholder="DELETE"
        autoCapitalize="characters"
        confirmLabel="Delete account"
        destructive
        valid={(v) => v.trim().toUpperCase() === "DELETE"}
        onSubmit={deleteAccount}
        onClose={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  planHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  orb: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  orbFree: { backgroundColor: palette.ink },
  orbPro: { backgroundColor: palette.red500, shadowColor: palette.red400, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  orbDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.cream, shadowColor: "#fff", shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  balance: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
});
