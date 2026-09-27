import { StyleSheet, View } from "react-native";
import { Eyebrow, Icon, PressableScale, SerifAccent, Small } from "@/components/ui";
import type { NoteType } from "@/lib/note-types";
import { palette } from "@/theme";
import { NoteTypeShape } from "./NoteTypeShape";

type Props = { type: NoteType | "auto"; onPress: () => void; selected?: boolean; width: number };

/** Editorial colour card: nt-* fill, abstract motif, serif title, mono footer. */
export function NoteTypeCard({ type, onPress, selected, width }: Props) {
  const auto = type === "auto";
  const bg = auto ? palette.night : type.color;
  const fg = auto ? palette.nightText : palette.ink;
  return (
    <PressableScale onPress={onPress} scaleTo={0.96} haptics="select" style={[styles.card, { width, backgroundColor: bg }, selected && styles.selected]}>
      <View style={{ height: 54, marginHorizontal: -4 }}>
        {auto ? (
          <View style={styles.autoMotif}>
            <Icon name="sparkles" size={30} color={palette.red400} />
          </View>
        ) : (
          <NoteTypeShape type={type.key} width={width - 24} height={54} />
        )}
      </View>
      <SerifAccent upright color={fg} size={25} style={{ marginTop: 12 }}>
        {auto ? "Auto-detect" : type.label}
      </SerifAccent>
      <Small numberOfLines={2} style={{ color: auto ? palette.nightMuted : palette.inkSoft, marginTop: 2, minHeight: 36 }}>
        {auto ? "We'll read it and pick the best fit." : type.blurb}
      </Small>
      <Eyebrow color={auto ? palette.nightMuted : palette.inkSoft} style={{ marginTop: 10 }}>
        {auto ? "Recommended" : `${type.defaults.length} outputs`}
      </Eyebrow>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 6, padding: 12, paddingBottom: 14, overflow: "hidden" },
  selected: { borderWidth: 2, borderColor: palette.ink },
  autoMotif: { flex: 1, alignItems: "flex-start", justifyContent: "center", paddingLeft: 6 },
});
