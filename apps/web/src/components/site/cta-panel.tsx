import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { DitherGlow } from "@/components/ui/dither-glow";

export function CtaPanel({
  title = (
    <>
      Your next lecture, meeting or paper — <span className="serif-accent">already noted.</span>
    </>
  ),
  body = "Start free. 120 media minutes and 50 pages every month, no card required.",
}: {
  title?: React.ReactNode;
  body?: string;
}) {
  return (
    <div className="px-3 md:px-6">
      <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[18px] bg-red-500 text-cream">
        <DitherGlow />
        <div className="relative z-10 flex flex-col items-center px-6 py-28 text-center md:py-36">
          <Link
            href="/#features"
            className="group inline-flex items-center gap-3 rounded-full border-[1.5px] border-cream/50 py-1.5 pr-1.5 pl-4 text-sm transition-colors hover:border-cream"
          >
            Also on iOS &amp; Android · record anywhere
            <span className="grid size-6 place-items-center rounded-full bg-cream text-red-600 transition-transform duration-300 group-hover:translate-x-0.5">
              <ArrowRight className="size-3.5" />
            </span>
          </Link>
          <h2 className="h-section mt-8 max-w-[820px] !font-medium !tracking-[-0.035em]">{title}</h2>
          <p className="mt-5 max-w-[480px] text-[17px] text-cream/85">{body}</p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/sign-in?next=/app/new" className="btn btn-cream btn-lg">
              Make your first note
              <ArrowUpRight className="btn-arrow size-4" />
            </Link>
            <Link href="/pricing" className="btn btn-lg border-cream/60 text-cream hover:border-cream hover:bg-cream/10">
              See pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
