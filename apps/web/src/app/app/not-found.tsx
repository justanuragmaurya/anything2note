import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Art } from "@/components/ui/art";

export default function AppNotFound() {
  return (
    <div className="rise mx-auto flex max-w-[520px] flex-col items-center py-16 text-center">
      <Art id="empty-library" className="w-full max-w-[300px]" />
      <p className="eyebrow mt-8">404 · not in your library</p>
      <h1 className="mt-3 text-[34px] leading-tight tracking-[-0.04em]">
        This note has <span className="serif-accent text-red-500">wandered off</span>.
      </h1>
      <p className="mt-3 text-sm text-ink-soft">It may have been deleted, or the link is from someone else’s library.</p>
      <Link href="/app" className="btn btn-ink mt-7">
        <ArrowLeft className="btn-arrow-right size-4" />
        Back to library
      </Link>
    </div>
  );
}
