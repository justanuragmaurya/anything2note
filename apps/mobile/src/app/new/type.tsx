import { ScrollView, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { NoteTypeCard } from "@/components/note-type/NoteTypeCard";
import { Body, Eyebrow, H, Rise, SerifAccent } from "@/components/ui";
import { parseSource } from "@/lib/flow";
import { NOTE_TYPES, type NoteType } from "@/lib/note-types";
import { useSession } from "@/lib/session";
import { palette } from "@/theme";

/** Sheet: pick what kind of content this is. */
export default function PickType() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ source?: string; label?: string }>();
  const source = parseSource(params.source);
  const label = params.label ?? "New item";
  const { prefs } = useSession();
  const cardW = (Math.min(width, 520) - 20 * 2 - 10) / 2;
  const options: (NoteType | "auto")[] = ["auto", ...NOTE_TYPES];

  const pick = (t: NoteType | "auto") => {
    router.back();
    router.push({ pathname: "/new/outputs", params: { source, label, type: t === "auto" ? "auto" : t.key } });
  };

  return (
    // Form sheets size around a root ScrollView, so the heading is pinned with a sticky header.
    <ScrollView style={{ backgroundColor: palette.paper }} contentContainerStyle={{ paddingBottom: 48 }} stickyHeaderIndices={[0]}>
      <Rise style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 16, backgroundColor: palette.paper }}>
        <Eyebrow numberOfLines={1}>{label}</Eyebrow>
        <H level={1} style={{ marginTop: 6 }}>
          What <SerifAccent>is</SerifAccent> it?
        </H>
        <Body style={{ marginTop: 6 }}>The type decides which notes you get. You can change it later.</Body>
      </Rise>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 20 }}>
        {options.map((t, i) => (
          <Rise key={t === "auto" ? "auto" : t.key} index={i} delay={80}>
            <NoteTypeCard
              type={t}
              width={cardW}
              selected={(t === "auto" && prefs.defaultNoteType === "auto") || (t !== "auto" && prefs.defaultNoteType === t.key)}
              onPress={() => pick(t)}
            />
          </Rise>
        ))}
      </View>
    </ScrollView>
  );
}
