import { StyleSheet, View } from "react-native";
import { Body, Eyebrow, Icon, Label, SerifAccent, TimestampChip } from "@/components/ui";
import type { OutputContent, Stamped } from "@/lib/mock/types";
import { palette } from "@/theme";

type Of<K extends OutputContent["kind"]> = Extract<OutputContent, { kind: K }>;

export function Minutes({ data }: { data: Of<"minutes"> }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.metaRow}>
        {data.meta.map((m) => (
          <Eyebrow key={m}>{m}</Eyebrow>
        ))}
      </View>
      {data.items.map((m, i) => (
        <View key={m.title} style={styles.box}>
          <View style={styles.between}>
            <Label style={{ flex: 1 }}>
              <Label style={{ color: palette.muted }}>{i + 1}. </Label>
              {m.title}
            </Label>
            <TimestampChip at={m.at} />
          </View>
          <Body style={{ marginTop: 6, fontSize: 14 }}>{m.body}</Body>
        </View>
      ))}
    </View>
  );
}

export function Decisions({ data }: { data: Of<"decisions"> }) {
  return (
    <View style={{ gap: 8 }}>
      {data.items.map((d) => (
        <View key={d.text} style={[styles.between, styles.decision]}>
          <View style={{ flexDirection: "row", gap: 8, flex: 1, alignItems: "center" }}>
            <Icon name="check" size={14} color={palette.red600} weight="bold" />
            <Body style={{ color: palette.ink, fontSize: 14, flex: 1 }}>{d.text}</Body>
          </View>
          {d.at !== undefined ? <TimestampChip at={d.at} /> : null}
        </View>
      ))}
    </View>
  );
}

export function Notes({ data }: { data: Of<"notes"> }) {
  return (
    <View style={{ gap: 22 }}>
      {data.sections.map((s) => (
        <View key={s.heading}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Label style={{ fontSize: 17 }}>{s.heading}</Label>
            {s.at !== undefined ? <TimestampChip at={s.at} /> : null}
          </View>
          <Body style={{ marginTop: 6 }}>{s.body}</Body>
          {s.bullets?.map((b) => (
            <View key={b} style={styles.bullet}>
              <View style={styles.dot} />
              <Body style={{ flex: 1, fontSize: 14 }}>{b}</Body>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function Bullets({ data }: { data: { items: Stamped[] } }) {
  return (
    <View style={{ gap: 2 }}>
      {data.items.map((b, i) => (
        <View key={b.text} style={[styles.bulletRow, i > 0 && styles.rule]}>
          <Eyebrow color={palette.red600} style={{ width: 22, marginTop: 3 }}>
            {String(i + 1).padStart(2, "0")}
          </Eyebrow>
          <Body style={{ flex: 1, color: palette.ink }}>{b.text}</Body>
          {b.at !== undefined ? <TimestampChip at={b.at} /> : null}
        </View>
      ))}
    </View>
  );
}

export function Glossary({ data }: { data: Of<"glossary"> }) {
  return (
    <View style={{ gap: 10 }}>
      {data.terms.map((t) => (
        <View key={t.term} style={styles.box}>
          <View style={styles.between}>
            <SerifAccent upright color={palette.ink} size={21} style={{ flex: 1 }}>
              {t.term}
            </SerifAccent>
            {t.at !== undefined ? <TimestampChip at={t.at} /> : null}
          </View>
          <Body style={{ marginTop: 4, fontSize: 14 }}>{t.def}</Body>
        </View>
      ))}
    </View>
  );
}

export function Summary({ data }: { data: Of<"summary"> }) {
  return (
    <View style={styles.summary}>
      <Eyebrow color={palette.red600}>TL;DR</Eyebrow>
      <SerifAccent upright color={palette.ink} size={23} style={{ lineHeight: 30, marginTop: 8 }}>
        {data.text}
      </SerifAccent>
      {data.at !== undefined ? (
        <View style={{ marginTop: 12 }}>
          <TimestampChip at={data.at} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 4, marginBottom: 4 },
  box: { borderRadius: 18, borderWidth: 1, borderColor: palette.line, padding: 14, backgroundColor: palette.card },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  decision: { padding: 14, borderRadius: 18, backgroundColor: "rgba(242,181,168,0.45)" },
  bullet: { flexDirection: "row", gap: 10, marginTop: 6, alignItems: "flex-start" },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: palette.red500, marginTop: 9 },
  bulletRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 12 },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.lineStrong },
  summary: { padding: 18, borderRadius: 6, backgroundColor: palette.paperGlow, borderWidth: 1, borderColor: palette.line },
});
