import { useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown, FadeInUp, LinearTransition } from "react-native-reanimated";
import type { Anchor, ItemDetail } from "@a2n/shared";
import { AnchorChip, Body, Chip, Eyebrow, Icon, PressableScale, Small } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { useSendChat } from "@/lib/queries";
import { fontFamily, gradients, palette } from "@/theme";

/** Starter questions for an empty chat; each is sent as-is to the item's chat. */
const STARTERS = ["Summarise this in five bullets", "What would be on an exam about this?", "Explain the hardest part simply"];

/** Only anchors the item can jump to: timestamps for media, pages for documents. */
function usable(content: ItemDetail["content"], cites: Anchor[]): Anchor[] {
  const kind = content?.kind === "media" ? "time" : content?.kind === "document" ? "page" : null;
  const seen = new Set<string>();
  return cites.filter((c) => {
    const key = c.kind === "time" ? `t${c.at}` : `p${c.page}`;
    if (c.kind !== kind || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Ask the item: answers come from its own content and cite where they came from. */
export function Chat({ detail }: { detail: ItemDetail }) {
  const send = useSendChat(detail.item.id);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  // Chat reads the extracted content, so it opens once the source has been read.
  const ready = !!detail.content;

  const ask = (q: string) => {
    const text = q.trim();
    if (!text || send.isPending || !ready) return;
    haptic.tap();
    setInput("");
    setError(null);
    setPending(text);
    send.mutate(text, {
      onSettled: () => setPending(null),
      onError: (e) => {
        setError(errorMessage(e));
        setInput(text);
      },
    });
  };

  const messages = detail.chat;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 24 }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardDismissMode="interactive"
      >
        {messages.length === 0 && !pending ? (
          <>
            <Body style={{ textAlign: "center", marginTop: 24 }}>
              {ready ? "Ask anything about this item. Answers cite where they came from." : "Chat opens once the source has been read."}
            </Body>
            {ready ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 4 }}>
                {STARTERS.map((s) => (
                  <Chip key={s} size="sm" label={s} onPress={() => ask(s)} />
                ))}
              </View>
            ) : null}
          </>
        ) : null}
        {messages.map((m) =>
          m.role === "user" ? (
            <UserBubble key={m.id} text={m.content} />
          ) : (
            <Animated.View key={m.id} entering={FadeInDown.duration(300)} layout={LinearTransition} style={styles.aiRow}>
              <View style={styles.avatar}>
                <Icon name="sparkles" size={13} color={palette.cream} />
              </View>
              <View style={styles.ai}>
                <Body selectable style={{ fontSize: 15, lineHeight: 22, color: palette.ink }}>
                  {m.content}
                </Body>
                {usable(detail.content, m.citations).length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 10 }}>
                    <Eyebrow>Source</Eyebrow>
                    {usable(detail.content, m.citations).map((c) => (
                      <AnchorChip key={c.kind === "time" ? `t${c.at}` : `p${c.page}`} anchor={c} />
                    ))}
                  </View>
                ) : null}
              </View>
            </Animated.View>
          ),
        )}
        {pending ? (
          <>
            <UserBubble text={pending} />
            <Animated.View entering={FadeIn.delay(150)} style={styles.aiRow}>
              <View style={styles.avatar}>
                <Icon name="sparkles" size={13} color={palette.cream} />
              </View>
              <View style={[styles.ai, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
                <ActivityIndicator size="small" color={palette.red500} />
                <Small>Reading the source…</Small>
              </View>
            </Animated.View>
          </>
        ) : null}
        {error ? (
          <Animated.View entering={FadeIn} style={styles.error}>
            <Icon name="info" size={14} color={palette.red600} />
            <Small style={{ flex: 1, color: palette.red700 }}>{error}</Small>
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={[styles.inputBar, !ready && { opacity: 0.5 }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          editable={ready}
          placeholder={ready ? "Ask anything about this item…" : "Available once it's been read"}
          placeholderTextColor={palette.muted}
          onSubmitEditing={() => ask(input)}
          returnKeyType="send"
          maxLength={4000}
          style={styles.input}
        />
        <PressableScale
          onPress={() => ask(input)}
          disabled={!ready || send.isPending}
          haptics={false}
          scaleTo={0.9}
          style={[styles.send, (!ready || send.isPending) && { opacity: 0.5 }]}
          accessibilityLabel="Send"
        >
          <Icon name="send" size={15} color={palette.cream} weight="bold" />
        </PressableScale>
      </View>
    </View>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <Animated.View entering={FadeInUp.duration(260)} layout={LinearTransition} style={styles.userWrap}>
      <LinearGradient colors={gradients.buttonInk} style={styles.user}>
        <Body style={{ color: "#f6ece8", fontSize: 15 }}>{text}</Body>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  userWrap: { alignSelf: "flex-end", maxWidth: "85%" },
  user: { borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 16, paddingVertical: 10 },
  aiRow: { flexDirection: "row", gap: 10, maxWidth: "94%" },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: palette.red500, alignItems: "center", justifyContent: "center" },
  ai: { flex: 1, borderRadius: 20, borderTopLeftRadius: 6, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.card, padding: 14 },
  error: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 14, backgroundColor: palette.red50, borderWidth: 1, borderColor: palette.red100 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 5,
    paddingLeft: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    backgroundColor: palette.card,
  },
  input: { flex: 1, fontFamily: fontFamily.sans, fontSize: 15, color: palette.ink, paddingVertical: 8 },
  send: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.red500, alignItems: "center", justifyContent: "center" },
});
