import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import type { LibraryItem, SourceKind } from "@a2n/shared";
import { Button, Eyebrow, Icon, Label, PressableScale, Skeleton, Small, type IconName } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { fmtDay } from "@/lib/format";
import { noteType } from "@/lib/note-types";
import { isWorking, useRetryItem } from "@/lib/queries";
import { palette } from "@/theme";

export const SOURCE_ICON: Record<SourceKind, IconName> = {
  recording: "mic",
  audio: "waveform",
  video: "video",
  youtube: "youtube",
  pdf: "pdf",
  docx: "doc",
  slides: "slides",
  image: "photo",
  web: "link",
  text: "text",
};

export const STEP_LABEL = { extracting: "Reading", transcribing: "Transcribing", generating: "Writing notes" } as const;

/** "22 min", "15 pages", "Image"… */
export function lengthLabel(item: LibraryItem): string {
  if (item.durationSec) return item.durationSec < 60 ? `${Math.round(item.durationSec)} sec` : `${Math.round(item.durationSec / 60)} min`;
  if (item.source === "image") return "Image";
  if (item.pages) return `${item.pages} ${item.pages === 1 ? "page" : "pages"}`;
  return item.source === "web" ? "Web page" : item.source === "text" ? "Text" : "";
}

/** While "Auto-detect" is still reading, the API has no type yet (it reports "general" with no outputs). */
export const detecting = (item: LibraryItem) => isWorking(item.status) && item.outputs.length === 0;

export function ItemCard({ item }: { item: LibraryItem }) {
  const nt = noteType(item.noteType);
  const retry = useRetryItem();
  const { status } = item;
  const tint = detecting(item) ? palette.panel : nt.color;
  const meta = [detecting(item) ? "Detecting type" : nt.label, lengthLabel(item), fmtDay(item.createdAt)].filter(Boolean).join(" · ");

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => router.push({ pathname: "/item/[id]", params: { id: item.id } })}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={[styles.strip, { backgroundColor: tint }]} />
      <View style={styles.body}>
        <View style={styles.top}>
          <View style={[styles.source, { backgroundColor: tint }]}>
            <Icon name={SOURCE_ICON[item.source]} size={15} color={palette.ink} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Label numberOfLines={2}>{item.title}</Label>
            <Small numberOfLines={1}>{meta}</Small>
          </View>
          <Icon name="forward" size={14} color={palette.muted} />
        </View>

        {status.state === "ready" ? (
          <View style={styles.footer}>
            <Eyebrow numberOfLines={1} style={{ flex: 1 }}>
              {item.sourceLabel}
            </Eyebrow>
            <View style={styles.ready}>
              <View style={styles.readyDot} />
              <Eyebrow color={palette.inkSoft}>
                {item.outputs.length} outputs{item.flashcardsDue ? ` · ${item.flashcardsDue} due` : ""}
              </Eyebrow>
            </View>
          </View>
        ) : status.state === "failed" ? (
          <View style={{ marginTop: 12, gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
              <Icon name="info" size={14} color={palette.red600} style={{ marginTop: 1 }} />
              <Small style={{ flex: 1, color: palette.red700 }}>{retry.isError ? errorMessage(retry.error) : status.error}</Small>
            </View>
            <Button size="sm" variant="ghost" leadingIcon="retry" loading={retry.isPending} onPress={() => retry.mutate(item.id)}>
              Retry
            </Button>
          </View>
        ) : (
          <View style={{ marginTop: 12, gap: 8 }}>
            <View style={styles.footer}>
              <Eyebrow color={palette.red600}>{status.state === "queued" ? "Queued" : `${STEP_LABEL[status.step]}…`}</Eyebrow>
              <Eyebrow>{status.state === "processing" ? `${Math.round(status.progress)}%` : ""}</Eyebrow>
            </View>
            {/* Queued has no progress yet, so it shimmers full width instead of showing a number. */}
            <Skeleton height={6} radius={3} tone="red" width={status.state === "processing" ? `${Math.max(4, Math.min(100, status.progress))}%` : "100%"} />
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
