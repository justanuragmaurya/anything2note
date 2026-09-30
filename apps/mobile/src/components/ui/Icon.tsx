import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ColorValue, StyleProp, ViewStyle } from "react-native";
import { palette } from "@/theme";

type SymbolName = Exclude<SymbolViewProps["name"], string>;
type SFName = NonNullable<SymbolName["ios"]>;
type MaterialName = NonNullable<SymbolName["android"]>;

/** Semantic icon names → SF Symbols (iOS) and Material Symbols (Android / web). */
const ICONS = {
  library: ["books.vertical.fill", "library_books"],
  add: ["plus", "add"],
  review: ["rectangle.on.rectangle.angled", "style"],
  tasks: ["checklist", "checklist"],
  profile: ["person.crop.circle", "person"],
  mic: ["mic.fill", "mic"],
  pause: ["pause.fill", "pause"],
  play: ["play.fill", "play_arrow"],
  stop: ["stop.fill", "stop"],
  upload: ["arrow.up.doc", "upload_file"],
  camera: ["camera", "photo_camera"],
  link: ["link", "link"],
  paste: ["doc.on.clipboard", "content_paste"],
  search: ["magnifyingglass", "search"],
  close: ["xmark", "close"],
  back: ["chevron.left", "chevron_left"],
  forward: ["chevron.right", "chevron_right"],
  arrowRight: ["arrow.right", "arrow_forward"],
  arrowUpRight: ["arrow.up.right", "north_east"],
  sparkles: ["sparkles", "auto_awesome"],
  check: ["checkmark", "check"],
  clock: ["clock", "schedule"],
  calendar: ["calendar", "calendar_today"],
  person: ["person", "person"],
  youtube: ["play.rectangle.fill", "smart_display"],
  podcast: ["waveform", "podcasts"],
  pdf: ["doc.richtext", "picture_as_pdf"],
  doc: ["doc.text", "description"],
  slides: ["rectangle.on.rectangle", "slideshow"],
  video: ["video", "videocam"],
  photo: ["photo", "image"],
  text: ["text.alignleft", "article"],
  waveform: ["waveform", "graphic_eq"],
  refresh: ["arrow.clockwise", "refresh"],
  retry: ["arrow.counterclockwise", "replay"],
  info: ["info.circle", "info"],
  bell: ["bell", "notifications"],
  globe: ["globe", "language"],
  trash: ["trash", "delete"],
  logout: ["rectangle.portrait.and.arrow.right", "logout"],
  crown: ["crown", "workspace_premium"],
  shield: ["checkmark.shield", "shield"],
  mail: ["envelope", "mail"],
  lock: ["lock", "lock"],
  send: ["arrow.up", "send"],
  chevronDown: ["chevron.down", "expand_more"],
  more: ["ellipsis", "more_horiz"],
  bolt: ["bolt.fill", "bolt"],
  star: ["star.fill", "star"],
  apple: ["apple.logo", "phone_iphone"],
  google: ["g.circle", "language"],
  folder: ["folder", "folder"],
  edit: ["pencil", "edit"],
  share: ["square.and.arrow.up", "share"],
  copy: ["doc.on.doc", "content_copy"],
} as const satisfies Record<string, readonly [SFName, MaterialName]>;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  color?: ColorValue;
  weight?: "regular" | "medium" | "semibold" | "bold";
  style?: StyleProp<ViewStyle>;
};

export function Icon({ name, size = 20, color = palette.ink, weight = "medium", style }: Props) {
  const [ios, material] = ICONS[name];
  return (
    <SymbolView
      name={{ ios, android: material, web: material }}
      size={size}
      tintColor={color}
      weight={weight}
      resizeMode="scaleAspectFit"
      style={[{ width: size, height: size }, style]}
    />
  );
}
