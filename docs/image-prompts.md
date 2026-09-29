# Image prompts: anything2note

> **Status:** every image below except `flow-notebook-hand` (optional, unused) and the Style E logo set is generated and wired in. They were made with ChatGPT image generation as transparent PNGs, one prompt per image, using the preambles below. The PNGs were then trimmed to their content and converted to WebP. Web files are in the public R2 bucket `a2n-assets` under `art/` (upload steps in `apps/web/src/lib/art.ts`); mobile files (`empty-*`, `onboarding-*`) are in `apps/mobile/assets/art/`.
> `og-default.jpg` is composited in code from the hero cut-outs, with the headline set in DM Sans and Instrument Serif.
> To replace an image, keep its id, match the new file's `aspect` in `apps/web/src/lib/art.ts` (or `ART` in `apps/mobile/src/components/ui/ArtPlaceholder.tsx`), and keep `ready: true`.

Each image has an **id**. That id is shown on its placeholder tile on the site or in the app, and it is also the filename.

**How to hand them back:** send me the files named `<id>.png` (or `.jpg` where noted). I'll upload the web ones to the `a2n-assets` R2 bucket and the mobile ones in `apps/mobile/assets/art/`, then set `ready: true` in the art registry.

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
| `flow-notebook-hand` | 1.1:1 | Optional (reserved for a future "how it works" visual). A hand holding an open spiral notebook toward the viewer. The left page shows the large bold words "Your notes." in a black grotesk font; the right page is a 2×2 grid of rounded cards labelled Notes, Flashcards, Tasks, Quiz. The paper is cream, cards in red, pink and oxblood tones. *(This one needs text; if your generator garbles it, leave the pages blank and I'll overlay the text in code.)* |

---

## Style B: chunky pixel art

Used for: the three feature cards (Study / Record / Ask), empty states, and mobile onboarding. This is our answer to Yield Theory's pixel characters.

> **Style preamble (paste before every B prompt):**
> Chunky pixel-art illustration, visible square pixels (about 64×64 art grid upscaled crisply, nearest-neighbour, no anti-aliasing), limited flat palette only: ember red #E5372B, deep oxblood #6F140F, blush pink #F2B5A8, butter yellow #F3DC8C, cream #FFFBF5, near-black #161212, one muted blue #3B5BDB for clothing. Friendly, simple characters with no facial detail beyond skin tone and hair. **Transparent background**, no ground shadow, no text. Centred composition with generous padding.

| id | Size / ratio | Prompt (after the preamble) |
|---|---|---|
| `feature-study` | 1.2:1 | A student sitting cross-legged on a tall stack of books, holding up a flashcard; floating beside them are three small flashcards and a little red checkmark; a desk lamp glows. |
| `feature-lecture-recording` | 1.8:1 | A student at a desk in a lecture hall, seen from the side, relaxed and listening with hands free; a phone lies on the desk showing a red recording dot; sound waves drift from a lecturer's lectern at the edge of the frame into the phone and come out the other side as a neat stack of note lines and a small calendar tag with a red due-date square. |
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
| `persona-evening-student` | A working adult student in an evening class, jacket still on after work, sitting at a desk in the second row with a phone laid flat in front of them recording, listening attentively rather than writing; a lit classroom window at night behind. |
| `persona-researcher` | A researcher in a library aisle holding an open journal, with a pencil behind one ear and stacks of papers on a cart beside them. |

---

## Style D: social share image

| id | Size | Prompt |
|---|---|---|
| `og-default` | 1200×630, **.jpg** | Flat editorial composition on a cream paper background (#F6F1EA) with subtle paper grain. On the right, a risograph-style cut-out collage (ember red and blush pink duotone halftone) of a cassette tape, a curled PDF page and a polaroid of a whiteboard flowing into an open red notebook. **Keep the left 55% empty** for headline text, which I'll add in code. No text, no logos. |

---

## Style E: logo and app icon

The logo mark is currently an SVG in code (`apps/web/src/components/ui/logo.tsx`): a red page with a folded corner and a cream arrow. The wordmark "anything**2**note" stays set in code (DM Sans, with the "2" in Instrument Serif italic, ember red), so these prompts make **the mark only**. Once a mark is chosen, I'll redraw it as a clean SVG so it stays sharp at 16px.

**First attempt, and what went wrong.** The first prompt described a page with a cassette-tape ribbon curling into note lines. ChatGPT drew a generic file icon (it read as a PDF or Google Docs icon), the ribbon came out as a cursive "e" crossing the page edge, it had none of the riso or pixel character of the rest of the art, and it painted a fake checkerboard instead of a real transparent background. So the prompts below do three things differently: they ask for a **concept sheet first** to choose a direction, they tell ChatGPT what to avoid, and they ask for a **plain cream background** (I'll cut the mark out and redraw it as SVG anyway).

### Step 1: concept sheet

Paste this as one prompt. It returns six directions in one image.

> Logo concept sheet for "anything2note", an app that turns YouTube videos, lectures, PDFs and voice recordings into neat study notes, flashcards and tasks. The brand is warm, bookish and a little playful, like an indie stationery shop or a risograph-printed zine, not a corporate SaaS product.
>
> Show **six different logo marks** in a 3×2 grid, each centred in its own equal cell on a plain cream (#F6F1EA) background. No labels, no captions, no grid lines.
>
> Every mark is one bold, chunky silhouette that still reads as a 16px favicon: at most three shapes, thick proportions, soft rounded corners, no thin lines. Render them like a screen-printed sticker: flat colour with a faint riso grain and a slight 1–2px misregistration between the red and oxblood inks. Palette only: ember red #E5372B, deep oxblood #6F140F, blush pink #F2B5A8, butter yellow #F3DC8C, cream #FFFBF5.
>
> 1. A red notebook page with a dog-eared corner; the first line of text on it is a small cream play triangle followed by a short cream line, then two more short lines below, like a transcript with a timestamp.
> 2. A closed hardcover notebook seen straight on, red cloth cover, oxblood spine band on the left, and a butter-yellow bookmark ribbon hanging out of the bottom with a notched end.
> 3. A tall high-contrast italic serif numeral "2" in ember red whose bottom stroke flattens into three stacked cream note lines on a red tab. The "2" is the only character.
> 4. Two stacked rounded cards offset diagonally, like a "2" in shape: the back card blush pink with a small oxblood play triangle, the front card ember red with three cream note lines.
> 5. A round red badge: on its left half a loose scribbled cream squiggle, pinching through the centre into three perfectly straight cream lines on the right half. Mess into order.
> 6. A chunky cassette tape silhouette in ember red whose centre window, instead of two reels, shows three short cream note lines.
>
> Avoid: generic document or file icons, Google Docs or PDF look, clip-art, gradients, 3D, glossy highlights, drop shadows, mockups, any text or letters apart from the "2" in mark 3, and any checkerboard pattern.

### Step 1b: concept sheet without paper or books

The first sheet leaned on pages, books and cards. This one bans them and explores metaphors for "anything in, neat notes out" instead.

> Logo concept sheet for "anything2note", an app that takes anything (YouTube videos, lectures, PDFs, voice recordings) and turns it into neat study notes, flashcards and tasks. The brand is warm, clever and a little playful, like an indie stationery shop or a risograph-printed zine, not a corporate SaaS product.
>
> Show **nine different logo marks** in a 3×3 grid, each centred in its own equal cell on a plain cream (#F6F1EA) background. No labels, no captions, no grid lines.
>
> Every mark is one bold, chunky silhouette that still reads as a 16px favicon: at most three shapes, thick proportions, soft rounded corners, no thin lines. Render them like a screen-printed sticker: flat colour with a faint riso grain and a slight 1–2px misregistration between inks. Palette only: ember red #E5372B, deep oxblood #6F140F, blush pink #F2B5A8, butter yellow #F3DC8C, cream #FFFBF5.
>
> 1. **Prism.** A rounded ember red triangle pointing right, so it reads as both a prism and a play button. A wobbly cream scribble line enters it from the left, and three perfectly straight parallel beams leave it on the right in cream, blush pink and butter yellow.
> 2. **Magpie.** A chunky geometric magpie silhouette in ember red with an oxblood wing, the collector bird, holding a small butter-yellow play triangle in its beak.
> 3. **Chomp.** A friendly rounded-square ember red creature with one small oxblood dot eye, mouth wide open mid-bite on a butter-yellow play triangle. Not a circle, not Pac-Man.
> 4. **Memory knot.** One thick ember red cord tied into a neat bow, like string tied round a finger to remember something; one loose end is wavy, the other is perfectly straight.
> 5. **Ink drop.** A plump ink drop in ember red with a cream play-triangle highlight inside it, and a tiny oxblood splash at its base.
> 6. **Bee.** A geometric bee with butter-yellow and oxblood stripes and blush pink wings, gathering from anything and making something sweet. Simple, iconic, facing right.
> 7. **Spark.** A chunky eight-ray asterisk spark in ember red, the moment something clicks. The rays on the left are wavy and loose; the rays on the right are straight and tidy.
> 8. **Comet.** A rounded ember red play triangle flying right as the head of a comet, trailing three straight tails in blush pink, butter yellow and oxblood, like lines of notes streaming behind it.
> 9. **Monogram.** Bold lowercase "a" and "n" in oxblood, joined by a small high-contrast italic serif "2" in ember red. These three characters are the only text on the sheet.
>
> Avoid: paper, pages, documents, notebooks, books, cards, sticky notes, clipboards, pencils, lightbulbs, brains, graduation caps, clip-art, gradients, 3D, glossy highlights, drop shadows, mockups, any text apart from mark 9, and any checkerboard pattern.

### Step 2: refine the one you pick

Reply in the same chat so it keeps the context, swapping in the number you chose:

> Take mark N and make it the final logo. One mark only, centred on a plain cream (#F6F1EA) background, filling about 60% of a 1024×1024 square. Keep the same silhouette and palette, and simplify it further so it reads at 16px: fewer, bolder shapes, perfectly even line weights, symmetric spacing. Keep the faint riso grain and slight ink misregistration. No text, no shadow, no mockup.

Save the result as `logo-mark.png`.

### Step 3: variants of the chosen mark

Attach `logo-mark.png` to each of these as the reference image.

| id | Size | Prompt |
|---|---|---|
| `logo-mark-riso` | 2048×2048 | Redraw this exact logo as a large risograph print for marketing: duotone halftone in ember red #E5372B and blush pink #F2B5A8 with deep oxblood #6F140F in the shadows, visible coarse halftone dots and clear ink misregistration, crisp cut-out edge. Same silhouette. Plain cream #F6F1EA background, no text. |
| `logo-mark-pixel` | 1024×1024 | Redraw this exact logo as chunky pixel art on a 16×16 grid, upscaled crisply with nearest-neighbour, no anti-aliasing, flat palette only (ember red #E5372B, deep oxblood #6F140F, blush pink #F2B5A8, butter yellow #F3DC8C, cream #FFFBF5). Same silhouette. Plain cream #F6F1EA background, no text. |
| `app-icon` | 1024×1024, **no transparency** | Turn this logo into an app icon. Full-bleed ember red #E5372B square with a very subtle top-to-bottom shift to #C3241A. The mark is redrawn in cream #FFFBF5 with oxblood #6F140F accents so it stands out on the red, centred inside the middle 65% (the OS will round the corners, so don't draw them). Flat, crisp, no text, no shadow, no device frame. |

Tips for the logo set:

- If ChatGPT drifts back to a generic file icon, reply: "Less like a document icon, more like a hand-printed sticker. Fewer shapes, chunkier."
- If it adds text, gradients or a 3D look, reply "flatter, no text, fewer shapes" and regenerate.
- Don't ask for transparency; ChatGPT often paints a fake checkerboard. The cream background is easy to key out.

## Tips for consistency

- Generate every Style A image in one session with the same seed or style reference, so the halftone and colours match.
- If a model won't do transparent backgrounds, use a plain `#00FF00` background and I'll key it out, or remove it with a background-removal tool.
- Keep the object filling about 80% of the frame, with a little padding on all sides.
