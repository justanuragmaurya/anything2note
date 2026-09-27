# Image prompts: anything2note

Each image has an **id**. That id is shown on its placeholder tile on the site or in the app, and it is also the filename.

**How to hand them back:** send me the files named `<id>.png` (or `.jpg` where noted). I'll put the web ones in `apps/web/public/art/` and the mobile ones in `apps/mobile/assets/art/`, then set `ready: true` in the art registry.

Brand colours to keep consistent across every image:

- Ember red `#E5372B`
- Deep oxblood `#6F140F`
- Blush pink `#F2B5A8`
- Butter yellow `#F3DC8C`
- Cream paper `#F6F1EA`
- Near-black `#161212`

---

## Style A: risograph collage cut-outs

Used for: hero floating objects, hero notebook, "how it works" hand. This is our answer to Yield Theory's floating dollar bills.

> **Style preamble (paste before every A prompt):**
> Risograph-printed photographic cut-out, duotone halftone in ember red (#E5372B) and blush pink (#F2B5A8) with deep oxblood (#6F140F) shadows, visible coarse halftone dots and slight ink misregistration, like a retro print collage. Single isolated object, crisp cut-out edge, **transparent background**, no drop shadow, no text, no logos, no watermark. Soft studio light, slight 3/4 angle, subtle paper curl where relevant. High detail, 2048px on the long side.

| id | Size / ratio | Prompt (after the preamble) |
|---|---|---|
| `hero-cassette` | 1.35:1 landscape | A vintage audio cassette tape, slightly tilted, its label blank cream paper with faint ruled lines. A loop of loose magnetic tape curls out of one side and **turns into a strip of handwritten note paper** at its end. |
| `hero-pdf` | 0.8:1 portrait | A small stack of three printed document pages fanned out and curling upward at the corners like they're caught in a breeze; the top page shows blurry columns of text and a tiny chart; one corner is dog-eared. |
| `hero-tv` | 1.1:1 | A chunky 1970s portable CRT television with a rounded screen showing a big bold play-button triangle; a short antenna; the screen glows slightly. |
| `hero-polaroid` | 0.85:1 portrait | A polaroid photograph, slightly bent, showing a classroom whiteboard covered with diagrams, arrows and equations; a strip of washi tape at the top. Render the white polaroid frame in cream (#F6F1EA) instead of duotone. |
| `hero-mic` | 0.7:1 portrait | A vintage chrome ribbon studio microphone (1950s broadcast style) on a short stand, angled. |
| `hero-slides` | 1.3:1 landscape | A fan of four presentation slides printed on card, spread like playing cards, each with a simple bar chart or bullet layout (abstract, unreadable). |
| `hero-notebook` | 1.5:1 landscape | Hero centrepiece, below the headline. An open hardcover notebook with a red cloth spine, seen from a slightly elevated angle. Rising out of it like a pop-up book are neatly organised note cards, flashcards, a checklist with ticked boxes, and a tiny timestamp tag reading "12:04". Loose tape, pages and a cassette ribbon are flowing *into* it from the top edges, so everything messy becomes neat. Joyful, magical but restrained. |
| `flow-notebook-hand` | 1.1:1 | Optional (reserved for a future "how it works" visual). A hand holding an open spiral notebook toward the viewer. The left page shows the large bold words "Your notes." in a black grotesk font; the right page is a 2×2 grid of rounded cards labelled Minutes, Flashcards, Action items, Quiz. The paper is cream, cards in red, pink and oxblood tones. *(This one needs text; if your generator garbles it, leave the pages blank and I'll overlay the text in code.)* |

---

## Style B: chunky pixel art

Used for: the three feature cards (Study / Meet / Ask), empty states, and mobile onboarding. This is our answer to Yield Theory's pixel characters.

> **Style preamble (paste before every B prompt):**
> Chunky pixel-art illustration, visible square pixels (about 64×64 art grid upscaled crisply, nearest-neighbour, no anti-aliasing), limited flat palette only: ember red #E5372B, deep oxblood #6F140F, blush pink #F2B5A8, butter yellow #F3DC8C, cream #FFFBF5, near-black #161212, one muted blue #3B5BDB for clothing. Friendly, simple characters with no facial detail beyond skin tone and hair. **Transparent background**, no ground shadow, no text. Centred composition with generous padding.

| id | Size / ratio | Prompt (after the preamble) |
|---|---|---|
| `feature-study` | 1.2:1 | A student sitting cross-legged on a tall stack of books, holding up a flashcard; floating beside them are three small flashcards and a little red checkmark; a desk lamp glows. |
| `feature-meeting` | 1.2:1 | Three people around a small table seen from the side; above them speech bubbles merge into one neat clipboard labelled with three tick-box lines; a laptop on the table. |
| `feature-assistant` | 1.2:1 | A person at a desk facing a monitor; from the screen a friendly chat bubble with a small sparkle icon pops out and points to a timestamp tag and a page tag floating in the air. |
| `empty-library` | 1.4:1 | An empty open cardboard box with a single blank sheet of paper floating above it and a small sparkle, inviting you to add something. |
| `empty-review` | 1.4:1 | A character stretching happily next to a neat stack of flashcards with a big red check mark and a tiny trophy; "all caught up" mood. |
| `empty-actions` | 1.4:1 | A clipboard with every box ticked, a coffee cup beside it, a small plant; a calm, done feeling. |
| `onboarding-1` | 0.9:1 portrait, **mobile** | A phone lying on a desk surrounded by the "anything": a YouTube-style play card, a cassette, a PDF page, a photo of a whiteboard, all being pulled into the phone screen. |
| `onboarding-2` | 0.9:1 portrait, **mobile** | A character holding a phone that records (red dot), with sound waves turning into neat lines of notes that stack beside them. |
| `onboarding-3` | 0.9:1 portrait, **mobile** | A character flipping a giant flashcard while a small calendar with a streak of red squares floats next to them. |

---

## Style C: vintage polaroid portraits

Used for: the "Built for whoever's taking notes" persona row. These must show **generic, fictional, non-identifiable people**, not real individuals.

> **Style preamble:**
> Vintage 1970s film photograph, square crop, black-and-white with a warm sepia tint and fine grain, soft natural window light, candid documentary feel, shallow depth of field. A fictional generic person, not a celebrity or real individual. No text, no logos. 1500×1500px. Output **.jpg**.

| id | Prompt (after the preamble) |
|---|---|
| `persona-student` | A university student in a lecture hall, headphones around the neck, laptop open, looking up at the (off-frame) board mid-thought; rows of seats blurred behind. |
| `persona-teamlead` | A team lead in a small glass-walled meeting room, sleeves rolled up, standing by a whiteboard with sticky notes, gesturing mid-sentence. |
| `persona-researcher` | A researcher in a library aisle holding an open journal, with a pencil behind one ear and stacks of papers on a cart beside them. |

---

## Style D: social share image

| id | Size | Prompt |
|---|---|---|
| `og-default` | 1200×630, **.jpg** | Flat editorial composition on a cream paper background (#F6F1EA) with subtle paper grain. On the right, a risograph-style cut-out collage (ember red and blush pink duotone halftone) of a cassette tape, a curled PDF page and a polaroid of a whiteboard flowing into an open red notebook. **Keep the left 55% empty** for headline text, which I'll add in code. No text, no logos. |

---

## Optional: app icon and logo

The logo mark is currently an SVG in code (`apps/web/src/components/ui/logo.tsx`): a red page with a folded corner and a cream arrow. If you'd like an illustrated app icon too:

| id | Size | Prompt |
|---|---|---|
| `app-icon` | 1024×1024, no transparency | App icon, iOS style squircle safe area. Ember red (#E5372B) background with a subtle top-to-bottom gradient to #C3241A. Centred: a cream (#FFFBF5) sheet of paper with a folded top-right corner in deep oxblood, and a bold curved cream arrow swooping into the sheet from the lower left. Flat, minimal, crisp, no text. |

## Tips for consistency

- Generate every Style A image in one session with the same seed or style reference, so the halftone and colours match.
- If a model won't do transparent backgrounds, use a plain `#00FF00` background and I'll key it out, or remove it with a background-removal tool.
- Keep the object filling about 80% of the frame, with a little padding on all sides.
