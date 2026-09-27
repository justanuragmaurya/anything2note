"use client";

import { useState, type ReactNode } from "react";
import { ArrowUpRight, Check, CreditCard, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { DitherGlow } from "@/components/ui/dither-glow";
import { USER } from "@/lib/mock/app-data";
import { NOTE_TYPES, type NoteTypeKey } from "@/lib/mock/note-types";
import { NestedCard, PageHeader, ProgressBar, Toggle, inputCls } from "../ui";

function Row({ title, sub, children, last = false }: { title: string; sub?: ReactNode; children: ReactNode; last?: boolean }) {
  return (
    <div className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 ${last ? "" : "border-b border-line"} first:pt-0 last:pb-0`}>
      <div className="min-w-0">
        <p className="text-[14px] font-medium tracking-[-0.01em]">{title}</p>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const selectCls = `${inputCls} cursor-pointer appearance-none bg-[length:12px] bg-[right_16px_center] bg-no-repeat pr-10 sm:w-[220px]`;
const caret = { backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M2 4l4 4 4-4' fill='none' stroke='%237d6660' stroke-width='1.5'/></svg>\")" };

const SECTIONS = [
  { id: "account", label: "Account" },
  { id: "billing", label: "Plan & billing" },
  { id: "defaults", label: "Defaults" },
  { id: "privacy", label: "Privacy" },
  { id: "notifications", label: "Notifications" },
  { id: "danger", label: "Danger zone" },
];

export function SettingsView() {
  const [name, setName] = useState(USER.fullName);
  const [country, setCountry] = useState<"in" | "other">("in");
  const [cycle, setCycle] = useState<"yearly" | "monthly">("yearly");
  const [defType, setDefType] = useState<NoteTypeKey | "auto">("auto");
  const [lang, setLang] = useState("Same as source");
  const [autoDelete, setAutoDelete] = useState<Record<NoteTypeKey, boolean>>(
    () => Object.fromEntries(NOTE_TYPES.map((n) => [n.key, n.key === "meeting" || n.key === "interview"])) as Record<NoteTypeKey, boolean>,
  );
  const [retention, setRetention] = useState("7");
  const [notif, setNotif] = useState({ ready: true, review: true, actions: true, product: false });
  const [reviewTime, setReviewTime] = useState("08:30");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [saved, setSaved] = useState(false);

  const u = USER.usage;
  const price = country === "in" ? (cycle === "yearly" ? "₹1,499" : "₹179") : cycle === "yearly" ? "$59" : "$7";
  const per = cycle === "yearly" ? "/yr" : "/mo";

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader
        eyebrow="Settings"
        title={
          <>
            Make it <span className="serif-accent text-red-500">yours</span>.
          </>
        }
        sub="Account, plan, defaults for new notes, and how long we keep your originals."
      />

      <nav aria-label="Sections" className="no-scrollbar rise sticky top-[61px] z-20 -mx-4 mt-6 flex gap-1.5 overflow-x-auto bg-paper/85 px-4 py-2 backdrop-blur-xl sm:mx-0 sm:rounded-full sm:px-2 lg:top-3" style={{ animationDelay: "60ms" }}>
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] transition-all hover:-translate-y-px ${
              s.id === "danger" ? "border-red-200 text-red-700 hover:border-red-400" : "border-line bg-card text-ink-soft hover:border-line-strong hover:text-ink"
            }`}
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="mt-6 space-y-6">
        {/* Account */}
        <div className="rise" style={{ animationDelay: "100ms" }}>
          <NestedCard id="account" eyebrow="01" title="Account" className="scroll-mt-28">
            <div className="flex items-center gap-4 border-b border-line pb-5">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-nt-meeting ring-1 ring-ink/10">
                <span className="serif-accent text-[26px]">{name[0] ?? "A"}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-medium tracking-[-0.02em]">{name || "Your name"}</p>
                <p className="truncate text-[13px] text-muted">{USER.email} · signed in with Google</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm hidden sm:inline-flex">
                <LogOut className="size-3.5" /> Sign out
              </button>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pt-5 sm:grid-cols-2">
              <label className="block">
                <span className="eyebrow text-[10px]">Display name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} mt-1.5`} />
              </label>
              <label className="block">
                <span className="eyebrow text-[10px]">Email</span>
                <input value={USER.email} readOnly className={`${inputCls} mt-1.5 text-muted`} />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              {saved && (
                <span className="rise flex items-center gap-1 text-[13px] text-green-800">
                  <Check className="size-3.5" /> Saved
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSaved(true);
                  setTimeout(() => setSaved(false), 1800);
                }}
                className="btn btn-ink btn-sm"
              >
                Save changes
              </button>
            </div>
          </NestedCard>
        </div>

        {/* Billing */}
        <div className="rise" style={{ animationDelay: "140ms" }}>
          <NestedCard
            id="billing"
            eyebrow="02"
            title="Plan & billing"
            className="scroll-mt-28"
            aside={<span className="rounded-full border border-line-strong bg-card px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] uppercase">{USER.plan} plan</span>}
          >
            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[1fr_1.1fr]">
              <div>
                <p className="eyebrow text-[10px]">This month · resets {u.resetsOn}</p>
                <div className="mt-4 space-y-4">
                  {[
                    { k: "Media minutes", v: u.mediaMin, max: u.mediaLimit, unit: "min" },
                    { k: "Document pages", v: u.pages, max: u.pagesLimit, unit: "pages" },
                    { k: "Chat messages today", v: u.chatToday, max: u.chatLimit, unit: "" },
                  ].map((m, i) => (
                    <div key={m.k}>
                      <div className="flex items-baseline justify-between text-[13px]">
                        <span className="text-ink-soft">{m.k}</span>
                        <span className="font-mono text-[11px] tabular-nums">
                          {m.v} / {m.max} {m.unit}
                        </span>
                      </div>
                      <ProgressBar value={(m.v / m.max) * 100} className="mt-1.5 h-2" tone={i === 0 ? "red" : "ink"} />
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[12px] text-muted">Free: 60 min max per file, Markdown export only.</p>
              </div>

              <div className="relative overflow-hidden rounded-[22px] bg-red-500 p-5 text-cream">
                <DitherGlow />
                <div className="relative">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-[10px] tracking-[0.14em] text-cream/80 uppercase">Pro</p>
                    <SlidingTabs
                      size="sm"
                      tone="night"
                      value={country}
                      onChange={setCountry}
                      ariaLabel="Billing country"
                      items={[
                        { value: "in", label: "India" },
                        { value: "other", label: "Other" },
                      ]}
                    />
                  </div>
                  <p className="mt-4 text-[44px] leading-none tracking-[-0.05em]">
                    <span key={`${country}-${cycle}`} className="rise inline-block">
                      {price}
                    </span>
                    <span className="serif-accent text-[22px] text-cream/80">{per}</span>
                  </p>
                  <button type="button" onClick={() => setCycle((c) => (c === "yearly" ? "monthly" : "yearly"))} className="mt-1.5 text-[12px] text-cream/80 underline decoration-cream/40 underline-offset-4 hover:text-cream">
                    {cycle === "yearly" ? "Billed yearly · switch to monthly" : "Billed monthly · switch to yearly (save 30%)"}
                  </button>
                  <ul className="mt-4 space-y-1.5 text-[13px]">
                    {["2,000 media min & 2,000 pages", "5-hour files, speaker labels", "PDF, DOCX & Anki exports, share links"].map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="size-3.5 shrink-0" strokeWidth={3} /> {f}
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="btn btn-cream mt-5 w-full">
                    Upgrade to Pro <ArrowUpRight className="btn-arrow size-4" />
                  </button>
                  <p className="mt-2.5 text-center font-mono text-[9px] tracking-[0.1em] text-cream/75 uppercase">
                    {country === "in" ? "UPI, cards & netbanking · GST invoice" : "Cards & PayPal · prices in USD"}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-[13px] text-muted">
              <span className="flex items-center gap-2">
                <CreditCard className="size-4" /> No payment method on file
              </span>
              <button type="button" className="btn btn-red btn-sm">
                Upgrade
              </button>
            </div>
          </NestedCard>
        </div>

        {/* Defaults */}
        <div className="rise" style={{ animationDelay: "180ms" }}>
          <NestedCard id="defaults" eyebrow="03" title="Defaults for new notes" className="scroll-mt-28">
            <Row title="Default note type" sub="Pre-selected in the add flow. We still suggest one from the source.">
              <select value={defType} onChange={(e) => setDefType(e.target.value as NoteTypeKey | "auto")} className={selectCls} style={caret} aria-label="Default note type">
                <option value="auto">Auto-detect</option>
                {NOTE_TYPES.map((n) => (
                  <option key={n.key} value={n.key}>
                    {n.label}
                  </option>
                ))}
              </select>
            </Row>
            <Row title="Output language" sub="Notes can be in a different language from the source." last>
              <select value={lang} onChange={(e) => setLang(e.target.value)} className={selectCls} style={caret} aria-label="Output language">
                {["Same as source", "English", "Hindi", "Spanish", "French", "German", "Japanese"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Row>
          </NestedCard>
        </div>

        {/* Privacy */}
        <div className="rise" style={{ animationDelay: "220ms" }}>
          <NestedCard
            id="privacy"
            eyebrow="04"
            title="Privacy & retention"
            className="scroll-mt-28"
            aside={<ShieldCheck className="size-5 text-muted" aria-hidden />}
          >
            <p className="text-[13px] text-ink-soft">
              Auto-delete the original recording or file once your notes are generated. Transcripts and outputs are kept until you delete them.
            </p>
            <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
              {NOTE_TYPES.map((n) => (
                <li key={n.key} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-3.5 py-2.5">
                  <span className="flex items-center gap-2.5 text-[13px]">
                    <span className="size-2.5 rounded-full ring-1 ring-ink/15" style={{ background: n.color }} aria-hidden />
                    {n.label}
                    {n.key === "meeting" && <span className="font-mono text-[9px] tracking-[0.1em] text-muted uppercase">default on</span>}
                  </span>
                  <Toggle checked={autoDelete[n.key]} onChange={(v) => setAutoDelete((a) => ({ ...a, [n.key]: v }))} label={`Auto-delete originals for ${n.label}`} size="sm" />
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-line pt-4">
              <Row title="Delete originals after" sub="Gives you time to re-run transcription if something looks off." last>
                <SlidingTabs
                  size="sm"
                  tone="ink"
                  value={retention}
                  onChange={setRetention}
                  ariaLabel="Retention days"
                  items={[
                    { value: "0", label: "Now" },
                    { value: "7", label: "7 days" },
                    { value: "30", label: "30 days" },
                  ]}
                />
              </Row>
            </div>
          </NestedCard>
        </div>

        {/* Notifications */}
        <div className="rise" style={{ animationDelay: "260ms" }}>
          <NestedCard id="notifications" eyebrow="05" title="Notifications" className="scroll-mt-28">
            <Row title="Notes are ready" sub="Email when processing finishes.">
              <Toggle checked={notif.ready} onChange={(v) => setNotif((n) => ({ ...n, ready: v }))} label="Notes are ready" />
            </Row>
            <Row
              title="Daily review reminder"
              sub={
                <span className="inline-flex flex-wrap items-center gap-2">
                  When cards are due, at
                  <input
                    type="time"
                    value={reviewTime}
                    onChange={(e) => setReviewTime(e.target.value)}
                    disabled={!notif.review}
                    aria-label="Reminder time"
                    className="rounded-full border border-line bg-card px-2 py-0.5 font-mono text-[11px] text-ink disabled:opacity-50"
                  />
                </span>
              }
            >
              <Toggle checked={notif.review} onChange={(v) => setNotif((n) => ({ ...n, review: v }))} label="Daily review reminder" />
            </Row>
            <Row title="Action items due" sub="A nudge the morning an action item is due.">
              <Toggle checked={notif.actions} onChange={(v) => setNotif((n) => ({ ...n, actions: v }))} label="Action items due" />
            </Row>
            <Row title="Product updates" sub="New note types and features, once a month at most." last>
              <Toggle checked={notif.product} onChange={(v) => setNotif((n) => ({ ...n, product: v }))} label="Product updates" />
            </Row>
          </NestedCard>
        </div>

        {/* Danger */}
        <div className="rise" style={{ animationDelay: "300ms" }}>
          <NestedCard id="danger" eyebrow="06" title="Danger zone" tone="danger" className="scroll-mt-28">
            <Row title="Export everything" sub="A zip of every note, transcript and flashcard deck as Markdown.">
              <button type="button" className="btn btn-ghost btn-sm">
                Request export
              </button>
            </Row>
            <Row title="Delete account" sub="Removes your library, recordings and billing history. This can’t be undone." last>
              <div className="flex flex-col gap-2 sm:items-end">
                <input
                  value={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  aria-label="Type DELETE to confirm"
                  className={`${inputCls} !rounded-full !py-2 sm:w-[220px]`}
                />
                <button
                  type="button"
                  disabled={confirmDelete !== "DELETE"}
                  className="btn btn-ghost btn-sm !border-red-300 !text-red-700 hover:!border-red-600 hover:!bg-red-50"
                >
                  <Trash2 className="size-3.5" /> Delete account
                </button>
              </div>
            </Row>
          </NestedCard>
        </div>
      </div>
    </div>
  );
}
