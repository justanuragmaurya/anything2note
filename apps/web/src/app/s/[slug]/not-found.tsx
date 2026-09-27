import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function SharedNotFound() {
  return (
    <div className="paper-hero grain flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo />
      <p className="rise mt-12 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Shared note · 404</p>
      <h1 className="serif-accent rise mt-3 text-[clamp(56px,9vw,104px)] leading-none text-ink" style={{ animationDelay: "100ms" }}>
        Link <span className="text-red-500">unshared.</span>
      </h1>
      <p className="rise mt-5 max-w-[420px] text-[16px] leading-relaxed text-ink-soft" style={{ animationDelay: "200ms" }}>
        This share link doesn&apos;t exist, or its owner has turned it off. Ask them for a fresh one.
      </p>
      <div className="rise mt-8 flex flex-wrap items-center justify-center gap-6" style={{ animationDelay: "300ms" }}>
        <Link href="/" className="link-arrow text-ink">
          What is anything2note?
          <ArrowRight className="size-4" />
        </Link>
        <Link href="/s/demo" className="btn btn-ghost btn-sm">
          See a sample note
        </Link>
      </div>
    </div>
  );
}
