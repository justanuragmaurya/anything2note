import { ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Divider, LinkRow, SelectRow, ToggleRow } from "@/components/profile/SettingRow";
import { UsageBar } from "@/components/profile/UsageBar";
import { Body, Button, Card, Display, Eyebrow, H, NestedCard, Rise, Screen, SerifAccent, Small } from "@/components/ui";
import { NOTE_TYPES } from "@/lib/note-types";
import { useSession, type AutoType } from "@/lib/session";
import { palette } from "@/theme";

const LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Japanese", "Same as source"] as const;

export default function Profile() {
  const { email, plan, prefs, setPref, signOut } = useSession();
  const pro = plan === "pro";
  const name = email?.split("@")[0] ?? "you";

  return (
    <Screen>
      <Rise className="px-5 pt-4 pb-2">
        <Eyebrow>{email ?? "Signed out"}</Eyebrow>
        <Display size={40} style={{ marginTop: 6 }}>
          Hi, <SerifAccent size={46}>{name}</SerifAccent>
        </Display>
      </Rise>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Rise delay={60} style={{ paddingHorizontal: 16, marginTop: 10 }}>
          <NestedCard>
            <View style={styles.planHead}>
              <View style={[styles.orb, pro ? styles.orbPro : styles.orbFree]}>
                <View style={styles.orbDot} />
              </View>
              <View style={{ flex: 1 }}>
                <H level={3}>{pro ? "Pro plan" : "Free plan"}</H>
                <Small style={{ marginTop: 2 }}>{pro ? "Renews 27 Sep 2027 · yearly" : "Resets on 1 Oct"}</Small>
              </View>
            </View>
            <View style={{ gap: 14, marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: palette.line }}>
              <UsageBar label="Media minutes" used={pro ? 312 : 94} limit={pro ? 2000 : 120} unit="min" />
              <UsageBar label="Document pages" used={pro ? 140 : 22} limit={pro ? 2000 : 50} unit="pp" />
              <UsageBar label="AI chat" used={pro ? 40 : 18} limit={pro ? 1000 : 30} unit="msgs" />
            </View>
            {pro ? null : (
              <Button block size="lg" icon="arrowUpRight" style={{ marginTop: 20 }} onPress={() => router.push("/paywall")}>
                Upgrade to Pro
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

        <Rise delay={160} style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Eyebrow style={{ marginLeft: 6, marginBottom: 8 }}>Privacy & alerts</Eyebrow>
          <Card padded={false}>
            <ToggleRow
              icon="trash"
              title="Auto-delete originals"
              hint="Remove audio & files 30 days after notes are ready"
              value={prefs.autoDeleteOriginals}
              onChange={(v) => setPref("autoDeleteOriginals", v)}
            />
            <Divider />
            <ToggleRow
              icon="bell"
              title="Notifications"
              hint="Notes ready, cards due, action items due"
              value={prefs.notifications}
              onChange={(v) => setPref("notifications", v)}
            />
          </Card>
        </Rise>

        <Rise delay={200} style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Card padded={false}>
            <LinkRow icon="crown" title={pro ? "Manage subscription" : "Plans & pricing"} onPress={() => router.push("/paywall")} />
            <Divider />
            <LinkRow icon="info" title="Help & feedback" onPress={() => undefined} />
          </Card>
          <Button
            variant="ghost"
            block
            leadingIcon="logout"
            style={{ marginTop: 20 }}
            onPress={() => {
              signOut();
              router.replace("/sign-in");
            }}
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
