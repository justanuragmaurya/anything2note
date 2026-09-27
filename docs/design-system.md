# anything2note design system

The look is **Yield Theory's warm editorial paper** crossed with **Cloudflare's dark grid canvas**, in **ember red** instead of green or orange.

Source of truth for values: `packages/ui-tokens/src/index.ts` (mobile + shared) and `apps/web/src/app/globals.css` (web CSS variables and component classes). Keep the two in sync.

## Palette

| Token | Hex | Use |
|---|---|---|
| `paper` | `#f6f1ea` | Page background (light) |
| `paper-glow` | `#fcf9f4` | Radial glow in heroes, alt sections |
| `panel` | `#ede5da` | Outer nested cards, tab tracks, hover fill |
| `card` | `#fbf8f3` | Cards, inputs |
| `line` / `line-strong` | `#e2d8cb` / `#d3c4b3` | Borders |
| `ink` / `ink-soft` / `muted` | `#2a0e0c` / `#5b3f3a` / `#7d6660` | Text |
| `red-500` | `#e5372b` | Brand. Accent words, active states, primary buttons |
| `red-50…800` | | Tints (chips, highlights) and shades (borders, pressed) |
| `night` / `night-2` / `night-3` | `#161212` / `#1e1918` / `#2a2321` | Cloudflare-style dark sections, footer, player |
| `night-text` / `night-muted` / `night-line` | | Text and lines on night |
| `cream` | `#fffbf5` | Text/buttons on red or night |
| `nt-*` | lecture `#f3dc8c`, meeting `#f2b5a8`, interview `#c9c3ec`, podcast `#b9d7c4`, tutorial `#a9c8ef`, reading `#e9c9a4`, general `#e3ddd4` | Note-type colour coding: cards, chips, tabs |

Tailwind: `bg-paper`, `text-ink`, `border-line`, `bg-red-500`, `bg-night`, `bg-nt-meeting`, etc.

## Type

- **DM Sans** (`font-sans`): everything. Headlines are weight 400 with tight tracking (`.display` −0.042em, `.h-section` −0.04em).
- **Instrument Serif italic** (`.serif-accent`): one or two accent words per headline, often `text-red-500`. Also note-type card titles and flashcard fronts (`not-italic`).
- **JetBrains Mono** (`font-mono`, `.eyebrow`): tiny uppercase labels, timestamps, file names, counts. 10–11px, tracking 0.12–0.16em.

## Buttons (all pills, `rounded-full`)

| Class | Look | Where |
|---|---|---|
| `btn btn-red` | Red top-lit gradient, 1px dark-red border, inset highlight | Primary CTA (one per view) |
| `btn btn-ink` | Near-black gradient, same construction | Secondary strong action |
| `btn btn-ghost` | Transparent, `line-strong` border; hover fills `panel`, border → ink | Tertiary |
| `btn btn-cream` | Cream fill, dark text; hover scales 1.02 | On red or night panels |
| `btn btn-night` | Outline on dark | Secondary on night |
| `link-arrow` | Text + arrow; underline draws in; arrow nudges | "See how it works →" |

Sizes: `btn-sm` (36px), default (44px), `btn-lg` (52px). Put the trailing icon in `className="btn-arrow"` (diagonal nudge) or `btn-arrow-right` (horizontal nudge).
Every button lifts 1px on hover and does `translateY(1px) scale(.98)` on press.

## Surfaces and motifs

- **Nested card** (pricing, settings): outer `rounded-[46px] border-line-strong bg-panel p-3.5` around inner `rounded-[34px] bg-card`.
- **Editorial colour card** (note types): `rounded-[6px]`, `nt-*` background, `.grain`, abstract SVG motif on top (`NoteTypeShape`), serif title, mono footer.
- **Corner frame** (`<CornerFrame>`): 1px border with small squares on each corner (Cloudflare grid cells). Night by default, `tone="paper"` for light.
- **Night section**: `bg-night` plus `.dots-night` side rails and `.dashed-rail` lines.
- **Red panel**: `bg-red-500 rounded-[18px]` plus `<DitherGlow/>` (a Bayer-dithered glow that follows the cursor).
- **Placeholders**: `<Art id="..."/>` shows a tinted dashed tile until the real image is marked `ready` in `apps/web/src/lib/art.ts`. Prompts are in `docs/image-prompts.md`.

## Micro-interactions

| Interaction | Implementation |
|---|---|
| Blur-rise on load | `.rise` + staggered `animationDelay` |
| Blur-rise on scroll | `<Reveal delay>` |
| Floating objects | `.drop-in` wrapper, then `.drift` / `.bob`, plus pointer parallax via `--px/--py` |
| Collapsing navbar | Full-width transparent bar → floating blurred pill after 80px scroll |
| Sliding pill tabs | `<SlidingTabs tone="paper\|ink\|night">` (spring-eased indicator) |
| Accordion | `.accordion-body[data-open]` (grid-rows 0fr→1fr) |
| Card lift | `.lift` |
| Live typing | `.caret` blinking red caret |
| Loading | `.skeleton` shimmer |
| Recording | `.rec-pulse` red ring |
| Timestamps | Red mono chip with a play icon; click seeks the player |
| Checkbox tick | Scale-in check, strike-through text |
| Flashcard | 3D flip, `[transform-style:preserve-3d]`, spring easing |

`prefers-reduced-motion` turns animations off globally.

## Voice

Short, confident and a little literary. Use serif italics for the emotional word. Minutes and action items say "Not mentioned" (in italics) rather than inventing owners or dates.
