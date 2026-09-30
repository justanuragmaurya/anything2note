import { StyleSheet, Text, View, type TextStyle } from "react-native";
import type { Anchor, OutputData, OutputKey } from "@a2n/shared";
import { AnchorChip, Body, Eyebrow, Label, SerifAccent } from "@/components/ui";
import { fontFamily, palette } from "@/theme";

type Of<K extends OutputData["type"]> = Extract<OutputData, { type: K }>;

/** Inline `**bold**` and `` `code` `` from the model, rendered instead of shown as symbols. */
export function Rich({ text, style, selectable }: { text: string; style?: TextStyle; selectable?: boolean }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <Body style={style} selectable={selectable}>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <Text key={i} style={{ fontFamily: fontFamily.sansMedium, color: palette.ink }}>
            {p.slice(2, -2)}
          </Text>
        ) : p.startsWith("`") && p.endsWith("`") ? (
          <Text key={i} style={styles.code}>
            {p.slice(1, -1)}
          </Text>
        ) : (
          p
        ),
      )}
    </Body>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.dot} />
      <Rich text={text} style={{ flex: 1, fontSize: 14 }} />
    </View>
  );
}

const BULLET = /^\s*(?:[-•*]|\d+[.)])\s+/;

/** One body line: "- x" becomes a bullet, a line that is only "**x**" a sub-heading, else a paragraph. */
function Line({ text }: { text: string }) {
  if (BULLET.test(text)) return <Bullet text={text.replace(BULLET, "")} />;
  const heading = /^\*\*([^*]+)\*\*:?$/.exec(text.trim());
  if (heading) return <Label style={{ marginTop: 10 }}>{heading[1]}</Label>;
  return <Rich text={text} style={{ marginTop: 6 }} />;
}

export function Notes({ data }: { data: Of<"notes"> }) {
  return (
    <View style={{ gap: 22 }}>
      {data.sections.map((s, i) => (
        <View key={`${i}-${s.heading}`}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Label style={{ fontSize: 17 }}>{s.heading}</Label>
            {s.anchor ? <AnchorChip anchor={s.anchor} /> : null}
          </View>
          {s.body.map((b, j) => (
            <Line key={j} text={b} />
          ))}
          {s.bullets?.map((b, j) => (
            <Bullet key={`b${j}`} text={b} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Numbered({ items }: { items: { text: string; anchor?: Anchor; title?: string }[] }) {
  return (
    <View style={{ gap: 2 }}>
      {items.map((b, i) => (
        <View key={i} style={[styles.bulletRow, i > 0 && styles.rule]}>
          <Eyebrow color={palette.red600} style={{ width: 22, marginTop: 3 }}>
            {String(i + 1).padStart(2, "0")}
          </Eyebrow>
          <View style={{ flex: 1, gap: 2 }}>
            {b.title ? <Label>{b.title}</Label> : null}
            <Rich text={b.text} style={{ color: palette.ink }} />
          </View>
          {b.anchor ? <AnchorChip anchor={b.anchor} /> : null}
        </View>
      ))}
    </View>
  );
}

const TLDR = /^\s*TL;?DR:?\s*/i;

export function Summary({ data }: { data: Of<"summary"> }) {
  const tldr = data.tldr.replace(TLDR, "");
  // The model sometimes repeats the TL;DR as the first point.
  const points = data.points.map((p) => ({ ...p, text: p.text.replace(TLDR, "") })).filter((p) => p.text !== tldr);
  return (
    <View style={{ gap: 18 }}>
      <View style={styles.summary}>
        <Eyebrow color={palette.red600}>TL;DR</Eyebrow>
        <SerifAccent upright color={palette.ink} size={23} style={{ lineHeight: 30, marginTop: 8 }}>
          {tldr}
        </SerifAccent>
      </View>
      {points.length ? <Numbered items={points} /> : null}
    </View>
  );
}

/** Outputs whose block text is code or maths, shown in mono. */
const MONO: OutputKey[] = ["code_snippets", "key_formulas"];

/**
 * Glossaries, key points, checklists… Titled blocks render as cards (term + definition),
 * untitled ones as a numbered list.
 */
export function Generic({ data, output }: { data: Of<"generic">; output: OutputKey }) {
  const titled = data.blocks.some((b) => b.title);
  const mono = MONO.includes(output);
  return (
    <View style={{ gap: 14 }}>
      {data.intro ? <Rich text={data.intro} /> : null}
      {!titled ? (
        <Numbered items={data.blocks} />
      ) : (
        <View style={{ gap: 10 }}>
          {data.blocks.map((b, i) => (
            <View key={i} style={styles.box}>
              <View style={styles.between}>
                {b.title ? (
                  <SerifAccent upright color={palette.ink} size={21} style={{ flex: 1 }}>
                    {b.title}
                  </SerifAccent>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                {b.anchor ? <AnchorChip anchor={b.anchor} /> : null}
              </View>
              {mono ? (
                <View style={styles.codeBlock}>
                  <Text selectable style={[styles.code, { backgroundColor: "transparent" }]}>
                    {b.text}
                  </Text>
                </View>
              ) : (
                <Rich text={b.text} style={{ marginTop: 4, fontSize: 14 }} />
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * The Markdown a chat answer comes back in: `#` headings, `-`/`*` and numbered lists, fenced code,
 * `**bold**` and `` `code` ``. Anything else shows as written (maths stays plain text).
 */
export function Markdown({ text, color = palette.ink }: { text: string; color?: string }) {
  const blocks: ({ kind: "code"; text: string } | { kind: "line"; text: string })[] = [];
  let fence: string[] | null = null;
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) {
      if (fence) {
        blocks.push({ kind: "code", text: fence.join("\n") });
        fence = null;
      } else fence = [];
    } else if (fence) fence.push(line);
    else blocks.push({ kind: "line", text: line });
  }
  // An unclosed fence (a streamed answer mid-block) still shows as code.
  if (fence) blocks.push({ kind: "code", text: fence.join("\n") });

  const body = { fontSize: 15, lineHeight: 22, color };
  return (
    <View style={{ gap: 6 }}>
      {blocks.map((b, i) => {
        if (b.kind === "code")
          return (
            <View key={i} style={[styles.codeBlock, { marginTop: 2 }]}>
              <Text selectable style={[styles.code, { backgroundColor: "transparent" }]}>
                {b.text}
              </Text>
            </View>
          );
        const line = b.text;
        if (!line.trim()) return null;
        const heading = /^\s*#{1,6}\s+(.*)$/.exec(line);
        if (heading) return <Label key={i} style={{ marginTop: i ? 6 : 0 }}>{heading[1]!.replace(/\*\*/g, "")}</Label>;
        const numbered = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
        if (numbered)
          return (
            <View key={i} style={styles.listRow}>
              <Text style={styles.listNum}>{numbered[1]}.</Text>
              <Rich selectable text={numbered[2]!} style={{ ...body, flex: 1 }} />
            </View>
          );
        const bullet = /^(\s*)[-*•]\s+(.*)$/.exec(line);
        if (bullet)
          return (
            <View key={i} style={[styles.listRow, bullet[1]!.length >= 2 && { paddingLeft: 16 }]}>
              <View style={[styles.dot, { marginTop: 8 }]} />
              <Rich selectable text={bullet[2]!} style={{ ...body, flex: 1 }} />
            </View>
          );
        return <Rich key={i} selectable text={line} style={body} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  listRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  listNum: { fontFamily: fontFamily.mono, fontSize: 12, lineHeight: 22, color: palette.red600, minWidth: 16 },
  box: { borderRadius: 18, borderWidth: 1, borderColor: palette.line, padding: 14, backgroundColor: palette.card },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  bullet: { flexDirection: "row", gap: 10, marginTop: 6, alignItems: "flex-start" },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: palette.red500, marginTop: 9 },
  bulletRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 12 },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.lineStrong },
  summary: { padding: 18, borderRadius: 6, backgroundColor: palette.paperGlow, borderWidth: 1, borderColor: palette.line },
  code: { fontFamily: fontFamily.mono, fontSize: 13, color: palette.ink, backgroundColor: palette.panel },
  codeBlock: { marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: palette.panel },
});
