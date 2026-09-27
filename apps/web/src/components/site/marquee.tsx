const ITEMS = [
  "Calculus lectures",
  "Sprint planning",
  "Client calls",
  "Research papers",
  "Podcast episodes",
  "Whiteboard photos",
  "Slide decks",
  "User interviews",
  "Coding tutorials",
  "Board meetings",
  "Book chapters",
  "Webinars",
];

/** Infinite source ticker between hero and body. */
export function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="relative overflow-hidden border-y border-line bg-card py-4 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max animate-marquee items-center gap-10 hover:[animation-play-state:paused]">
        {row.map((item, i) => (
          <span key={i} className="flex items-center gap-10 text-[15px] whitespace-nowrap text-ink-soft">
            {item}
            <span className="serif-accent text-lg text-red-500">✳</span>
          </span>
        ))}
      </div>
    </div>
  );
}
