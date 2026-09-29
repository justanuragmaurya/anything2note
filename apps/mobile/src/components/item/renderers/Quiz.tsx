import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import type { OutputKey, QuizQuestion } from "@a2n/shared";
import { AnchorChip, Body, Button, Eyebrow, Icon, Label, Mono, PressableScale, Small } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { useQuizAttempt } from "@/lib/queries";
import { palette } from "@/theme";

function Option({ label, index, state, onPress }: { label: string; index: number; state: "idle" | "correct" | "wrong" | "dim"; onPress: () => void }) {
  const x = useSharedValue(0);
  const wiggle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  useEffect(() => {
    if (state === "wrong") x.set(withSequence(withTiming(-6, { duration: 60 }), withTiming(6, { duration: 60 }), withTiming(0, { duration: 60 })));
  }, [state, x]);
  return (
    <PressableScale
      onPress={() => {
        if (state === "idle") onPress();
      }}
      haptics={false}
      scaleTo={0.98}
    >
      <Animated.View
        style={[
          styles.option,
          state === "correct" && styles.correct,
          state === "wrong" && styles.wrong,
          state === "dim" && { opacity: 0.55 },
          wiggle,
        ]}
      >
        <Mono style={{ width: 18 }}>{String.fromCharCode(65 + index)}</Mono>
        <Body style={{ flex: 1, color: palette.ink, fontSize: 15 }}>{label}</Body>
        {state === "correct" ? <Icon name="check" size={16} color={palette.success} weight="bold" /> : null}
        {state === "wrong" ? <Icon name="close" size={14} color={palette.red600} weight="bold" /> : null}
      </Animated.View>
    </PressableScale>
  );
}

/** One pass through the quiz; the finished attempt is saved (it feeds quiz accuracy and weak topics). */
export function Quiz({ questions, itemId, output }: { questions: QuizQuestion[]; itemId: string; output: OutputKey }) {
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const attempt = useQuizAttempt();
  const q = questions[i];
  if (!q) {
    const score = answers.filter((a, idx) => a === questions[idx]?.correct).length;
    return (
      <Animated.View entering={FadeInDown} style={styles.result}>
        <Eyebrow>Quiz complete</Eyebrow>
        <Label style={{ fontSize: 22, marginTop: 6 }}>
          {attempt.data?.score ?? score} / {attempt.data?.total ?? questions.length} correct
        </Label>
        <Small style={{ marginTop: 4, color: attempt.isError ? palette.red600 : palette.muted }}>
          {attempt.isPending ? "Saving your attempt…" : attempt.isError ? `Not saved: ${errorMessage(attempt.error)}` : attempt.isSuccess ? "Saved to your stats." : ""}
        </Small>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          {attempt.isError ? (
            <Button variant="ink" size="sm" leadingIcon="refresh" onPress={() => attempt.mutate({ itemId, output, answers })}>
              Save again
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            leadingIcon="retry"
            onPress={() => {
              setI(0);
              setAnswers([]);
              setAnswer(null);
              attempt.reset();
            }}
          >
            Try again
          </Button>
        </View>
      </Animated.View>
    );
  }
  const reveal = answer !== null;
  return (
    <Animated.View key={q.id} entering={FadeInDown.duration(300)}>
      <Eyebrow>
        Question {i + 1} of {questions.length}
      </Eyebrow>
      <Label style={{ fontSize: 18, lineHeight: 24, marginTop: 8 }}>{q.q}</Label>
      <View style={{ gap: 8, marginTop: 16 }}>
        {q.options.map((o, idx) => (
          <Option
            key={`${idx}-${o}`}
            label={o}
            index={idx}
            state={!reveal ? "idle" : idx === q.correct ? "correct" : idx === answer ? "wrong" : "dim"}
            onPress={() => {
              setAnswer(idx);
              if (idx === q.correct) haptic.success();
              else haptic.warn();
            }}
          />
        ))}
      </View>
      {reveal ? (
        <Animated.View entering={FadeInDown.duration(260)} style={styles.explain}>
          <Body style={{ flex: 1, fontSize: 14 }}>{q.explanation}</Body>
          {q.anchor ? <AnchorChip anchor={q.anchor} /> : null}
        </Animated.View>
      ) : null}
      {reveal ? (
        <Button
          variant="ink"
          icon="arrowRight"
          style={{ marginTop: 14, alignSelf: "flex-end" }}
          onPress={() => {
            const all = [...answers, answer ?? -1];
            setAnswers(all);
            setAnswer(null);
            setI((n) => n + 1);
            if (all.length === questions.length) attempt.mutate({ itemId, output, answers: all });
          }}
        >
          {i + 1 < questions.length ? "Next question" : "See score"}
        </Button>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.card,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  correct: { borderColor: "rgba(47,125,79,0.4)", backgroundColor: "rgba(47,125,79,0.1)" },
  wrong: { borderColor: palette.red400, backgroundColor: palette.red50 },
  explain: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: palette.panel },
  result: { alignItems: "flex-start", padding: 18, borderRadius: 18, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.line },
});
