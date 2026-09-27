import { Reveal } from "@/components/ui/reveal";

export function SectionHeading({
  eyebrow,
  title,
  sub,
  align = "center",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  align?: "center" | "left";
}) {
  const a = align === "center" ? "text-center items-center" : "text-left items-start";
  return (
    <Reveal className={`flex flex-col ${a}`}>
      {eyebrow && (
        <span className="inline-flex items-center gap-2 rounded-md border border-line bg-card px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
          <span className="size-1 rounded-full bg-red-500" />
          {eyebrow}
        </span>
      )}
      <h2 className="h-section mt-5 max-w-[820px]">{title}</h2>
      {sub && <p className="mt-4 max-w-[560px] text-[16px] leading-relaxed text-ink-soft">{sub}</p>}
    </Reveal>
  );
}
