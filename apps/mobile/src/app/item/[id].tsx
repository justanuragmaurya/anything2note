import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import type { Anchor, ItemDetail, OutputKey } from "@a2n/shared";
import { OutputView } from "@/components/item/OutputView";
import { Player } from "@/components/item/Player";
import { SourcePanel } from "@/components/item/SourcePanel";
import { Chat } from "@/components/item/renderers/Chat";
import { Transcript } from "@/components/item/renderers/Transcript";
import { STEP_LABEL, detecting, lengthLabel } from "@/components/library/ItemCard";
import { TopBar } from "@/components/navigation/TopBar";
import { AnchorContext, Body, Button, Display, Eyebrow, Icon, PressableScale, ProgressBar, Rise, Skeleton, SlidingTabs, Small, type TabItem } from "@/components/ui";
import { ApiError, errorMessage } from "@/lib/api";
import { fmtDay } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { showMenu } from "@/lib/menu";
import { OUTPUT_LABELS, noteType } from "@/lib/note-types";
import { useDeleteItem, useItem, useRenameItem, useRetryItem } from "@/lib/queries";
import { palette } from "@/theme";

type TabKey = OutputKey | "content" | "chat";

/** Short tab labels for the long registry names. */
const SHORT: Partial<Record<OutputKey, string>> = {
  summary: "Summary",
  detailed_notes: "Notes",
  revision_points: "Revision",
  tasks: "Tasks",
  mind_map: "Mind map",
  step_by_step: "Steps",
  code_snippets: "Code",
  scorecard: "Scorecard",
  follow_up_questions: "Follow-ups",
  critique: "Critique",
};

const CONTENT_LABEL = { media: "Transcript", document: "Pages", text: "Source" } as const;

/** The source tab is there from the start, named for what the source will become once read. */
function contentLabel(d: ItemDetail): string {
  if (d.content) return CONTENT_LABEL[d.content.kind];
  const s = d.item.source;
  return s === "audio" || s === "video" || s === "recording" || s === "youtube" ? "Transcript" : s === "text" || s === "web" ? "Source" : "Pages";
}

export default function ItemScreen() {
  const { id, t, p } = useLocalSearchParams<{ id: string; t?: string; p?: string }>();
  const { data, error, isPending, refetch, isRefetching } = useItem(id);
  const insets = useSafeAreaInsets();
  // Screens below in the stack stay mounted; only claim the light status bar while on top.
  const focused = useIsFocused();

  if (data) {
    const jump: Anchor | undefined = t ? { kind: "time", at: Number(t) } : p ? { kind: "page", page: Number(p) } : undefined;
    return <Workspace detail={data} initialAnchor={jump} focused={focused} refreshing={isRefetching} onRefresh={() => void refetch()} />;
  }

  const missing = error instanceof ApiError && error.status === 404;
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style={focused ? "light" : "dark"} />
      <TopBar tone="night" />
      {isPending ? (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Skeleton width="80%" height={26} tone="red" />
          <Skeleton width="55%" height={26} tone="red" />
          <Skeleton height={100} radius={22} style={{ marginTop: 14, opacity: 0.25 }} />
        </View>
      ) : (
        <View style={styles.missing}>
          <Display size={28} color={palette.nightText} style={{ textAlign: "center" }}>
            {missing ? "Item not found" : "Couldn't load this item"}
          </Display>
          <Body style={{ color: palette.nightMuted, textAlign: "center", marginTop: 8 }}>
            {missing ? "It may have been deleted, or it isn't in your library." : errorMessage(error)}
          </Body>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
            {missing ? null : (
              <Button variant="cream" leadingIcon="refresh" onPress={() => void refetch()}>
                Try again
              </Button>
            )}
            <Button variant="night" onPress={() => (router.canGoBack() ? router.back() : router.replace("/library"))}>
              Back to library
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}

function Workspace({
  detail,
  initialAnchor,
  focused,
  refreshing,
  onRefresh,
}: {
  detail: ItemDetail;
  initialAnchor?: Anchor;
  focused: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { item, content } = detail;
  const insets = useSafeAreaInsets();
  const nt = noteType(item.noteType);
  const retry = useRetryItem();
  const del = useDeleteItem();
  const rename = useRenameItem();

  // Every fetch re-signs the media URL; keep the first one so the player isn't rebuilt on each poll.
  const [mediaUrl, setMediaUrl] = useState(detail.mediaUrl);
  if (!mediaUrl && detail.mediaUrl) setMediaUrl(detail.mediaUrl);
  const mediaType = detail.mediaType;
  const playable = !!mediaUrl && !!mediaType && (mediaType.startsWith("audio/") || mediaType.startsWith("video/"));
  const player = useAudioPlayer(playable ? { uri: mediaUrl } : null, { updateInterval: 250 });
  const playback = useAudioPlayerStatus(player);

  useEffect(() => {
    // Play through the loudspeaker even with the silent switch on.
    if (playable) void setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
  }, [playable]);

  const tabs = useMemo<TabItem<TabKey>[]>(
    () => [
      ...item.outputs.map((k) => ({ value: k as TabKey, label: SHORT[k] ?? OUTPUT_LABELS[k] })),
      { value: "content" as const, label: contentLabel(detail) },
      { value: "chat" as const, label: "Chat" },
    ],
    [item.outputs, detail],
  );
  const [tab, setTab] = useState<TabKey>(() => (initialAnchor ? "content" : (item.outputs[0] ?? "content")));
  // Outputs can appear after the screen opens (auto-detect); fall back if the current tab vanished.
  const current = tabs.some((x) => x.value === tab) ? tab : (tabs[0]?.value ?? "chat");

  const scroll = useRef<ScrollView>(null);
  const [page, setPage] = useState<number | null>(initialAnchor?.kind === "page" ? initialAnchor.page : null);
  // Page positions in the Pages tab, and a page to scroll to once it has been laid out.
  const pageY = useRef(new Map<number, number>());
  const pendingPage = useRef<number | null>(page);
  const onPageY = (n: number, y: number) => {
    pageY.current.set(n, y);
    if (n === pendingPage.current) {
      pendingPage.current = null;
      scroll.current?.scrollTo({ y: y + 10, animated: true });
    }
  };

  const jump = (a: Anchor) => {
    haptic.select();
    if (a.kind === "time") {
      if (!playable) return;
      void player.seekTo(a.at);
      player.play();
      return;
    }
    setPage(a.page);
    const y = pageY.current.get(a.page);
    if (current === "content" && y !== undefined) scroll.current?.scrollTo({ y: y + 10, animated: true });
    else pendingPage.current = a.page;
    setTab("content");
  };

  // Deep links from Tasks / Review arrive with ?t= or ?p=. A page opens the Pages tab there (initial
  // state above); a time plays from that moment once the stream has loaded.
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || initialAnchor?.kind !== "time" || !playback.isLoaded) return;
    jumped.current = true;
    void player.seekTo(initialAnchor.at);
    player.play();
  }, [initialAnchor, playback.isLoaded, player]);

  const confirmDelete = () =>
    Alert.alert("Delete this item?", "Its notes, flashcards, tasks and chat go too. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          del.mutate(item.id, {
            onSuccess: () => (router.canGoBack() ? router.back() : router.replace("/library")),
            onError: (e) => Alert.alert("Couldn't delete", errorMessage(e)),
          }),
      },
    ]);

  const anyFailed = item.status.state === "failed" || Object.values(detail.outputs).some((o) => o?.status === "failed");
  const more = () =>
    showMenu(item.title, [
      ...(Platform.OS === "ios"
        ? [
            {
              label: "Rename",
              onPress: () =>
                Alert.prompt("Rename", undefined, (title) => {
                  if (title?.trim()) rename.mutate({ id: item.id, title: title.trim() }, { onError: (e) => Alert.alert("Couldn't rename", errorMessage(e)) });
                }, "plain-text", item.title),
            },
          ]
        : []),
      ...(mediaUrl ? [{ label: "Open original", onPress: () => void WebBrowser.openBrowserAsync(mediaUrl) }] : []),
      ...(anyFailed ? [{ label: "Retry failed parts", onPress: () => retry.mutate(item.id, { onError: (e) => Alert.alert("Couldn't retry", errorMessage(e)) }) }] : []),
      { label: "Delete", destructive: true, onPress: confirmDelete },
    ]);

  const { status } = item;

  return (
    <AnchorContext.Provider value={jump}>
      <StatusBar style={focused ? "light" : "dark"} />
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <TopBar
          tone="night"
          title={[detecting(item) ? "Detecting type" : nt.label, lengthLabel(item), fmtDay(item.createdAt)].filter(Boolean).join(" · ")}
          right={
            <PressableScale onPress={more} hitSlop={10} accessibilityLabel="More" style={styles.more}>
              <Icon name="more" size={16} color={palette.nightText} />
            </PressableScale>
          }
        />
        {/* Pinned header: title, status and source stay put while outputs scroll */}
        <Rise style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          <Display size={24} color={palette.nightText} numberOfLines={2}>
            {item.title}
          </Display>
          {status.state === "queued" || status.state === "processing" ? (
            <View style={{ marginTop: 10, gap: 6 }}>
              <Eyebrow color={palette.red300}>
                {status.state === "queued" ? "Queued" : `${STEP_LABEL[status.step]}… ${Math.round(status.progress)}%`}
              </Eyebrow>
              <ProgressBar value={status.state === "processing" ? status.progress / 100 : 0} track={palette.night3} height={4} />
            </View>
          ) : status.state === "failed" ? (
            <View style={styles.failed}>
              <Small style={{ flex: 1, color: palette.red200 }}>{retry.isError ? errorMessage(retry.error) : status.error}</Small>
              <Button size="sm" variant="cream" leadingIcon="retry" loading={retry.isPending} onPress={() => retry.mutate(item.id)}>
                Retry
              </Button>
            </View>
          ) : null}
        </Rise>
        {playable ? (
          <Player player={player} status={playback} durationHint={item.durationSec} label={item.sourceLabel} video={mediaType?.startsWith("video/")} />
        ) : (
          <SourcePanel item={item} mediaUrl={mediaUrl} mediaType={mediaType} />
        )}

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheet} keyboardVerticalOffset={0}>
          <View style={styles.sheetHead}>
            <SlidingTabs scrollable size="sm" value={current} onChange={setTab} items={tabs} />
          </View>

          {current === "chat" ? (
            <View style={{ flex: 1, paddingBottom: insets.bottom }}>
              <Chat detail={detail} />
            </View>
          ) : (
            <ScrollView
              ref={scroll}
              contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.red500} colors={[palette.red500]} />}
            >
              <Animated.View key={current} entering={FadeIn.duration(220)}>
                <Rise>
                  {current === "content" ? (
                    <Transcript content={content} time={playback.currentTime} page={page} onPageY={onPageY} />
                  ) : (
                    <OutputView output={current} detail={detail} />
                  )}
                </Rise>
              </Animated.View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>
    </AnchorContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.night },
  more: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.nightLine, backgroundColor: palette.night2 },
  sheet: { flex: 1, marginTop: 14, backgroundColor: palette.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 80 },
  sheetHead: { paddingTop: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.lineStrong },
  failed: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
});
