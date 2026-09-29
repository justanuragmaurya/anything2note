import { StyleSheet, View } from "react-native";
import type { ItemDetail } from "@a2n/shared";
import { AnchorChip, Body, Eyebrow, Label } from "@/components/ui";
import { palette } from "@/theme";

type Content = NonNullable<ItemDetail["content"]>;

type Props = {
  content: Content | null;
  /** Playback position (media): the line nearest the playhead is highlighted. */
  time?: number;
  /** Page to highlight and scroll to (documents), from a tapped page anchor. */
  page?: number | null;
  /** Reports where each page sits inside this view, so the parent can scroll to one. */
  onPageY?: (page: number, y: number) => void;
};

/** What was extracted from the source: timed transcript lines, pages, or paragraphs. */
export function Transcript({ content, time = 0, page, onPageY }: Props) {
  if (!content || !content.segments.length) return <Body>The source hasn&apos;t been read yet. Its text shows up here once it has.</Body>;
  const segs = content.segments;

  if (content.kind === "media") {
    const activeIdx = segs.reduce((acc, s, i) => (s.anchor?.kind === "time" && s.anchor.at <= time ? i : acc), -1);
    return (
      <View style={{ gap: 4 }}>
        {segs.map((s, i) => (
          <View key={s.id} style={[styles.line, i === activeIdx && styles.active]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {s.speaker ? <Label style={{ fontSize: 13 }}>{s.speaker}</Label> : null}
              {s.anchor ? <AnchorChip anchor={s.anchor} /> : null}
            </View>
            <Body selectable style={{ marginTop: 4, fontSize: 14 }}>
              {s.text}
            </Body>
          </View>
        ))}
      </View>
    );
  }

  if (content.kind === "document") {
    return (
      <View style={{ gap: 10 }}>
        {segs.map((s) => {
          const n = s.anchor?.kind === "page" ? s.anchor.page : null;
          const focused = n !== null && n === page;
          return (
            <View key={s.id} style={[styles.page, focused && styles.active]} onLayout={n !== null && onPageY ? (e) => onPageY(n, e.nativeEvent.layout.y) : undefined}>
              {n !== null ? <Eyebrow color={focused ? palette.red600 : palette.muted}>Page {n}</Eyebrow> : null}
              {s.heading ? <Label style={{ marginTop: 6 }}>{s.heading}</Label> : null}
              <Body selectable style={{ marginTop: 6, fontSize: 14 }}>
                {s.text}
              </Body>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {segs.map((s) => (
        <View key={s.id}>
          {s.heading ? <Label style={{ marginBottom: 4 }}>{s.heading}</Label> : null}
          <Body selectable style={{ fontSize: 14 }}>
            {s.text}
          </Body>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { padding: 12, borderRadius: 14 },
  page: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.card },
  active: { backgroundColor: palette.red50 },
});
