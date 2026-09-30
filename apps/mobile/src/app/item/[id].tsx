import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { youtubeIdOf, type Anchor, type ItemDetail, type OutputKey } from "@a2n/shared";
import { useActionMenu } from "@/components/item/ActionMenu";
import { AddOutputSheet, NoteTypeSheet, RenameSheet, ShareSheet, addableOutputs } from "@/components/item/ItemSheets";
import { OutputView } from "@/components/item/OutputView";
import { PdfViewer, type PdfHandle } from "@/components/item/PdfViewer";
import { FileVideoPlayer, Player, YouTubePlayer, type VideoHandle } from "@/components/item/Player";
import { SourcePanel } from "@/components/item/SourcePanel";
import { Chat } from "@/components/item/renderers/Chat";
import { Transcript } from "@/components/item/renderers/Transcript";
import { STEP_LABEL, detecting, lengthLabel } from "@/components/library/ItemCard";
import { TopBar } from "@/components/navigation/TopBar";
import { AnchorContext, Body, Button, Display, Eyebrow, Icon, PressableScale, ProgressBar, Rise, Skeleton, SlidingTabs, Small, type TabItem } from "@/components/ui";
import { ApiError, errorMessage } from "@/lib/api";
import { exportDocx, exportPdf, hasReadyOutput, shareMarkdown } from "@/lib/export";
import { fmtDay } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { OUTPUT_LABELS, noteType } from "@/lib/note-types";
import { useDeleteItem, useItem, useRetryItem } from "@/lib/queries";
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

type SheetKey = "rename" | "share" | "add" | "type";
type PageView = "original" | "text";

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
  const { menu, open: openMenu } = useActionMenu();
  const [sheet, setSheet] = useState<SheetKey | null>(null);
  const [exporting, setExporting] = useState(false);

  // Every fetch re-signs the media URL; keep the first one so the player isn't rebuilt on each poll.
  const [mediaUrl, setMediaUrl] = useState(detail.mediaUrl);
  if (!mediaUrl && detail.mediaUrl) setMediaUrl(detail.mediaUrl);
  const mediaType = detail.mediaType;
  const audio = !!mediaUrl && !!mediaType?.startsWith("audio/");
  const fileVideo = !!mediaUrl && !!mediaType?.startsWith("video/");
  const pdf = !!mediaUrl && mediaType === "application/pdf";
  const player = useAudioPlayer(audio ? { uri: mediaUrl } : null, { updateInterval: 250 });
  const playback = useAudioPlayerStatus(player);

  // YouTube sources have no media URL of their own; the video is embedded instead.
  const youtubeId = item.source === "youtube" ? (item.youtubeId ?? (item.sourceUrl ? youtubeIdOf(item.sourceUrl) : null)) : null;

  useEffect(() => {
    // Play through the loudspeaker even with the silent switch on (the embedded video's web view too).
    if (audio || fileVideo || youtubeId) void setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
  }, [audio, fileVideo, youtubeId]);

  // The YouTube embed and a video upload are both driven through this handle.
  const video = useRef<VideoHandle>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const markVideoReady = useCallback(() => setVideoReady(true), []);
  const picture = !!youtubeId || fileVideo;

  // Whichever player the item has, seen the same way by anchor chips, ?t= deep links and the transcript.
  const seekable = picture || audio;
  const mediaReady = picture ? videoReady : playback.isLoaded;
  const mediaTime = picture ? videoTime : playback.currentTime;
  const playFrom = useCallback(
    (s: number) => {
      if (picture) return video.current?.playFrom(s);
      void player.seekTo(s);
      player.play();
    },
    [picture, player],
  );

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
  // PDFs open on the original pages; the extracted text is a tap away.
  const [pageView, setPageView] = useState<PageView>("original");
  const showPdf = pdf && pageView === "original";
  const pdfView = useRef<PdfHandle>(null);
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
      if (seekable) playFrom(a.at);
      return;
    }
    setPage(a.page);
    if (showPdf) {
      // A mounted viewer scrolls there; otherwise it opens at `page`.
      if (current === "content") pdfView.current?.goTo(a.page);
    } else {
      const y = pageY.current.get(a.page);
      if (current === "content" && y !== undefined) scroll.current?.scrollTo({ y: y + 10, animated: true });
      else pendingPage.current = a.page;
    }
    setTab("content");
  };

  // Deep links from Tasks / Review arrive with ?t= or ?p=. A page opens the Pages tab there (initial
  // state above); a time plays from that moment once the stream or video has loaded.
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || initialAnchor?.kind !== "time" || !seekable || !mediaReady) return;
    jumped.current = true;
    playFrom(initialAnchor.at);
  }, [initialAnchor, seekable, mediaReady, playFrom]);

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

  const runExport = (what: string, run: (d: ItemDetail) => Promise<void>) => async () => {
    setExporting(true);
    try {
      await run(detail);
    } catch (e) {
      Alert.alert(`Couldn't export ${what}`, errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const exportMenu = () =>
    openMenu("Export", [
      { label: "PDF", onPress: () => void runExport("the PDF", exportPdf)() },
      { label: "Word document", onPress: () => void runExport("the Word file", exportDocx)() },
      { label: "Markdown (as text)", onPress: () => void runExport("Markdown", shareMarkdown)() },
    ]);

  // A fresh signed URL each fetch; the first one may have expired by the time "Open original" is tapped.
  const originalUrl = detail.mediaUrl ?? mediaUrl;
  const openOriginal = originalUrl ? () => void WebBrowser.openBrowserAsync(originalUrl) : undefined;
  const watchUrl = item.sourceUrl;
  const settled = item.status.state === "ready";
  const anyFailed = item.status.state === "failed" || Object.values(detail.outputs).some((o) => o?.status === "failed");
  const more = () =>
    openMenu(item.title, [
      { label: detail.share ? "Shared link…" : "Share link…", onPress: () => setSheet("share") },
      ...(hasReadyOutput(detail) ? [{ label: "Export…", onPress: exportMenu }] : []),
      ...(settled && addableOutputs(item).length ? [{ label: "Add outputs…", onPress: () => setSheet("add") }] : []),
      ...(settled ? [{ label: "Change note type…", onPress: () => setSheet("type") }] : []),
      { label: "Rename", onPress: () => setSheet("rename") },
      ...(youtubeId && watchUrl
        ? [{ label: "Open on YouTube", onPress: () => void Linking.openURL(watchUrl) }]
        : openOriginal
          ? [{ label: "Open original", onPress: openOriginal }]
          : []),
      ...(anyFailed ? [{ label: "Retry failed parts", onPress: () => retry.mutate(item.id, { onError: (e) => Alert.alert("Couldn't retry", errorMessage(e)) }) }] : []),
      { label: "Delete", destructive: true, onPress: confirmDelete },
    ]);

  const { status } = item;
  const pageSwitch = current === "content" && pdf;

  return (
    <AnchorContext.Provider value={jump}>
      <StatusBar style={focused ? "light" : "dark"} />
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <TopBar
          tone="night"
          title={[detecting(item) ? "Detecting type" : nt.label, lengthLabel(item), fmtDay(item.createdAt)].filter(Boolean).join(" · ")}
          right={
            <PressableScale onPress={more} disabled={exporting} hitSlop={10} accessibilityLabel={exporting ? "Exporting" : "More"} style={styles.more}>
              {exporting ? <ActivityIndicator size="small" color={palette.nightText} /> : <Icon name="more" size={16} color={palette.nightText} />}
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
        {youtubeId ? (
          <YouTubePlayer ref={video} videoId={youtubeId} url={item.sourceUrl} label={item.sourceLabel} onReady={markVideoReady} onTime={setVideoTime} />
        ) : fileVideo && mediaUrl ? (
          <FileVideoPlayer ref={video} uri={mediaUrl} label={item.sourceLabel} onReady={markVideoReady} onTime={setVideoTime} />
        ) : audio ? (
          <Player player={player} status={playback} durationHint={item.durationSec} label={item.sourceLabel} />
        ) : (
          <SourcePanel item={item} mediaUrl={mediaUrl} mediaType={mediaType} />
        )}

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheet} keyboardVerticalOffset={0}>
          <View style={styles.sheetHead}>
            <SlidingTabs scrollable size="sm" value={current} onChange={setTab} items={tabs} />
          </View>

          {pageSwitch ? (
            <View style={styles.subHead}>
              <SlidingTabs
                size="sm"
                value={pageView}
                onChange={setPageView}
                items={[
                  { value: "original", label: "Original" },
                  { value: "text", label: "Text" },
                ]}
              />
            </View>
          ) : null}

          {current === "chat" ? (
            <View style={{ flex: 1, paddingBottom: insets.bottom }}>
              <Chat detail={detail} />
            </View>
          ) : current === "content" && showPdf ? (
            <View style={{ flex: 1, paddingBottom: insets.bottom }}>
              <PdfViewer
                ref={pdfView}
                itemId={item.id}
                url={detail.mediaUrl ?? mediaUrl}
                initialPage={page}
                onOpenOriginal={openOriginal}
                onShowText={content ? () => setPageView("text") : undefined}
              />
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
                    <Transcript content={content} time={mediaTime} page={page} onPageY={onPageY} />
                  ) : (
                    <OutputView output={current} detail={detail} />
                  )}
                </Rise>
              </Animated.View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>

      {menu}
      {sheet === "rename" ? <RenameSheet item={item} onClose={() => setSheet(null)} /> : null}
      {sheet === "share" ? <ShareSheet detail={detail} onClose={() => setSheet(null)} /> : null}
      {sheet === "add" ? <AddOutputSheet item={item} onClose={() => setSheet(null)} onAdded={setTab} /> : null}
      {sheet === "type" ? <NoteTypeSheet item={item} onClose={() => setSheet(null)} /> : null}
    </AnchorContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.night },
  more: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.nightLine, backgroundColor: palette.night2 },
  sheet: { flex: 1, marginTop: 14, backgroundColor: palette.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 80 },
  sheetHead: { paddingTop: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.lineStrong },
  subHead: { alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  failed: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
});
