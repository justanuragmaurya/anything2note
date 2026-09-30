"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { AlertCircle, ArrowUpRight, Check, Download, Loader2, LogOut, RotateCcw, ShieldCheck, Trash2, User } from "lucide-react";
import { strToU8, zip, type Zippable } from "fflate";
import type { ItemDetail, LibraryItem, UserSettings } from "@a2n/shared";
import { api, errorMessage } from "@/lib/api";
import { authClient, useCurrentUser } from "@/lib/auth-client";
import { fileSafe, flashcardsCsv, toMarkdown } from "@/lib/export";
import { anchorFits, fmtTime, todayIso } from "@/lib/format";
import { NOTE_TYPES, OUTPUT_LABELS, type NoteTypeKey } from "@/lib/note-types";
import { apiLanguage, languageLabel, languageOptions } from "@/lib/prefs";
import { useMe, useSettings, useUpdateSettings } from "@/lib/queries";
import { CreditsSummary, planLabel, statusLine } from "../billing/billing-view";
import { NestedCard, PageHeader, Toggle, inputCls } from "../ui";

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
  const [confirmDelete, setConfirmDelete] = useState("");
  const [saved, setSaved] = useState(false);
  const { data: me } = useMe();
  const settingsQuery = useSettings();
  const settings = settingsQuery.data;
  const save = useUpdateSettings();
  const [lastSection, setLastSection] = useState<SettingsSection | null>(null);

  const setPref = (section: SettingsSection, patch: Partial<UserSettings>) => {
    setLastSection(section);
    save.mutate(patch);
  };
  const status = (section: SettingsSection) => (lastSection === section ? <SaveStatus state={save.status} error={save.error} /> : null);
  const lang = languageLabel(settings?.language);

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
        sub="Account, plan, defaults for new notes, what we keep, and which emails you get."
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
          <NestedCard id="defaults" eyebrow="03" title="Defaults for new notes" className="scroll-mt-28" aside={status("defaults")}>
            <SettingsBody query={settingsQuery} rows={2}>
              {settings && (
                <>
                  <Row title="Default note type" sub="Pre-selected when you add a note, on every device. Auto-detect picks one after reading the source.">
                    <select
                      value={settings.defaultNoteType}
                      onChange={(e) => setPref("defaults", { defaultNoteType: e.target.value as NoteTypeKey | "auto" })}
                      className={selectCls}
                      style={caret}
                      aria-label="Default note type"
                    >
                      <option value="auto">Auto-detect</option>
                      {NOTE_TYPES.map((n) => (
                        <option key={n.key} value={n.key}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  </Row>
                  <Row title="Output language" sub="Notes can be in a different language from the source. You can still change it for each note." last>
                    <select value={lang} onChange={(e) => setPref("defaults", { language: apiLanguage(e.target.value) })} className={selectCls} style={caret} aria-label="Output language">
                      {languageOptions(lang).map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </Row>
                </>
              )}
            </SettingsBody>
          </NestedCard>
        </div>

        {/* Privacy */}
        <div className="rise" style={{ animationDelay: "220ms" }}>
          <NestedCard
            id="privacy"
            eyebrow="04"
            title="Privacy & retention"
            className="scroll-mt-28"
            aside={status("privacy") ?? <ShieldCheck className="size-5 text-muted" aria-hidden />}
          >
            <SettingsBody query={settingsQuery} rows={1}>
              {settings && (
                <Row
                  title="Delete originals after processing"
                  sub="Uploaded files and recordings are deleted once their notes are made. The transcript or text, notes, flashcards and tasks stay, but you can’t play back or page through the original any more."
                  last
                >
                  <Toggle checked={settings.deleteOriginals} onChange={(v) => setPref("privacy", { deleteOriginals: v })} label="Delete originals after processing" />
                </Row>
              )}
            </SettingsBody>
            <p className="mt-4 border-t border-line pt-4 text-[13px] text-muted">
              Otherwise originals are kept with the note so you can replay them. Deleting a note always deletes its original too.
            </p>
          </NestedCard>
        </div>

        {/* Notifications */}
        <div className="rise" style={{ animationDelay: "260ms" }}>
          <NestedCard id="notifications" eyebrow="05" title="Notifications" className="scroll-mt-28" aside={status("notifications")}>
            <SettingsBody query={settingsQuery} rows={2}>
              {settings && (
                <>
                  <Row title="Notes are ready" sub={`Email ${user.email || "you"} when an item finishes processing.`}>
                    <Toggle checked={settings.emailNotesReady} onChange={(v) => setPref("notifications", { emailNotesReady: v })} label="Email when notes are ready" />
                  </Row>
                  <Row title="Daily reminders" sub="A morning email when flashcards are due to review or a task is due that day." last>
                    <Toggle checked={settings.emailReminders} onChange={(v) => setPref("notifications", { emailReminders: v })} label="Daily reminder emails" />
                  </Row>
                </>
              )}
            </SettingsBody>
          </NestedCard>
        </div>

        {/* Danger */}
        <div className="rise" style={{ animationDelay: "300ms" }}>
          <NestedCard id="danger" eyebrow="06" title="Danger zone" tone="danger" className="scroll-mt-28">
            <Row title="Export everything" sub="A zip of every ready note: each output and the transcript or text as Markdown, plus flashcards as Anki CSV.">
              <ExportAll />
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

/* ─────────────────────────── Saving ─────────────────────────── */

type SettingsSection = "defaults" | "privacy" | "notifications";

function SaveStatus({ state, error }: { state: "idle" | "pending" | "success" | "error"; error: Error | null }) {
  if (state === "pending")
    return (
      <span className="flex items-center gap-1 text-[12px] text-muted" role="status">
        <Loader2 className="spin size-3.5" /> Saving…
      </span>
    );
  if (state === "success")
    return (
      <span className="rise flex items-center gap-1 text-[12px] text-green-800" role="status">
        <Check className="size-3.5" /> Saved
      </span>
    );
  if (state === "error")
    return (
      <span className="max-w-[220px] text-right text-[12px] text-red-600" role="alert">
        {errorMessage(error)}
      </span>
    );
  return null;
}

function SettingsBody({ query, rows, children }: { query: ReturnType<typeof useSettings>; rows: number; children: ReactNode }) {
  if (query.data) return <>{children}</>;
  if (query.error)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-red-700" role="alert">
        <span className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {errorMessage(query.error)}
        </span>
        <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="btn btn-ghost btn-sm">
          {query.isFetching ? <Loader2 className="spin size-3.5" /> : <RotateCcw className="size-3.5" />} Try again
        </button>
      </div>
    );
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading settings">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-10 rounded-xl" />
      ))}
    </div>
  );
}

/* ─────────────────────────── Export everything ─────────────────────────── */

/** The transcript (media), pages (documents) or text, as Markdown. */
function sourceMarkdown(d: ItemDetail): string | null {
  const c = d.content;
  if (!c?.segments.length) return null;
  const { item } = d;
  const out = [`# ${item.title}`, "", `_${item.sourceLabel}${item.sourceUrl ? ` · ${item.sourceUrl}` : ""}_`, ""];
  for (const seg of c.segments) {
    if (seg.heading) out.push(`## ${seg.heading}`, "");
    const a = anchorFits(seg.anchor, c.kind) ? seg.anchor : undefined;
    const tag = a ? (a.kind === "time" ? `**[${fmtTime(a.at)}]** ` : `**[p. ${a.page}]** `) : "";
    out.push(`${tag}${seg.speaker ? `**${seg.speaker}:** ` : ""}${seg.text}`, "");
  }
  return out.join("\n");
}

/** Every file for one item, keyed by path inside the item's folder. */
function itemFiles(d: ItemDetail): Record<string, string> {
  const files: Record<string, string> = {};
  const keysInOrder = [...d.item.outputs, ...(Object.keys(d.outputs) as (keyof typeof d.outputs)[]).filter((k) => !d.item.outputs.includes(k))];
  keysInOrder.forEach((k, i) => {
    const o = d.outputs[k];
    if (o?.status !== "ready" || !o.data) return;
    const label = OUTPUT_LABELS[k];
    const n = String(i + 1).padStart(2, "0");
    files[`${n} ${fileSafe(label)}.md`] = toMarkdown(d.item.title, label, o.data);
    if (o.data.type === "flashcards" && o.data.cards.length) files[`${n} ${fileSafe(label)} (Anki).csv`] = flashcardsCsv(o.data);
  });
  const src = sourceMarkdown(d);
  if (src) files[d.content?.kind === "media" ? "Transcript.md" : "Source text.md"] = src;
  return files;
}

type ExportState = { phase: "idle" } | { phase: "working"; done: number; total: number } | { phase: "done"; count: number; skipped: number } | { phase: "error"; message: string };

const EXPORT_PARALLEL = 3;

/** Fetches every ready item and zips its outputs as Markdown in the browser. */
function ExportAll() {
  const [state, setState] = useState<ExportState>({ phase: "idle" });
  const cancelled = useRef(false);

  const run = async () => {
    cancelled.current = false;
    setState({ phase: "working", done: 0, total: 0 });
    try {
      const { items } = await api.library();
      const ready = items.filter((i) => i.status.state === "ready");
      if (!ready.length) {
        setState({ phase: "error", message: "There’s nothing to export yet. Notes show up here once they’re ready." });
        return;
      }
      setState({ phase: "working", done: 0, total: ready.length });
      const tree: Zippable = {};
      const taken = new Set<string>();
      const folderOf = (item: LibraryItem) => {
        const base = fileSafe(item.title);
        let name = base;
        for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} (${n})`;
        taken.add(name.toLowerCase());
        return name;
      };
      let done = 0;
      let skipped = 0;
      let next = 0;
      const index: string[] = ["# anything2note export", "", `Exported ${todayIso()}.`, ""];
      const folders = new Map<string, string>();
      ready.forEach((i) => folders.set(i.id, folderOf(i)));
      const worker = async () => {
        while (next < ready.length && !cancelled.current) {
          const item = ready[next++]!;
          try {
            const detail = await api.source(item.id);
            const files = itemFiles(detail);
            const dir: Record<string, Uint8Array> = {};
            for (const [name, body] of Object.entries(files)) dir[name] = strToU8(body);
            tree[folders.get(item.id)!] = dir;
          } catch {
            skipped += 1;
          }
          done += 1;
          if (!cancelled.current) setState({ phase: "working", done, total: ready.length });
        }
      };
      await Promise.all(Array.from({ length: Math.min(EXPORT_PARALLEL, ready.length) }, worker));
      if (cancelled.current) {
        setState({ phase: "idle" });
        return;
      }
      for (const item of ready) if (tree[folders.get(item.id)!]) index.push(`- [${item.title}](<${folders.get(item.id)}/>) · ${NOTE_TYPES.find((n) => n.key === item.noteType)?.label ?? item.noteType} · ${item.sourceLabel}`);
      tree["README.md"] = strToU8(index.join("\n") + "\n");
      const zipped = await new Promise<Uint8Array>((resolve, reject) => zip(tree, { level: 6 }, (err, data) => (err ? reject(err) : resolve(data))));
      const url = URL.createObjectURL(new Blob([zipped as Uint8Array<ArrayBuffer>], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `anything2note-export-${todayIso()}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setState({ phase: "done", count: ready.length - skipped, skipped });
    } catch (e) {
      setState({ phase: "error", message: errorMessage(e) });
    }
  };

  const working = state.phase === "working";
  const pct = working && state.total ? (state.done / state.total) * 100 : 0;
  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex items-center gap-2">
        {working && (
          <button
            type="button"
            onClick={() => {
              cancelled.current = true;
            }}
            className="btn btn-ghost btn-sm"
          >
            Cancel
          </button>
        )}
        <button type="button" onClick={run} disabled={working} className="btn btn-ghost btn-sm disabled:opacity-70">
          {working ? <Loader2 className="spin size-3.5" /> : <Download className="size-3.5" />}
          {working ? (state.total ? `Exporting ${state.done} of ${state.total}` : "Reading library…") : "Export as zip"}
        </button>
      </div>
      {working && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-panel sm:w-[220px]" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Export progress">
          <div className="progress-shimmer h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.max(3, pct)}%` }} />
        </div>
      )}
      {state.phase === "done" && (
        <p className="text-[12px] text-green-800" role="status">
          {state.count} {state.count === 1 ? "note" : "notes"} exported{state.skipped ? `. ${state.skipped} couldn’t be fetched; try again later.` : "."}
        </p>
      )}
      {state.phase === "error" && (
        <p className="max-w-[260px] text-[12px] text-red-600 sm:text-right" role="alert">
          {state.message}
        </p>
      )}
    </div>
  );
}
