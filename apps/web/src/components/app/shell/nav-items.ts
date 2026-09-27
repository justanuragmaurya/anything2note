import { BarChart3, Layers, ListChecks, Library, Settings, type LucideIcon } from "lucide-react";
import { DUE_CARDS } from "@/lib/mock/app-data";

export type NavItem = { href: string; label: string; short: string; icon: LucideIcon; badge?: number };

export const NAV: NavItem[] = [
  { href: "/app", label: "Library", short: "Library", icon: Library },
  { href: "/app/actions", label: "Action items", short: "Actions", icon: ListChecks },
  { href: "/app/review", label: "Review", short: "Review", icon: Layers, badge: DUE_CARDS.length },
  { href: "/app/stats", label: "Stats", short: "Stats", icon: BarChart3 },
  { href: "/app/settings", label: "Settings", short: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app" || pathname.startsWith("/app/i/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
