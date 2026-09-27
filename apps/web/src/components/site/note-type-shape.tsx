import type { NoteTypeKey } from "@/lib/mock/note-types";

/** Abstract editorial motif per note type (Yield Theory report-card style). */
export function NoteTypeShape({ type, className = "" }: { type: NoteTypeKey; className?: string }) {
  const c = "var(--red-600)";
  const d = "var(--ink)";
  const common = { viewBox: "0 0 240 90", className: `h-full w-full ${className}`, "aria-hidden": true } as const;

  switch (type) {
    case "lecture":
      return (
        <svg {...common}>
          {Array.from({ length: 14 }).map((_, i) => (
            <rect key={i} x={14 + i * 15.5} y={12 + (i % 2) * 6} width="8" height={66 - (i % 2) * 6} rx="4" fill={d} />
          ))}
        </svg>
      );
    case "meeting":
      return (
        <svg {...common}>
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={46 + i * 37} cy={45} r={27} fill="none" stroke={c} strokeWidth="7" />
          ))}
        </svg>
      );
    case "interview":
      return (
        <svg {...common}>
          <path d="M28 18h82a14 14 0 0 1 14 14v18a14 14 0 0 1-14 14H58l-18 14v-14H28a14 14 0 0 1-14-14V32a14 14 0 0 1 14-14Z" fill={d} />
          <path d="M212 26h-72a14 14 0 0 0-14 14v14a14 14 0 0 0 14 14h44l16 12V68h12a14 14 0 0 0 14-14V40a14 14 0 0 0-14-14Z" fill={c} />
        </svg>
      );
    case "podcast":
      return (
        <svg {...common}>
          {Array.from({ length: 22 }).map((_, i) => {
            // Rounded so server and client render identical attributes.
            const h = Math.round(10 + Math.abs(Math.sin(i * 0.9)) * 62);
            return <rect key={i} x={12 + i * 10.2} y={45 - h / 2} width="5" height={h} rx="2.5" fill={c} />;
          })}
        </svg>
      );
    case "tutorial":
      return (
        <svg {...common}>
          <path d="M14 78h36V58h36V38h36V18h36v20h36v20h32" fill="none" stroke={d} strokeWidth="9" strokeLinejoin="round" />
          <circle cx="140" cy="18" r="8" fill={c} />
        </svg>
      );
    case "reading":
      return (
        <svg {...common}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={`M${30 + i * 32} 78 Q ${46 + i * 32} ${14 + (i % 3) * 6} ${62 + i * 32} 78`} fill={i % 2 ? c : d} />
          ))}
        </svg>
      );
    case "general":
      return (
        <svg {...common}>
          {Array.from({ length: 48 }).map((_, i) => {
            const x = 16 + (i % 12) * 18.5 + ((i * 7) % 5);
            const y = 16 + Math.floor(i / 12) * 19 + ((i * 3) % 6);
            return <circle key={i} cx={x} cy={y} r={3 + ((i * 5) % 4)} fill={i % 3 ? c : "none"} stroke={c} strokeWidth="1.5" />;
          })}
        </svg>
      );
  }
}
