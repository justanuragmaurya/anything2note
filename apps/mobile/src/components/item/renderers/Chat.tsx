import { useRef, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp, LinearTransition } from "react-native-reanimated";
import { Body, Chip, Eyebrow, Icon, PressableScale, TimestampChip } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import type { Item } from "@/lib/mock/types";
import { fontFamily, gradients, palette } from "@/theme";
import { TypedText } from "../TypedText";

type Msg = { id: number; role: "user" | "assistant"; text: string; cites: number[] };

/** Mock assistant: answers from the transcript and cites the moment it came from. */
function mockAnswer(item: Item, q: string): Msg {
  const lines = item.transcript;
  const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const hit = lines.find((l) => words.some((w) => l.text.toLowerCase().includes(w))) ?? lines[Math.floor(lines.length / 2)];
  const text = hit
    ? `From ${hit.speaker} at that point: “${hit.text}” That's the most relevant moment I can find for “${q.trim()}”.`
    : "I couldn't find that in this item. Try asking about something that was said or written in it.";
  return { id: Date.now() + 1, role: "assistant", text, cites: hit ? [hit.at] : [] };
}

export function Chat({ item }: { item: Item }) {
  const seed = item.chat;
  const [messages, setMessages] = useState<Msg[]>(() =>
    seed ? [{ id: 1, role: "user", text: seed.q, cites: [] }, { id: 2, role: "assistant", text: seed.a, cites: [seed.at] }] : [],
  );
  const [input, setInput] = useState("");
  const scroll = useRef<ScrollView>(null);

  const send = (q: string) => {
    if (!q.trim()) return;
    haptic.tap();
    setInput("");
    setMessages((m) => [...m, { id: Date.now(), role: "user", text: q.trim(), cites: [] }]);
    setTimeout(() => setMessages((m) => [...m, mockAnswer(item, q)]), 450);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 24 }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardDismissMode="interactive"
      >
        {messages.length === 0 ? (
          <Body style={{ textAlign: "center", marginTop: 24 }}>Ask anything about this item. Answers cite the exact moment.</Body>
        ) : null}
        {messages.map((m) =>
          m.role === "user" ? (
            <Animated.View key={m.id} entering={FadeInUp.duration(260)} layout={LinearTransition} style={styles.userWrap}>
              <LinearGradient colors={gradients.buttonInk} style={styles.user}>
                <Body style={{ color: "#f6ece8", fontSize: 15 }}>{m.text}</Body>
              </LinearGradient>
            </Animated.View>
          ) : (
            <Animated.View key={m.id} entering={FadeInDown.duration(300)} layout={LinearTransition} style={styles.aiRow}>
              <View style={styles.avatar}>
                <Icon name="sparkles" size={13} color={palette.cream} />
              </View>
              <View style={styles.ai}>
                <TypedText text={m.text}>
                  {m.cites.length ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Eyebrow>Source</Eyebrow>
                      {m.cites.map((c) => (
                        <TimestampChip key={c} at={c} />
                      ))}
                    </View>
                  ) : null}
                </TypedText>
              </View>
            </Animated.View>
          ),
        )}
        {seed ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {seed.suggestions.map((s) => (
              <Chip key={s} size="sm" label={s} onPress={() => send(s)} />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything about this item…"
          placeholderTextColor={palette.muted}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          style={styles.input}
        />
        <PressableScale onPress={() => send(input)} haptics={false} scaleTo={0.9} style={styles.send} accessibilityLabel="Send">
          <Icon name="send" size={15} color={palette.cream} weight="bold" />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userWrap: { alignSelf: "flex-end", maxWidth: "85%" },
  user: { borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 16, paddingVertical: 10 },
  aiRow: { flexDirection: "row", gap: 10, maxWidth: "94%" },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: palette.red500, alignItems: "center", justifyContent: "center" },
  ai: { flex: 1, borderRadius: 20, borderTopLeftRadius: 6, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.card, padding: 14 },
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
