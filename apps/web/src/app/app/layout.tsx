import type { Metadata } from "next";
import { AppShell } from "@/components/app/shell/app-shell";

export const metadata: Metadata = {
  title: { default: "Library", template: "%s · anything2note" },
  robots: { index: false },
};

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return <AppShell>{children}</AppShell>;
}
