"use client";

import { ErrorView } from "@/components/app/error-view";
import { Logo } from "@/components/ui/logo";

/** Anything outside the app shell (marketing pages, sign-in, shared notes). */
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="paper-hero grain flex min-h-dvh flex-col bg-paper px-4">
      <div className="mx-auto w-full max-w-[1080px] pt-6">
        <Logo />
      </div>
      <main className="flex flex-1 items-center">
        <ErrorView error={error} retry={retry} home={{ href: "/", label: "Home page" }} className="py-20" />
      </main>
    </div>
  );
}
