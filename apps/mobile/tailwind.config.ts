import type { Config } from "tailwindcss";
import { palette, radius } from "@a2n/ui-tokens";
// @ts-expect-error nativewind/preset ships a non-module .d.ts
import nativewindPreset from "nativewind/preset";

/**
 * Tailwind theme for NativeWind, generated from the shared design tokens.
 * Class names mirror the web (`bg-paper`, `text-ink`, `bg-red-500`, `bg-nt-meeting`, `bg-night`).
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [nativewindPreset],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: palette.paper, glow: palette.paperGlow },
        panel: palette.panel,
        card: palette.card,
        line: { DEFAULT: palette.line, strong: palette.lineStrong },
        ink: { DEFAULT: palette.ink, soft: palette.inkSoft },
        muted: palette.muted,
        red: {
          50: palette.red50,
          100: palette.red100,
          200: palette.red200,
          300: palette.red300,
          400: palette.red400,
          500: palette.red500,
          600: palette.red600,
          700: palette.red700,
          800: palette.red800,
        },
        ember: palette.ember,
        night: {
          DEFAULT: palette.night,
          2: palette.night2,
          3: palette.night3,
          line: palette.nightLine,
          text: palette.nightText,
          muted: palette.nightMuted,
        },
        cream: palette.cream,
        nt: {
          lecture: palette.lecture,
          meeting: palette.meeting,
          interview: palette.interview,
          podcast: palette.podcast,
          tutorial: palette.tutorial,
          reading: palette.reading,
          general: palette.general,
        },
        success: palette.success,
        warning: palette.warning,
        danger: palette.danger,
      },
      borderRadius: {
        xs: `${radius.xs}px`,
        sm: `${radius.sm}px`,
        md: `${radius.md}px`,
        lg: `${radius.lg}px`,
        xl: `${radius.xl}px`,
        xxl: `${radius.xxl}px`,
      },
      fontFamily: {
        sans: ["DMSans_400Regular"],
        "sans-medium": ["DMSans_500Medium"],
        "sans-semibold": ["DMSans_600SemiBold"],
        serif: ["InstrumentSerif_400Regular"],
        "serif-italic": ["InstrumentSerif_400Regular_Italic"],
        mono: ["JetBrainsMono_400Regular"],
        "mono-medium": ["JetBrainsMono_500Medium"],
      },
    },
  },
  plugins: [],
};

export default config;
