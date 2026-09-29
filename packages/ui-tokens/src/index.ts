/**
 * anything2note design tokens — shared by web (CSS variables in globals.css)
 * and mobile (StyleSheet / NativeWind theme).
 *
 * Design language: Yield Theory's warm editorial paper + pill buttons,
 * crossed with Cloudflare's dark grid canvas, corner-marked frames and
 * glowing colour panels. Brand colour is a warm "ember red".
 *
 * Keep web `apps/web/src/app/globals.css` in sync when changing values here.
 */

export const palette = {
  // Paper (light surfaces)
  paper: '#f6f1ea',
  paperGlow: '#fcf9f4',
  panel: '#ede5da',
  card: '#fbf8f3',
  line: '#e2d8cb',
  lineStrong: '#d3c4b3',

  // Ink (text on paper)
  ink: '#2a0e0c',
  inkSoft: '#5b3f3a',
  muted: '#7d6660',

  // Ember red (brand)
  red50: '#fff1ee',
  red100: '#ffdcd5',
  red200: '#ffb8aa',
  red300: '#ff8a76',
  red400: '#f65f48',
  red500: '#e5372b',
  red600: '#c8231a',
  red700: '#9e1a13',
  red800: '#6f140f',
  ember: '#ff5a36',

  // Night (Cloudflare-style dark canvas)
  night: '#161212',
  night2: '#1e1918',
  night3: '#2a2321',
  nightLine: 'rgba(243, 226, 219, 0.12)',
  nightText: '#f3e6e1',
  nightMuted: '#a8958f',
  cream: '#fffbf5',

  // Note-type accents (editorial card colours, Yield-style)
  lecture: '#f3dc8c',
  interview: '#c9c3ec',
  podcast: '#b9d7c4',
  tutorial: '#a9c8ef',
  reading: '#e9c9a4',
  general: '#e3ddd4',

  success: '#2f7d4f',
  warning: '#c7820a',
  danger: '#c8231a',
} as const

export const gradients = {
  /** Primary pill button: red, top-lit */
  buttonRed: ['#ec4d3f', '#c3241a'] as const,
  buttonRedHover: ['#f45f50', '#cf2d21'] as const,
  /** Secondary pill button: near-black with red undertone */
  buttonInk: ['#3b2926', '#1d1311'] as const,
  buttonInkHover: ['#4a3430', '#2a1a17'] as const,
} as const

export const radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 34,
  xxl: 46,
  pill: 999,
} as const

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const

export const fonts = {
  sans: 'DM Sans',
  serif: 'Instrument Serif',
  mono: 'JetBrains Mono',
} as const

export const type = {
  display: { size: 82, lineHeight: 1.04, tracking: -0.05, weight: '400' },
  h1: { size: 56, lineHeight: 1.05, tracking: -0.04, weight: '400' },
  h2: { size: 44, lineHeight: 1.08, tracking: -0.035, weight: '400' },
  h3: { size: 24, lineHeight: 1.2, tracking: -0.02, weight: '500' },
  body: { size: 16, lineHeight: 1.5, tracking: 0, weight: '400' },
  small: { size: 14, lineHeight: 1.45, tracking: 0, weight: '400' },
  button: { size: 14, lineHeight: 1.25, tracking: 0, weight: '500' },
  eyebrow: { size: 11, lineHeight: 1.3, tracking: 0.12, weight: '500' },
} as const

export const motion = {
  /** Button hover/press */
  fast: 160,
  base: 240,
  slow: 600,
  easeOut: [0.25, 0.46, 0.45, 0.94] as const,
  easeSpring: [0.34, 1.56, 0.64, 1] as const,
} as const

export const shadow = {
  card: '0 1px 8px rgba(60, 20, 10, 0.04)',
  lift: '0 12px 32px -12px rgba(60, 20, 10, 0.25)',
  buttonInset: 'inset 0 1px 1px rgba(255,255,255,0.33), 0 2px 3px rgba(90, 20, 10, 0.18)',
} as const

export type NoteTypeKey =
  | 'lecture'
  | 'interview'
  | 'podcast'
  | 'tutorial'
  | 'reading'
  | 'general'

export const noteTypeColor: Record<NoteTypeKey, string> = {
  lecture: palette.lecture,
  interview: palette.interview,
  podcast: palette.podcast,
  tutorial: palette.tutorial,
  reading: palette.reading,
  general: palette.general,
}

export const tokens = { palette, gradients, radius, spacing, fonts, type, motion, shadow, noteTypeColor } as const
export default tokens
