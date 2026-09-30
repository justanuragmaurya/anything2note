import { useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import Animated, { LinearTransition } from "react-native-reanimated";
import type { Folder, LibraryItem, SourceKind } from "@a2n/shared";
import { ItemCard, SOURCE_ICON, detecting } from "@/components/library/ItemCard";
import { TextPrompt } from "@/components/prompt/TextPrompt";
import { ArtPlaceholder, Body, Button, Chip, Display, Eyebrow, Icon, PressableScale, Rise, Screen, SerifAccent, Skeleton } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { showMenu } from "@/lib/menu";
import { NOTE_TYPES, type NoteTypeKey } from "@/lib/note-types";
import { isWorking, useCreateFolder, useDeleteFolder, useLibrary, useMoveToFolder } from "@/lib/queries";
import { fontFamily, palette } from "@/theme";

const SOURCE_LABEL: Record<SourceKind, string> = {
  youtube: "YouTube",
  recording: "Recordings",
  audio: "Audio",
  video: "Video",
  pdf: "PDFs",
  docx: "Word",
  slides: "Slides",
  image: "Images",
  text: "Text",
  web: "Web pages",
};

export default function Library() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NoteTypeKey | "all">("all");
  const [kind, setKind] = useState<SourceKind | "all">("all");
  const [folderId, setFolderId] = useState<string | "all">("all");
  const [refreshing, setRefreshing] = useState(false);
  /** The folder prompt is open; with an item, that item moves into the new folder. */
  const [newFolder, setNewFolder] = useState<{ moving?: LibraryItem } | null>(null);
  const library = useLibrary();
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();
  const move = useMoveToFolder();
  const all = library.data?.items;
  const folders = useMemo(() => library.data?.folders ?? [], [library.data?.folders]);
  // A folder deleted elsewhere drops the filter back to everything.
  const folder = folders.find((f) => f.id === folderId) ?? null;
  const inFolder = (i: LibraryItem) => !folder || i.folderId === folder.id;

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (all ?? []).filter(
      (i) =>
        (!folder || i.folderId === folder.id) &&
        (kind === "all" || i.source === kind) &&
        (filter === "all" || (i.noteType === filter && !detecting(i))) &&
        (!q || i.title.toLowerCase().includes(q) || i.sourceLabel.toLowerCase().includes(q)),
    );
  }, [all, query, filter, kind, folder]);

  // Only the kinds actually in the library are worth offering.
  const kinds = useMemo(() => (Object.keys(SOURCE_LABEL) as SourceKind[]).filter((k) => all?.some((i) => i.source === k)), [all]);
  const folderName = useMemo(() => new Map(folders.map((f) => [f.id, f.name])), [folders]);
  const filtered = !!query || filter !== "all" || kind !== "all" || !!folder;

  const processing = (all ?? []).filter((i) => isWorking(i.status)).length;
  const shown = (all ?? []).filter(inFolder).length;
  // Offline with nothing saved yet, the query waits (paused) rather than failing.
  const offline = library.fetchStatus === "paused";
  const summary = !all
    ? library.isError || offline
      ? "Offline"
      : "Loading…"
    : all.length
      ? `${folder ? `${folder.name} · ` : ""}${shown} ${shown === 1 ? "item" : "items"}${processing && !folder ? ` · ${processing} processing` : ""}`
      : "No items yet";

  const clearFilters = () => {
    setQuery("");
    setFilter("all");
    setKind("all");
    setFolderId("all");
  };

  const pickKind = () =>
    showMenu("Show items from", [
      { label: "Any source", onPress: () => setKind("all") },
      ...kinds.map((k) => ({ label: SOURCE_LABEL[k], onPress: () => setKind(k) })),
    ]);

  const moveTo = (item: LibraryItem, to: string | null) =>
    move.mutate({ id: item.id, folderId: to }, { onError: (e) => Alert.alert("Couldn't move it", errorMessage(e)) });

  const itemMenu = (item: LibraryItem) => {
    haptic.select();
    showMenu(item.title, [
      ...folders.filter((f) => f.id !== item.folderId).map((f) => ({ label: `Move to ${f.name}`, onPress: () => moveTo(item, f.id) })),
      ...(item.folderId ? [{ label: "Remove from folder", onPress: () => moveTo(item, null) }] : []),
      { label: "New folder…", onPress: () => setNewFolder({ moving: item }) },
    ]);
  };

  const folderMenu = (f: Folder) => {
    haptic.select();
    Alert.alert(`Delete “${f.name}”?`, "The items in it stay in your library, just without a folder.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete folder",
        style: "destructive",
        onPress: () => {
          if (folderId === f.id) setFolderId("all");
          deleteFolder.mutate(f.id, { onError: (e) => Alert.alert("Couldn't delete the folder", errorMessage(e)) });
        },
      },
    ]);
  };

  const addFolder = async (name: string) => {
    const { folder: created } = await createFolder.mutateAsync(name);
    const moving = newFolder?.moving;
    if (moving) moveTo(moving, created.id);
    else setFolderId(created.id);
  };

  const refresh = async () => {
    setRefreshing(true);
    haptic.tap();
    await library.refetch();
    setRefreshing(false);
  };

  return (
    <Screen>
      {/* Header, search and filters stay put; only the list scrolls. */}
      <View style={styles.header}>
        <Rise className="px-5 pt-4">
          <Eyebrow>{summary}</Eyebrow>
          <Display size={44} style={{ marginTop: 6 }}>
            Your <SerifAccent size={50}>library</SerifAccent>
          </Display>
        </Rise>

        <Rise delay={60} className="mx-5 mt-4 h-12 flex-row items-center gap-2.5 rounded-full border border-line bg-card px-4">
          <Icon name="search" size={16} color={palette.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search titles and sources"
            placeholderTextColor={palette.muted}
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={{ flex: 1, fontFamily: fontFamily.sans, fontSize: 15, color: palette.ink, height: "100%" }}
          />
        </Rise>

        <Rise delay={100}>
          {/* Folders: tap to filter, long-press to delete. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 14 }}>
            <Chip label="All items" active={!folder} onPress={() => setFolderId("all")} />
            {folders.map((f) => (
              <PressableScale
                key={f.id}
                haptics="select"
                onPress={() => setFolderId(folder?.id === f.id ? "all" : f.id)}
                onLongPress={() => folderMenu(f)}
                accessibilityRole="button"
                accessibilityState={{ selected: folder?.id === f.id }}
                accessibilityHint="Long-press to delete the folder"
              >
                <Chip label={f.name} icon="folder" active={folder?.id === f.id} />
              </PressableScale>
            ))}
            <Chip label="New folder" icon="add" onPress={() => setNewFolder({})} />
          </ScrollView>
        </Rise>

        <Rise delay={120}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 }}>
            <Chip
              label={kind === "all" ? "Any source" : SOURCE_LABEL[kind]}
              icon={kind === "all" ? "chevronDown" : SOURCE_ICON[kind]}
              active={kind !== "all"}
              onPress={pickKind}
            />
            <View style={styles.chipDivider} />
            <Chip label="All types" active={filter === "all"} onPress={() => setFilter("all")} />
            {NOTE_TYPES.map((n) => (
              <Chip key={n.key} label={n.label} noteType={n.key} active={filter === n.key} onPress={() => setFilter(filter === n.key ? "all" : n.key)} />
            ))}
          </ScrollView>
        </Rise>
      </View>
      <Animated.FlatList
        data={items}
        keyExtractor={(i) => i.id}
        itemLayoutAnimation={LinearTransition.springify().damping(18)}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 32, gap: 10 }}
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.red500} colors={[palette.red500]} />}
        renderItem={({ item, index }) => (
          <Rise index={Math.min(index, 6)} delay={140} className="px-5">
            <ItemCard item={item} folder={folder ? undefined : item.folderId ? folderName.get(item.folderId) : undefined} onLongPress={() => itemMenu(item)} />
          </Rise>
        )}
        ListEmptyComponent={
          library.isPending && !offline ? (
            <View style={{ gap: 10, paddingHorizontal: 20 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={96} radius={22} />
              ))}
            </View>
          ) : !all ? (
            <Rise className="items-center px-8 pt-10">
              <Display size={26} style={{ textAlign: "center" }}>
                Couldn&apos;t load your <SerifAccent size={30}>library</SerifAccent>.
              </Display>
              <Body style={{ textAlign: "center", marginTop: 8 }}>
                {offline ? "You're offline. Your library loads as soon as you're back online." : errorMessage(library.error)}
              </Body>
              <Button style={{ marginTop: 18 }} variant="ink" leadingIcon="refresh" loading={library.isFetching} onPress={() => void library.refetch()}>
                Try again
              </Button>
            </Rise>
          ) : (
          <Rise className="items-center px-8 pt-6">
            <ArtPlaceholder id="empty-library" width={260} />
            <Display size={28} style={{ marginTop: 20, textAlign: "center" }}>
              Nothing here <SerifAccent size={32}>yet</SerifAccent>.
            </Display>
            <Body style={{ textAlign: "center", marginTop: 8 }}>
              {filtered
                ? folder && !shown
                  ? "This folder is empty. Long-press an item in your library to move it here."
                  : "No items match. Try another filter or search."
                : "Record a lecture, paste a link or upload a PDF to make your first notes."}
            </Body>
            <View className="mt-5 flex-row gap-2">
              {filtered ? (
                <Button variant="ghost" onPress={clearFilters}>
                  Clear filters
                </Button>
              ) : null}
              <Button onPress={() => router.navigate("/add")} icon="add">
                Add something
              </Button>
            </View>
          </Rise>
          )
        }
        ListFooterComponent={
          items.length ? (
            <PressableScale onPress={() => router.navigate("/add")} style={styles.addMore}>
              <Eyebrow color={palette.inkSoft}>+ Add anything</Eyebrow>
            </PressableScale>
          ) : null
        }
      />

      <TextPrompt
        visible={!!newFolder}
        title={newFolder?.moving ? "Move to a new folder" : "New folder"}
        message={newFolder?.moving ? newFolder.moving.title : undefined}
        placeholder="e.g. Biology 101"
        confirmLabel={newFolder?.moving ? "Create & move" : "Create"}
        valid={(v) => v.trim().length > 0 && v.trim().length <= 60}
        onSubmit={addFolder}
        onClose={() => setNewFolder(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  chipDivider: { width: StyleSheet.hairlineWidth, marginVertical: 6, backgroundColor: palette.lineStrong },
  addMore: {
    marginHorizontal: 20,
    marginTop: 2,
    alignItems: "center",
    paddingVertical: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: palette.lineStrong,
  },
});
