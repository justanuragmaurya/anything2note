import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import type { LibraryItem } from "@a2n/shared";
import { SOURCE_ICON } from "@/components/library/ItemCard";
import { NightDots } from "@/components/note-type/NoteTypeShape";
import { Button, Icon, Label, PressableScale, Small } from "@/components/ui";
import { palette } from "@/theme";

const HEIGHT = 96;

/** Non-media sources: what the notes were made from, with the original one tap away when it was an upload. */
export function SourcePanel({ item, mediaUrl, mediaType }: { item: LibraryItem; mediaUrl: string | null; mediaType: string | null }) {
  const [w, setW] = useState(0);
  const image = !!mediaUrl && !!mediaType?.startsWith("image/");
  const open = () => {
    if (mediaUrl) void WebBrowser.openBrowserAsync(mediaUrl);
  };
  const meta = item.pages ? `${item.pages} ${item.pages === 1 ? "page" : "pages"}` : item.source === "web" ? "Web page" : item.source === "text" ? "Pasted text" : "";

  return (
    <View style={styles.panel} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? <NightDots width={w} height={HEIGHT} /> : null}
      {image ? (
        <PressableScale onPress={open} scaleTo={0.95} accessibilityLabel="Open the original image">
          <Image source={{ uri: mediaUrl }} style={styles.thumb} contentFit="cover" transition={200} />
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
      {mediaUrl ? (
        <Button size="sm" variant="night" icon="arrowUpRight" onPress={open}>
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
});
