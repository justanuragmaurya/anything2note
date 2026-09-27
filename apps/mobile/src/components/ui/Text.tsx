import type { ReactNode } from "react";
import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { fontFamily, palette, tracking, type as t } from "@/theme";

type Base = TextProps & { className?: string; children?: ReactNode; color?: string };

/**
 * Typography primitives. Families are chosen per weight (never `fontWeight`), so
 * Android renders the right cut of DM Sans / Instrument Serif / JetBrains Mono.
 */
function make(style: TextStyle) {
  return function T({ style: s, color, ...rest }: Base) {
    return <RNText {...rest} style={[style, color ? { color } : null, s]} />;
  };
}

/** Hero headline: DM Sans 400, tight tracking. Default 44pt on phones. */
export function Display({ size = 44, style, color = palette.ink, ...rest }: Base & { size?: number }) {
  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: fontFamily.sans,
          fontSize: size,
          lineHeight: Math.round(size * t.display.lineHeight),
          letterSpacing: tracking(size, -0.045),
          color,
        },
        style,
      ]}
    />
  );
}

/** Section / screen heading. level 1 = 34, 2 = 26, 3 = 20. */
export function H({ level = 2, style, color = palette.ink, ...rest }: Base & { level?: 1 | 2 | 3 }) {
  const size = level === 1 ? 34 : level === 2 ? 26 : 20;
  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: level === 3 ? fontFamily.sansMedium : fontFamily.sans,
          fontSize: size,
          lineHeight: Math.round(size * 1.12),
          letterSpacing: tracking(size, level === 3 ? -0.02 : -0.04),
          color,
        },
        style,
      ]}
    />
  );
}

export const Body = make({
  fontFamily: fontFamily.sans,
  fontSize: 15,
  lineHeight: 22,
  color: palette.inkSoft,
});

export const Small = make({
  fontFamily: fontFamily.sans,
  fontSize: 13,
  lineHeight: 18,
  color: palette.muted,
});

/** Medium-weight label (list titles, buttons). */
export const Label = make({
  fontFamily: fontFamily.sansMedium,
  fontSize: 15,
  lineHeight: 20,
  letterSpacing: -0.15,
  color: palette.ink,
});

/** Tiny uppercase mono label (`.eyebrow`). */
export function Eyebrow({ style, color = palette.muted, children, ...rest }: Base) {
  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: fontFamily.mono,
          fontSize: t.eyebrow.size,
          lineHeight: 14,
          letterSpacing: tracking(t.eyebrow.size, 0.14),
          textTransform: "uppercase",
          color,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

export const Mono = make({ fontFamily: fontFamily.mono, fontSize: 12, color: palette.muted });

/**
 * Instrument Serif accent. Nest inside a Display/H for the emotional word:
 * `<Display>Notes that <SerifAccent>remember</SerifAccent></Display>`.
 * `upright` gives the non-italic cut (flashcard fronts, note-type titles).
 */
export function SerifAccent({
  style,
  color = palette.red500,
  upright = false,
  size,
  ...rest
}: Base & { upright?: boolean; size?: number }) {
  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: upright ? fontFamily.serif : fontFamily.serifItalic,
          color,
          letterSpacing: 0,
        },
        size ? { fontSize: size, lineHeight: Math.round(size * 1.12) } : null,
        style,
      ]}
    />
  );
}
