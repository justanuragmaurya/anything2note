import type { Metadata } from "next";
import { QueryProvider } from "@/components/app/query-provider";
import { AppShell } from "@/components/app/shell/app-shell";

export const metadata: Metadata = {
  title: { default: "Library", template: "%s · anything2note" },
  robots: { index: false },
};

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <QueryProvider>
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}
