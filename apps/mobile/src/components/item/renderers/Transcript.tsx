import { StyleSheet, View } from "react-native";
import { Body, Label, TimestampChip } from "@/components/ui";
import type { TranscriptLine } from "@/lib/mock/types";
import { palette } from "@/theme";

/** Speaker-labelled transcript; the line nearest the playhead is highlighted. */
export function Transcript({ lines, time }: { lines: TranscriptLine[]; time: number }) {
  const activeIdx = lines.reduce((acc, l, i) => (l.at <= time ? i : acc), -1);
  if (!lines.length) return <Body>No transcript for this source — the text was extracted directly.</Body>;
  return (
    <View style={{ gap: 4 }}>
      {lines.map((l, i) => (
        <View key={`${l.at}-${i}`} style={[styles.line, i === activeIdx && styles.active]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Label style={{ fontSize: 13 }}>{l.speaker}</Label>
            <TimestampChip at={l.at} />
          </View>
          <Body style={{ marginTop: 4, fontSize: 14 }}>{l.text}</Body>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { padding: 12, borderRadius: 14 },
  active: { backgroundColor: palette.red50 },
});
