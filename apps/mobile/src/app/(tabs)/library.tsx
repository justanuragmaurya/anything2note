import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, TextInput, View } from "react-native";
import { router } from "expo-router";
import Animated, { LinearTransition } from "react-native-reanimated";
import { ItemCard } from "@/components/library/ItemCard";
import { ArtPlaceholder, Body, Button, Chip, Display, Eyebrow, Icon, PressableScale, Rise, Screen, SerifAccent } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { ITEMS } from "@/lib/mock/items";
import { NOTE_TYPES, type NoteTypeKey } from "@/lib/note-types";
import { fontFamily, palette } from "@/theme";

export default function Library() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NoteTypeKey | "all">("all");
  const [refreshing, setRefreshing] = useState(false);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ITEMS.filter((i) => (filter === "all" || i.type === filter) && (!q || i.title.toLowerCase().includes(q) || i.sourceLabel.includes(q)));
  }, [query, filter]);

  const refresh = () => {
    setRefreshing(true);
    haptic.tap();
    setTimeout(() => setRefreshing(false), 900);
  };

  return (
    <Screen>
      <Animated.FlatList
        data={items}
        keyExtractor={(i) => i.id}
        itemLayoutAnimation={LinearTransition.springify().damping(18)}
        contentContainerStyle={{ paddingBottom: 32, gap: 10 }}
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.red500} colors={[palette.red500]} />}
        ListHeaderComponent={
          <View className="pb-2">
            <Rise className="px-5 pt-4">
              <Eyebrow>{ITEMS.length} items · 2 processing</Eyebrow>
              <Display size={44} style={{ marginTop: 6 }}>
                Your <SerifAccent size={50}>library</SerifAccent>
              </Display>
            </Rise>

            <Rise delay={60} className="mx-5 mt-4 h-12 flex-row items-center gap-2.5 rounded-full border border-line bg-card px-4">
              <Icon name="search" size={16} color={palette.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search notes, transcripts, files"
                placeholderTextColor={palette.muted}
                returnKeyType="search"
                clearButtonMode="while-editing"
                style={{ flex: 1, fontFamily: fontFamily.sans, fontSize: 15, color: palette.ink, height: "100%" }}
              />
            </Rise>

            <Rise delay={120}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 14 }}>
                <Chip label="All" active={filter === "all"} onPress={() => setFilter("all")} />
                {NOTE_TYPES.map((n) => (
                  <Chip key={n.key} label={n.label} noteType={n.key} active={filter === n.key} onPress={() => setFilter(filter === n.key ? "all" : n.key)} />
                ))}
              </ScrollView>
            </Rise>
          </View>
        }
        renderItem={({ item, index }) => (
          <Rise index={Math.min(index, 6)} delay={140} className="px-5">
            <ItemCard item={item} />
          </Rise>
        )}
        ListEmptyComponent={
          <Rise className="items-center px-8 pt-6">
            <ArtPlaceholder id="empty-library" width={260} />
            <Display size={28} style={{ marginTop: 20, textAlign: "center" }}>
              Nothing here <SerifAccent size={32}>yet</SerifAccent>.
            </Display>
            <Body style={{ textAlign: "center", marginTop: 8 }}>
              {query || filter !== "all" ? "No items match. Try another filter or search." : "Record a meeting, paste a link or upload a PDF."}
            </Body>
            <View className="mt-5 flex-row gap-2">
              {query || filter !== "all" ? (
                <Button
                  variant="ghost"
                  onPress={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
              <Button onPress={() => router.navigate("/add")} icon="add">
                Add something
              </Button>
            </View>
          </Rise>
        }
        ListFooterComponent={
          items.length ? (
            <PressableScale onPress={() => router.navigate("/add")} className="mx-5 mt-2 items-center rounded-3xl border border-dashed border-line-strong py-5">
              <Eyebrow color={palette.inkSoft}>+ Add anything</Eyebrow>
            </PressableScale>
          ) : null
        }
      />
    </Screen>
  );
}
