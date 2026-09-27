import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Eyebrow, Icon, Label, PressableScale, Skeleton, Small, type IconName } from "@/components/ui";
import { fmtTime } from "@/lib/format";
import type { Item, SourceKind } from "@/lib/mock/types";
import { noteType } from "@/lib/note-types";
import { palette } from "@/theme";

export const SOURCE_ICON: Record<SourceKind, IconName> = {
  recording: "mic",
  upload: "waveform",
  youtube: "youtube",
  pdf: "pdf",
  photo: "photo",
  link: "link",
  text: "text",
};

const STAGE_LABEL = { extracting: "Extracting", transcribing: "Transcribing", generating: "Writing notes" } as const;

export function ItemCard({ item }: { item: Item }) {
  const nt = noteType(item.type);
  const ready = item.status === "ready";
  const outputs = Object.keys(item.outputs).length;
  const length = item.duration ? `${Math.round(item.duration / 60)} min` : item.pages ? `${item.pages} pages` : "Image";

  return (
    <PressableScale
      disabled={!ready}
      scaleTo={0.98}
      onPress={() => router.push({ pathname: "/item/[id]", params: { id: item.id } })}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={[styles.strip, { backgroundColor: nt.color }]} />
      <View style={styles.body}>
        <View style={styles.top}>
          <View style={[styles.source, { backgroundColor: nt.color }]}>
            <Icon name={SOURCE_ICON[item.source]} size={15} color={palette.ink} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Label numberOfLines={2}>{item.title}</Label>
            <Small numberOfLines={1}>
              {nt.label} · {length} · {item.createdAt}
            </Small>
          </View>
          {ready ? <Icon name="forward" size={14} color={palette.muted} /> : null}
        </View>

        {ready ? (
          <View style={styles.footer}>
            <Eyebrow numberOfLines={1} style={{ flex: 1 }}>
              {item.sourceLabel}
            </Eyebrow>
            <View style={styles.ready}>
              <View style={styles.readyDot} />
              <Eyebrow color={palette.inkSoft}>{outputs} outputs</Eyebrow>
            </View>
          </View>
        ) : (
          <View style={{ marginTop: 12, gap: 8 }}>
            <View style={styles.footer}>
              <Eyebrow color={palette.red600}>
                {item.status === "queued" ? "Queued" : `${STAGE_LABEL[item.stage ?? "extracting"]}…`}
              </Eyebrow>
              <Eyebrow>{item.progress ? `${Math.round(item.progress * 100)}%` : item.duration ? fmtTime(item.duration) : ""}</Eyebrow>
            </View>
            <Skeleton height={6} radius={3} tone="red" width={`${Math.round((item.progress ?? 0.12) * 100)}%`} />
          </View>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: palette.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    overflow: "hidden",
    shadowColor: "#3c140a",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
  },
  strip: { width: 6 },
  body: { flex: 1, padding: 14, paddingLeft: 14 },
  top: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  source: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  ready: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  readyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.success },
});
