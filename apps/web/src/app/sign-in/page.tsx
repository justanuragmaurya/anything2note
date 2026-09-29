import type { Metadata } from "next";
import { SignInForm } from "@/components/marketing/sign-in-form";
import { SignInShowcase } from "@/components/marketing/sign-in-showcase";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create your anything2note account with email or Google.",
  alternates: { canonical: "/sign-in" },
};

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

/** Only allow same-origin relative paths as a post-login redirect. */
function safeNext(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return "/app";
  return v;
}

export default async function SignInPage({ searchParams }: Props) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const oauthError = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] min-h-dvh lg:grid-cols-2">
      <main className="paper-hero grain relative flex items-center justify-center px-6 pt-28 pb-16 md:px-10">
        <SignInForm next={next} oauthError={oauthError} />
      </main>
      <aside aria-label="What anything2note makes" className="hidden lg:block">
        <SignInShowcase />
      </aside>
    </div>
  );
}
