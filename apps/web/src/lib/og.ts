/**
 * Default social share image. Pages that set their own `openGraph`/`twitter` metadata
 * replace the layout's objects wholesale in Next, so they must include this explicitly.
 */
export const OG_IMAGE = {
  url: "/art/og-default.jpg",
  width: 1200,
  height: 630,
  alt: "anything2note — turn anything into notes worth keeping",
} as const;
