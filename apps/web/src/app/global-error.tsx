"use client";

import "./globals.css";
import { ErrorView } from "@/components/app/error-view";

/** Replaces the root layout when it crashes, so it brings its own document and styles. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-dvh bg-paper">
        <title>Something went wrong · anything2note</title>
        <main className="flex min-h-dvh items-center px-4">
          <ErrorView error={error} retry={retry} home={{ href: "/", label: "Home page" }} />
        </main>
      </body>
    </html>
  );
}
