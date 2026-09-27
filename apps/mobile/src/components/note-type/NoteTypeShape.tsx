import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { NoteTypeKey } from "@/lib/note-types";
import { palette } from "@/theme";

/** Abstract editorial motif per note type (mirrors apps/web note-type-shape.tsx). */
export function NoteTypeShape({ type, width = 240, height = 90 }: { type: NoteTypeKey; width?: number; height?: number }) {
  const c = palette.red600;
  const d = palette.ink;
  const common = { width, height, viewBox: "0 0 240 90" } as const;

  switch (type) {
    case "lecture":
      return (
        <Svg {...common}>
          {Array.from({ length: 14 }).map((_, i) => (
            <Rect key={i} x={14 + i * 15.5} y={12 + (i % 2) * 6} width={8} height={66 - (i % 2) * 6} rx={4} fill={d} />
          ))}
        </Svg>
      );
    case "meeting":
      return (
        <Svg {...common}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Circle key={i} cx={46 + i * 37} cy={45} r={27} fill="none" stroke={c} strokeWidth={7} />
          ))}
        </Svg>
      );
    case "interview":
      return (
        <Svg {...common}>
          <Path d="M28 18h82a14 14 0 0 1 14 14v18a14 14 0 0 1-14 14H58l-18 14v-14H28a14 14 0 0 1-14-14V32a14 14 0 0 1 14-14Z" fill={d} />
          <Path d="M212 26h-72a14 14 0 0 0-14 14v14a14 14 0 0 0 14 14h44l16 12V68h12a14 14 0 0 0 14-14V40a14 14 0 0 0-14-14Z" fill={c} />
        </Svg>
      );
    case "podcast":
      return (
        <Svg {...common}>
          {Array.from({ length: 22 }).map((_, i) => {
            const h = 10 + Math.abs(Math.sin(i * 0.9)) * 62;
            return <Rect key={i} x={12 + i * 10.2} y={45 - h / 2} width={5} height={h} rx={2.5} fill={c} />;
          })}
        </Svg>
      );
    case "tutorial":
      return (
        <Svg {...common}>
          <Path d="M14 78h36V58h36V38h36V18h36v20h36v20h32" fill="none" stroke={d} strokeWidth={9} strokeLinejoin="round" />
          <Circle cx={140} cy={18} r={8} fill={c} />
        </Svg>
      );
    case "reading":
      return (
        <Svg {...common}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Path key={i} d={`M${30 + i * 32} 78 Q ${46 + i * 32} ${14 + (i % 3) * 6} ${62 + i * 32} 78`} fill={i % 2 ? c : d} />
          ))}
        </Svg>
      );
    case "general":
      return (
        <Svg {...common}>
          {Array.from({ length: 48 }).map((_, i) => {
            const x = 16 + (i % 12) * 18.5 + ((i * 7) % 5);
            const y = 16 + Math.floor(i / 12) * 19 + ((i * 3) % 6);
            return <Circle key={i} cx={x} cy={y} r={3 + ((i * 5) % 4)} fill={i % 3 ? c : "none"} stroke={c} strokeWidth={1.5} />;
          })}
        </Svg>
      );
  }
}

/** Dot-grid background for night panels (`.dots-night`). */
export function NightDots({ width, height, gap = 14 }: { width: number; height: number; gap?: number }) {
  const cols = Math.ceil(width / gap);
  const rows = Math.ceil(height / gap);
  return (
    <Svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
      {Array.from({ length: cols * rows }).map((_, i) => (
        <Circle key={i} cx={(i % cols) * gap + gap / 2} cy={Math.floor(i / cols) * gap + gap / 2} r={0.9} fill="rgba(243,230,225,0.13)" />
      ))}
    </Svg>
  );
}
