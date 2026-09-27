import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";

/** Minimal chrome for auth: just the logo, outside the marketing navbar/footer. */
export default function SignInLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-paper">
      <header className="absolute inset-x-0 top-0 z-20 px-6 py-5 md:px-10 lg:w-1/2">
        <Logo />
      </header>
      {children}
    </div>
  );
}
