import { BarChart3, Layers, ListChecks, Library, Settings, type LucideIcon } from "lucide-react";

/** `badge` shows the live due-card count (see AppShell). */
export type NavItem = { href: string; label: string; short: string; icon: LucideIcon; badge?: "due" };

export const NAV: NavItem[] = [
  { href: "/app", label: "Library", short: "Library", icon: Library },
  { href: "/app/tasks", label: "Tasks", short: "Tasks", icon: ListChecks },
  { href: "/app/review", label: "Review", short: "Review", icon: Layers, badge: "due" },
  { href: "/app/stats", label: "Stats", short: "Stats", icon: BarChart3 },
  { href: "/app/settings", label: "Settings", short: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app" || pathname.startsWith("/app/i/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
