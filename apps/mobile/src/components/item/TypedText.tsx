import { useEffect, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { fontFamily, palette } from "@/theme";

/** Streams `text` in like an assistant reply, then reveals `children` (citations). */
export function TypedText({ text, children, onDone }: { text: string; children?: ReactNode; onDone?: () => void }) {
  const [n, setN] = useState(0);
  // Each message mounts its own TypedText, so `n` starts at 0 per text.
  useEffect(() => {
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id);
          return v;
        }
        return v + 2;
      });
    }, 22);
    return () => clearInterval(id);
  }, [text]);
  const done = n >= text.length;
  useEffect(() => {
    if (done) onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
  return (
    <View>
      <Text style={{ fontFamily: fontFamily.sans, fontSize: 15, lineHeight: 22, color: palette.ink }}>
        {text.slice(0, n)}
        {/* inline red caret (`.caret`) while streaming */}
        {done ? null : <Text style={{ color: palette.red500 }}>▍</Text>}
      </Text>
      {done && children ? (
        <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: 10 }}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}
