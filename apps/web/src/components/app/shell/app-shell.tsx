"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, Plus, Search, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { USER } from "@/lib/mock/app-data";
import { Kbd, ProgressBar } from "../ui";
import { CommandPalette } from "./command-palette";
import { NAV, isActive } from "./nav-items";

function SearchTrigger({ onOpen, compact = false }: { onOpen: () => void; compact?: boolean }) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label="Search"
        className="grid size-10 place-items-center rounded-full border border-line bg-card text-ink-soft transition-colors hover:border-line-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-red-400"
      >
        <Search className="size-4" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-2.5 rounded-full border border-line bg-card px-3.5 py-2 text-left text-[13px] text-muted transition-all duration-200 hover:border-line-strong hover:text-ink-soft focus-visible:outline-2 focus-visible:outline-red-400"
    >
      <Search className="size-3.5 transition-transform duration-300 group-hover:scale-110" />
      <span className="flex-1">Search notes…</span>
      <span className="flex gap-0.5">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}

function UsageMeter() {
  const { mediaMin, mediaLimit, pages, pagesLimit, resetsOn } = USER.usage;
  return (
    <div className="rounded-2xl border border-line bg-card p-3.5">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow text-[10px]">Usage</span>
        <span className="font-mono text-[10px] text-muted">resets {resetsOn}</span>
      </div>
      <div className="mt-2.5 flex items-baseline justify-between text-[13px]">
        <span className="text-ink-soft">Media</span>
        <span className="font-mono text-[11px] text-ink tabular-nums">
          {mediaMin} / {mediaLimit} min
        </span>
      </div>
      <ProgressBar value={(mediaMin / mediaLimit) * 100} className="mt-1.5" />
      <div className="mt-2.5 flex items-baseline justify-between text-[13px]">
        <span className="text-ink-soft">Pages</span>
        <span className="font-mono text-[11px] text-ink tabular-nums">
          {pages} / {pagesLimit}
        </span>
      </div>
      <ProgressBar value={(pages / pagesLimit) * 100} className="mt-1.5" tone="ink" />
    </div>
  );
}

function UpgradeCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-night p-4 text-night-text">
      <div className="dots-night absolute inset-0 opacity-60" aria-hidden />
      <div className="relative">
        <Sparkles className="size-4 text-red-400" aria-hidden />
        <p className="mt-2.5 text-[15px] leading-snug tracking-[-0.02em]">
          Go <span className="serif-accent text-[18px] text-red-300">Pro</span> for 2,000 min, speaker labels and DOCX exports.
        </p>
        <Link href="/app/settings#billing" className="btn btn-cream btn-sm mt-3.5 w-full">
          Upgrade
          <ArrowUpRight className="btn-arrow size-3.5" />
        </Link>
      </div>
    </div>
  );
}

function Avatar({ className = "size-9" }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-nt-meeting font-medium text-ink ring-1 ring-ink/10 ${className}`}>
      <span className="serif-accent text-[17px]">{USER.name[0]}</span>
    </span>
  );
}

function Sidebar({ pathname, onSearch }: { pathname: string; onSearch: () => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-line bg-paper/80 px-4 pt-5 pb-4 backdrop-blur-xl lg:flex">
      <div className="px-2">
        <Logo href="/app" />
      </div>

      <div className="mt-6 space-y-2.5">
        <Link href="/app/new" className="btn btn-red w-full">
          <Plus className="size-4" strokeWidth={2.5} />
          New note
        </Link>
        <SearchTrigger onOpen={onSearch} />
      </div>

      <nav aria-label="App" className="mt-6">
        <p className="eyebrow mb-2 px-3 text-[10px]">Workspace</p>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-3 rounded-full px-3 py-2 text-[14px] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-red-400 ${
                    active ? "bg-panel text-ink shadow-[inset_0_0_0_1px_var(--line)]" : "text-ink-soft hover:bg-panel/60 hover:text-ink"
                  }`}
                >
                  <Icon
                    className={`size-[17px] transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-110 ${active ? "text-red-500" : ""}`}
                    strokeWidth={1.8}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded-full bg-red-500 px-1.5 py-px font-mono text-[10px] text-cream tabular-nums">{item.badge}</span>
                  ) : null}
                  <span
                    aria-hidden
                    className={`size-1.5 rounded-full bg-red-500 transition-all duration-300 ease-[var(--ease-spring)] ${active ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto space-y-3">
        <UsageMeter />
        <UpgradeCard />
        <Link
          href="/app/settings"
          className="flex items-center gap-3 rounded-full p-1.5 pr-3 transition-colors hover:bg-panel/70 focus-visible:outline-2 focus-visible:outline-red-400"
        >
          <Avatar />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{USER.fullName}</span>
            <span className="block truncate font-mono text-[10px] tracking-[0.08em] text-muted uppercase">{USER.plan} plan</span>
          </span>
        </Link>
      </div>
    </aside>
  );
}

function MobileBars({ pathname, onSearch }: { pathname: string; onSearch: () => void }) {
  const tabs = NAV.slice(0, 4);
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-paper/85 px-4 py-2.5 backdrop-blur-xl lg:hidden">
        <Logo href="/app" />
        <div className="flex items-center gap-2">
          <SearchTrigger onOpen={onSearch} compact />
          <Link href="/app/settings" aria-label="Settings" className="rounded-full focus-visible:outline-2 focus-visible:outline-red-400">
            <Avatar className="size-10" />
          </Link>
        </div>
      </header>

      <nav
        aria-label="App"
        className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-between rounded-full border border-line bg-card/90 p-1.5 shadow-[0_18px_40px_-18px_rgba(60,20,10,0.45)] backdrop-blur-xl lg:hidden"
      >
        {tabs.slice(0, 2).map((item) => (
          <MobileTab key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        <Link
          href="/app/new"
          aria-label="New note"
          className="grid size-12 shrink-0 place-items-center rounded-full border border-[#a51d15] bg-[image:var(--button-red)] text-cream shadow-[var(--button-shadow)] transition-transform duration-200 active:scale-95"
        >
          <Plus className="size-5" strokeWidth={2.5} />
        </Link>
        {tabs.slice(2).map((item) => (
          <MobileTab key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>
    </>
  );
}

function MobileTab({ item, active }: { item: (typeof NAV)[number]; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] transition-colors ${active ? "text-ink" : "text-muted"}`}
    >
      <span className="relative">
        <Icon className={`size-5 ${active ? "text-red-500" : ""}`} strokeWidth={1.8} />
        {item.badge ? (
          <span className="absolute -top-1 -right-2.5 rounded-full bg-red-500 px-1 font-mono text-[9px] leading-[14px] text-cream">{item.badge}</span>
        ) : null}
      </span>
      {item.short}
      <span aria-hidden className={`size-1 rounded-full bg-red-500 transition-transform duration-300 ${active ? "scale-100" : "scale-0"}`} />
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const open = useCallback(() => setPaletteOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-dvh bg-paper">
      <Sidebar pathname={pathname} onSearch={open} />
      <MobileBars pathname={pathname} onSearch={open} />
      <main className="px-4 pt-6 pb-28 sm:px-6 lg:ml-[264px] lg:px-10 lg:pt-9 lg:pb-14">{children}</main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
