import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { TopBar } from "@/components/navigation/TopBar";
import { Body, Button, Display, Eyebrow, Rise, Screen, SerifAccent } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { draftKind, setDraft } from "@/lib/draft";
import { haptic } from "@/lib/haptics";
import { setIncoming, shareToDraft, useIncoming } from "@/lib/share";
import { palette } from "@/theme";

/** How long to wait for the shared content before saying nothing arrived. */
const WAIT_MS = 6000;

/**
 * Where a share from another app lands: turns what was shared (a link, text or a file) into a
 * draft and hands over to the usual add flow (note type → outputs → progress).
 */
export default function Share() {
  const incoming = useIncoming();
  const { error: intentError } = useShareIntentContext();
  const [error, setError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGaveUp(true), WAIT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!incoming) return;
    let cancelled = false;
    shareToDraft(incoming)
      .then(({ draft, label }) => {
        if (cancelled) return;
        setIncoming(null);
        setDraft(draft, label);
        // The Add tab sits underneath, so closing the flow lands somewhere sensible.
        router.replace("/add");
        router.push({ pathname: "/new/type", params: { source: draftKind(draft), label } });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        haptic.warn();
        setIncoming(null);
        setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [incoming]);

  // A new share arriving replaces an earlier failure.
  const failed = incoming ? null : (error ?? intentError ?? (gaveUp ? "Nothing came through from the other app. Try sharing it again." : null));

  return (
    <Screen>
      <TopBar icon="close" title="Shared with anything2note" onBack={() => router.replace("/library")} />
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28 }}>
        {failed ? (
          <Rise>
            <Eyebrow color={palette.red600}>Can&apos;t add that</Eyebrow>
            <Display size={32} style={{ marginTop: 8 }}>
              That didn&apos;t <SerifAccent size={36}>work</SerifAccent>.
            </Display>
            <Body style={{ marginTop: 8 }}>{failed}</Body>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
              <Button variant="ghost" onPress={() => router.replace("/library")}>
                Library
              </Button>
              <Button icon="add" onPress={() => router.replace("/add")}>
                Add something
              </Button>
            </View>
          </Rise>
        ) : (
          <Rise style={{ alignItems: "center" }}>
            <ActivityIndicator color={palette.red500} />
            <Body style={{ marginTop: 14, textAlign: "center" }}>Getting it ready…</Body>
          </Rise>
        )}
      </View>
    </Screen>
  );
}
