"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowUpRight, Check, LogOut, ShieldCheck, Trash2, User } from "lucide-react";
import { authClient, useCurrentUser } from "@/lib/auth-client";
import { NOTE_TYPES, type NoteTypeKey } from "@/lib/note-types";
import { LANGS, readPrefs, writePrefs } from "@/lib/prefs";
import { useMe } from "@/lib/queries";
import { CreditsSummary, planLabel, statusLine } from "../billing/billing-view";
import { NestedCard, PageHeader, Toggle, inputCls } from "../ui";

function Soon() {
  return <span className="ml-2 rounded-full border border-line px-1.5 py-px align-middle font-mono text-[9px] tracking-[0.1em] text-muted uppercase">Coming soon</span>;
}

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
  const router = useRouter();
  const user = useCurrentUser();
  const [name, setName] = useState(user.fullName);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(readPrefs);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [saved, setSaved] = useState(false);
  const { data: me } = useMe();

  const setPref = (patch: Partial<typeof prefs>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    writePrefs(patch);
  };

  const signOut = async () => {
    await authClient.signOut();
    router.replace("/sign-in");
  };

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
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-nt-lecture ring-1 ring-ink/10">
                {name ? <span className="serif-accent text-[26px]">{name[0]}</span> : <User className="size-6" strokeWidth={1.7} aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-medium tracking-[-0.02em]">{name || "Your name"}</p>
                <p className="truncate text-[13px] text-muted">{user.email}</p>
              </div>
              <button type="button" onClick={signOut} className="btn btn-ghost btn-sm hidden sm:inline-flex">
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
                <input value={user.email} readOnly className={`${inputCls} mt-1.5 text-muted`} />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              {saveError && <span className="text-[13px] text-red-600">{saveError}</span>}
              {saved && (
                <span className="rise flex items-center gap-1 text-[13px] text-green-800">
                  <Check className="size-3.5" /> Saved
                </span>
              )}
              <button
                type="button"
                onClick={async () => {
                  setSaveError(null);
                  const { error } = await authClient.updateUser({ name: name.trim() });
                  if (error) {
                    setSaveError(error.message ?? "Couldn't save. Try again.");
                    return;
                  }
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
            aside={
              <span className="rounded-full border border-line-strong bg-card px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] uppercase">{planLabel(me?.billing)}</span>
            }
          >
            {!me ? (
              <div className="space-y-3" aria-busy="true">
                {[0, 1].map((i) => (
                  <div key={i} className="skeleton h-8 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[1fr_1.1fr]">
                <div>
                  <p className="text-[14px] text-ink-soft">{statusLine(me.billing)}</p>
                  <Link href="/app/billing" className="btn btn-red btn-sm mt-4">
                    {me.billing.status === "none" ? "Start free trial" : "Manage plan"}
                    <ArrowUpRight className="btn-arrow size-3.5" />
                  </Link>
                </div>
                <CreditsSummary billing={me.billing} />
              </div>
            )}
          </NestedCard>
        </div>

        {/* Defaults */}
        <div className="rise" style={{ animationDelay: "180ms" }}>
          <NestedCard id="defaults" eyebrow="03" title="Defaults for new notes" className="scroll-mt-28">
            <Row title="Default note type" sub="Pre-selected in the add flow, on this browser. Auto-detect picks one after reading the source.">
              <select value={prefs.noteType} onChange={(e) => setPref({ noteType: e.target.value as NoteTypeKey | "auto" })} className={selectCls} style={caret} aria-label="Default note type">
                <option value="auto">Auto-detect</option>
                {NOTE_TYPES.map((n) => (
                  <option key={n.key} value={n.key}>
                    {n.label}
                  </option>
                ))}
              </select>
            </Row>
            <Row title="Output language" sub="Notes can be in a different language from the source." last>
              <select value={prefs.language} onChange={(e) => setPref({ language: e.target.value })} className={selectCls} style={caret} aria-label="Output language">
                {LANGS.map((l) => (
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
              Auto-delete the original recording or file once your notes are generated. <Soon />
            </p>
            <p className="mt-2 text-[13px] text-muted">For now, originals are kept with the note so you can play them back and page through them. Deleting a note deletes its original too.</p>
            <ul className="pointer-events-none mt-4 grid grid-cols-[minmax(0,1fr)] gap-2 opacity-60 sm:grid-cols-2">
              {NOTE_TYPES.map((n) => (
                <li key={n.key} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-3.5 py-2.5">
                  <span className="flex items-center gap-2.5 text-[13px]">
                    <span className="size-2.5 rounded-full ring-1 ring-ink/15" style={{ background: n.color }} aria-hidden />
                    {n.label}
                  </span>
                  <Toggle checked={false} onChange={() => {}} label={`Auto-delete originals for ${n.label} (coming soon)`} size="sm" />
                </li>
              ))}
            </ul>
          </NestedCard>
        </div>

        {/* Notifications */}
        <div className="rise" style={{ animationDelay: "260ms" }}>
          <NestedCard id="notifications" eyebrow="05" title="Notifications" className="scroll-mt-28" aside={<Soon />}>
            <p className="mb-4 text-[13px] text-muted">We don’t send any emails besides sign-in codes yet. Check the library for finished notes and Review for due cards.</p>
            <div className="pointer-events-none opacity-60">
              <Row title="Notes are ready" sub="Email when processing finishes.">
                <Toggle checked={false} onChange={() => {}} label="Notes are ready (coming soon)" />
              </Row>
              <Row title="Daily review reminder" sub="When cards are due.">
                <Toggle checked={false} onChange={() => {}} label="Daily review reminder (coming soon)" />
              </Row>
              <Row title="Tasks due" sub="A nudge the morning homework, a reading or an exam is due." last>
                <Toggle checked={false} onChange={() => {}} label="Tasks due (coming soon)" />
              </Row>
            </div>
          </NestedCard>
        </div>

        {/* Danger */}
        <div className="rise" style={{ animationDelay: "300ms" }}>
          <NestedCard id="danger" eyebrow="06" title="Danger zone" tone="danger" className="scroll-mt-28">
            <Row title="Export everything" sub="A zip of every note, transcript and flashcard deck as Markdown. For now, export each output from its note.">
              <button type="button" disabled className="btn btn-ghost btn-sm cursor-not-allowed opacity-60">
                Coming soon
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
                  disabled={confirmDelete !== "DELETE" || deleting}
                  onClick={async () => {
                    setDeleting(true);
                    setDeleteError(null);
                    const { error } = await authClient.deleteUser();
                    if (error) {
                      setDeleting(false);
                      setDeleteError(error.message ?? "Couldn’t delete the account. Try again.");
                      return;
                    }
                    router.replace("/");
                  }}
                  className="btn btn-ghost btn-sm !border-red-300 !text-red-700 hover:!border-red-600 hover:!bg-red-50"
                >
                  <Trash2 className="size-3.5" /> Delete account
                </button>
                {deleteError && <p className="text-[12px] text-red-600">{deleteError}</p>}
              </div>
            </Row>
          </NestedCard>
        </div>
      </div>
    </div>
  );
}
