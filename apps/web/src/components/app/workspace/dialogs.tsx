"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy, ExternalLink, FileText, Link2, Loader2, Printer, RefreshCw, Sparkles, Unlink } from "lucide-react";
import type { ExportFormat, ItemDetail, NoteTypeKey, OutputKey, Share } from "@a2n/shared";
import { errorMessage, workspaceApi } from "@/lib/api";
import { fileSafe, openPrintTarget, printHtml, saveBlob } from "@/lib/export";
import { relativeDate } from "@/lib/format";
import { noteType, OUTPUT_LABELS } from "@/lib/note-types";
import { inputCls } from "../ui";
import { Dialog } from "./dialog";

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-3 flex items-start gap-2 text-[13px] text-red-700" role="alert">
      <AlertCircle className="mt-0.5 size-4 shrink-0" /> {message}
    </p>
  );
}

/** Runs one request at a time with a busy flag and an error message. */
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run, setError };
}

/* ───────────── Share ───────────── */

export function ShareDialog({
  open,
  onClose,
  itemId,
  share,
  readyCount,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  itemId: string;
  share: Share | null;
  /** Outputs a visitor would see right now */
  readyCount: number;
  onChange: (share: Share | null) => Promise<void> | void;
}) {
  const { busy, error, run } = useAction();
  const [copied, setCopied] = useState(false);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* the field is selectable as a fallback */
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      title="Share a read-only link"
      sub="Anyone with the link can read this note’s outputs. They can’t edit anything or see your other notes."
      footer={
        share ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(async () => { await workspaceApi.unshare(itemId); await onChange(null); })}
              className="btn btn-ghost btn-sm mr-auto hover:!border-red-300 hover:!text-red-700"
            >
              {busy ? <Loader2 className="spin size-3.5" /> : <Unlink className="size-3.5" />} Stop sharing
            </button>
            <button type="button" onClick={onClose} disabled={busy} className="btn btn-ink btn-sm">
              Done
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onClose} disabled={busy} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button
              type="button"
              data-autofocus
              disabled={busy}
              onClick={() => run(async () => { const r = await workspaceApi.share(itemId); await onChange(r.share); })}
              className="btn btn-red btn-sm"
            >
              {busy ? <Loader2 className="spin size-3.5" /> : <Link2 className="size-3.5" />} Create link
            </button>
          </>
        )
      }
    >
      {share ? (
        <div>
          <label className="block">
            <span className="eyebrow text-[9px]">Link</span>
            <div className="mt-1.5 flex items-center gap-2">
              <input readOnly value={share.url} onFocus={(e) => e.currentTarget.select()} className={`${inputCls} min-w-0 flex-1 !py-2 font-mono text-[12px]`} aria-label="Share link" />
              <button type="button" data-autofocus onClick={() => copy(share.url)} className="btn btn-red btn-sm shrink-0" aria-label={copied ? "Copied" : "Copy link"}>
                {copied ? <Check className="tick-pop size-3.5" /> : <Copy className="size-3.5" />} <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
              </button>
              <a href={share.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm shrink-0" aria-label="Open the shared page">
                <ExternalLink className="size-3.5" /> <span className="hidden sm:inline">Open</span>
              </a>
            </div>
          </label>
          <p className="mt-3 text-[12px] text-muted">
            Shared {relativeDate(share.createdAt)} · {readyCount} {readyCount === 1 ? "output" : "outputs"} visible. Edits you make show up on the page; the recording, file and transcript stay private.
          </p>
        </div>
      ) : (
        <ul className="space-y-2 text-[13px] text-ink-soft">
          {[
            "Visitors see the finished outputs, in your tab order, with your first name.",
            "Your recording or file, the transcript and your chat stay private.",
            "Stop sharing any time and the link stops working.",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Check className="mt-0.5 size-3.5 shrink-0 text-red-500" /> {t}
            </li>
          ))}
        </ul>
      )}
      <ErrorLine message={error} />
    </Dialog>
  );
}

/* ───────────── Export (PDF / Word) ───────────── */

export function ExportDialog({
  open,
  onClose,
  detail,
  initialFormat,
  initialOutputs,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  detail: ItemDetail;
  initialFormat: ExportFormat;
  /** Pre-ticked outputs; all ready ones when omitted */
  initialOutputs?: OutputKey[];
  onDone: (message: string) => void;
}) {
  const { item } = detail;
  const ready = item.outputs.filter((k) => detail.outputs[k]?.status === "ready");
  const [format, setFormat] = useState<ExportFormat>(initialFormat);
  const [picked, setPicked] = useState<OutputKey[]>(() => (initialOutputs?.length ? initialOutputs.filter((k) => ready.includes(k)) : ready));
  const { busy, error, run, setError } = useAction();
  const all = picked.length === ready.length;

  const go = () => {
    if (picked.length === 0) return setError("Pick at least one output.");
    // Opened before the request so touch browsers don't block it as a popup.
    const target = format === "html" ? openPrintTarget() : null;
    const outputs = all ? undefined : ready.filter((k) => picked.includes(k));
    void run(async () => {
      try {
        const { blob, filename } = await workspaceApi.exportFile(item.id, format, outputs);
        if (format === "docx") {
          saveBlob(blob, filename ?? `${fileSafe(item.title)}.docx`);
          onDone("Word file downloaded");
        } else {
          printHtml(await blob.text(), target);
          onDone("Print dialog opened. Pick “Save as PDF”");
        }
      } catch (e) {
        target?.close();
        throw e;
      }
    }).then((ok) => ok && onClose());
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      title="Export"
      sub="A clean document with your outputs, timestamps and page references."
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button type="button" onClick={go} disabled={busy || ready.length === 0} className="btn btn-red btn-sm">
            {busy ? <Loader2 className="spin size-3.5" /> : format === "html" ? <Printer className="size-3.5" /> : <FileText className="size-3.5" />}
            {format === "html" ? "Download PDF" : "Download Word"}
          </button>
        </>
      }
    >
      <fieldset>
        <legend className="eyebrow text-[9px]">Format</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              { value: "html", label: "PDF", hint: "Opens your browser’s print dialog" },
              { value: "docx", label: "Word", hint: ".docx you can edit" },
            ] as const
          ).map((f) => (
            <label
              key={f.value}
              className={`cursor-pointer rounded-2xl border px-3.5 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-red-400 ${format === f.value ? "border-red-400 bg-red-50" : "border-line hover:border-line-strong"}`}
            >
              <input type="radio" name="export-format" value={f.value} checked={format === f.value} onChange={() => setFormat(f.value)} className="sr-only" />
              <span className="block text-sm font-medium text-ink">{f.label}</span>
              <span className="mt-0.5 block text-[12px] text-muted">{f.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <div className="flex items-center justify-between">
          <legend className="eyebrow text-[9px]">Outputs</legend>
          {ready.length > 1 && (
            <button type="button" onClick={() => setPicked(all ? [] : ready)} className="text-[12px] text-ink-soft hover:text-ink">
              {all ? "Clear" : "Select all"}
            </button>
          )}
        </div>
        {ready.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing is ready to export yet.</p>
        ) : (
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {ready.map((k) => {
              const on = picked.includes(k);
              return (
                <li key={k}>
                  <label className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-[13px] transition-colors ${on ? "border-line-strong bg-paper text-ink" : "border-line text-ink-soft hover:border-line-strong"}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        setError(null);
                        setPicked((p) => (on ? p.filter((x) => x !== k) : [...p, k]));
                      }}
                      className="size-4 accent-red-500"
                    />
                    {OUTPUT_LABELS[k]}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>
      <ErrorLine message={error} />
    </Dialog>
  );
}

/* ───────────── Regenerate ───────────── */

export function RegenerateDialog({
  open,
  onClose,
  output,
  custom,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  output: OutputKey;
  custom: boolean;
  onSubmit: (instructions: string | undefined) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const { busy, error, run } = useAction();
  const label = OUTPUT_LABELS[output];
  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      title={`Regenerate ${label.toLowerCase()}`}
      sub={custom ? "A fresh version replaces your current one. It’s free." : "You get your own fresh version; anyone else with this source keeps theirs. It’s free."}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button
            type="submit"
            form="regenerate-form"
            disabled={busy}
            className="btn btn-red btn-sm"
          >
            {busy ? <Loader2 className="spin size-3.5" /> : <RefreshCw className="size-3.5" />} Regenerate
          </button>
        </>
      }
    >
      <form
        id="regenerate-form"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => onSubmit(text.trim() || undefined)).then((ok) => ok && onClose());
        }}
      >
        <label className="block">
          <span className="eyebrow text-[9px]">Instructions · optional</span>
          <textarea
            data-autofocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") e.currentTarget.form?.requestSubmit();
            }}
            maxLength={1000}
            rows={3}
            placeholder={output === "flashcards" ? "e.g. Fewer cards, only definitions and formulas" : output === "quiz" ? "e.g. Harder questions, more on the second half" : "e.g. Shorter, and focus on the worked examples"}
            className={`${inputCls} mt-1.5 resize-y`}
          />
        </label>
      </form>
      <ErrorLine message={error} />
    </Dialog>
  );
}

/* ───────────── Change note type ───────────── */

export function NoteTypeDialog({
  open,
  onClose,
  from,
  to,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  from: NoteTypeKey;
  to: NoteTypeKey;
  onConfirm: () => Promise<void>;
}) {
  const { busy, error, run } = useAction();
  const next = noteType(to);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      title={
        <>
          Make this a <span className="serif-accent text-red-500">{next.label.toLowerCase()}</span> note?
        </>
      }
      sub={`It’s a ${noteType(from).label.toLowerCase()} note now. The tabs switch to the ${next.label.toLowerCase()} set of outputs.`}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button type="button" data-autofocus disabled={busy} onClick={() => void run(onConfirm).then((ok) => ok && onClose())} className="btn btn-red btn-sm">
            {busy ? <Loader2 className="spin size-3.5" /> : <Sparkles className="size-3.5" />} Switch to {next.label}
          </button>
        </>
      }
    >
      <p className="eyebrow text-[9px]">You’ll get</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {next.defaults.map((k) => (
          <li key={k} className="rounded-full px-2.5 py-1 text-[12px] text-ink" style={{ background: `color-mix(in oklab, ${next.color} 60%, transparent)` }}>
            {OUTPUT_LABELS[k]}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[13px] text-ink-soft">
        Any of these you don’t have yet are written now, at no extra credits. Outputs outside this set leave the tabs; you can add the {next.label.toLowerCase()} extras later from <span className="font-medium text-ink">+ Add</span>.
      </p>
      <ErrorLine message={error} />
    </Dialog>
  );
}
