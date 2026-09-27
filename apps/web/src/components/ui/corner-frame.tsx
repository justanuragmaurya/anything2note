import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** night (default) or paper colourway */
  tone?: "night" | "paper";
  as?: "div" | "section" | "article";
};

/** Box with little squares on each corner — Cloudflare's grid-cell motif. */
export function CornerFrame({ children, className = "", tone = "night", as: Tag = "div" }: Props) {
  const style =
    tone === "paper"
      ? ({
          "--frame-line": "var(--line-strong)",
          "--frame-corner": "var(--line-strong)",
          "--frame-bg": "var(--paper)",
        } as CSSProperties)
      : undefined;

  return (
    <Tag className={`corner-frame ${className}`} style={style}>
      <span className="corner tl" aria-hidden />
      <span className="corner tr" aria-hidden />
      <span className="corner bl" aria-hidden />
      <span className="corner br" aria-hidden />
      {children}
    </Tag>
  );
}
