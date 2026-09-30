import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { youtubeThumbnailUrl, type LibraryItem } from "@a2n/shared";
import { SOURCE_ICON } from "@/components/library/ItemCard";
import { NightDots } from "@/components/note-type/NoteTypeShape";
import { Button, Icon, Label, PressableScale, Small } from "@/components/ui";
import { palette } from "@/theme";

const HEIGHT = 96;

const KIND_META: Partial<Record<LibraryItem["source"], string>> = { web: "Web page", youtube: "YouTube video", text: "Pasted text" };

/**
 * Non-media sources: what the notes were made from, with the original one tap away (the upload,
 * the web page, or the video on YouTube).
 */
export function SourcePanel({ item, mediaUrl, mediaType }: { item: LibraryItem; mediaUrl: string | null; mediaType: string | null }) {
  const [w, setW] = useState(0);
  const youtube = item.source === "youtube";
  const original = mediaUrl ?? item.sourceUrl ?? null;
  const thumb = mediaUrl && mediaType?.startsWith("image/") ? mediaUrl : youtube && item.youtubeId ? youtubeThumbnailUrl(item.youtubeId) : null;
  const open = () => {
    if (!original) return;
    // YouTube links hand off to the app when it's installed.
    if (youtube) void Linking.openURL(original);
    else void WebBrowser.openBrowserAsync(original);
  };
  const meta = item.pages ? `${item.pages} ${item.pages === 1 ? "page" : "pages"}` : (KIND_META[item.source] ?? "");

  return (
    <View style={styles.panel} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? <NightDots width={w} height={HEIGHT} /> : null}
      {thumb ? (
        <PressableScale onPress={open} scaleTo={0.95} accessibilityLabel={youtube ? "Open on YouTube" : "Open the original image"}>
          <Image source={{ uri: thumb }} style={[styles.thumb, youtube && styles.video]} contentFit="cover" transition={200} />
        </PressableScale>
      ) : (
        <View style={styles.icon}>
          <Icon name={SOURCE_ICON[item.source]} size={20} color={palette.nightText} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Label numberOfLines={1} style={{ color: palette.nightText }}>
          {item.sourceLabel || "Source"}
        </Label>
        {meta ? <Small style={{ color: palette.nightMuted }}>{meta}</Small> : null}
      </View>
      {original ? (
        <Button size="sm" variant="night" icon="arrowUpRight" onPress={open} accessibilityLabel={youtube ? "Open on YouTube" : "Open the original"}>
          Open
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    height: HEIGHT,
    marginHorizontal: 16,
    borderRadius: 22,
    backgroundColor: palette.night2,
    borderWidth: 1,
    borderColor: palette.nightLine,
    overflow: "hidden",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  icon: { width: 52, height: 64, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: palette.night3 },
  thumb: { width: 52, height: 64, borderRadius: 10, backgroundColor: palette.night3 },
  video: { width: 96, height: 54 },
});
