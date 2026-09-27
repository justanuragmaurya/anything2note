import { FileText, Play, ScanLine } from "lucide-react";
import { formatAnchor, type Anchor } from "@/lib/mock/marketing-samples";

const LABEL: Record<Anchor["kind"], string> = {
  time: "From the recording at",
  page: "From the document,",
  region: "From the photo,",
};

/**
 * Read-only version of the workspace timestamp chip: red mono pill with a
 * play icon (time), a page icon (documents) or a scan icon (photo regions).
 */
export function AnchorChip({ anchor, tone = "paper" }: { anchor: Anchor; tone?: "paper" | "night" }) {
  const Icon = anchor.kind === "time" ? Play : anchor.kind === "page" ? FileText : ScanLine;
  const text = formatAnchor(anchor);
  return (
    <span
      title={`${LABEL[anchor.kind]} ${text}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 align-middle font-mono text-[10px] leading-4 whitespace-nowrap transition-all duration-200 hover:-translate-y-px ${
        tone === "night"
          ? "border-red-400/40 bg-red-500/15 text-red-200 hover:border-red-300"
          : "border-red-200 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100"
      }`}
    >
      <Icon className={`size-2.5 ${anchor.kind === "time" ? "fill-current" : ""}`} strokeWidth={anchor.kind === "time" ? 2 : 2.2} />
      {text}
    </span>
  );
}
