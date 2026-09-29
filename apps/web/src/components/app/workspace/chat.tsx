"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowUp, Sparkles } from "lucide-react";
import type { ChatMessage } from "@a2n/shared";
import { api, errorMessage } from "@/lib/api";
import { anchorFits } from "@/lib/format";
import { keys, useInvalidate } from "@/lib/queries";
import { AnchorChip } from "../ui";

/** Generic starters; each one is sent as a real question. */
const STARTERS = ["Summarise this in three bullet points", "What are the key terms?", "What should I remember for a test?"];

type Pending = { text: string; error?: string };

/** Chat over this item's content (`POST /sources/:id/chat`, answered in one go, with citations). */
export function ChatView({
  itemId,
  itemTitle,
  history,
  contentKind,
}: {
  itemId: string;
  itemTitle: string;
  history: ChatMessage[];
  contentKind: "media" | "document" | "text" | null;
}) {
  const invalidate = useInvalidate();
  const [msgs, setMsgs] = useState<ChatMessage[]>(history);
  const [pending, setPending] = useState<Pending | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = !!pending && !pending.error;
  const ready = contentKind !== null;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, pending]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy || !ready) return;
    setInput("");
    setPending({ text: q });
    try {
      const { message } = await api.chat(itemId, q);
      const now = Date.now();
      setMsgs((ms) => [...ms, { id: `local-${now}`, role: "user", content: q, citations: [], createdAt: now }, message]);
      setPending(null);
      void invalidate(keys.me, keys.item(itemId));
    } catch (e) {
      setPending({ text: q, error: errorMessage(e) });
    }
  };

  return (
    <div className="flex h-[min(68vh,620px)] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1" aria-live="polite">
        {msgs.length === 0 && !pending && (
          <div className="rise flex h-full flex-col items-center justify-center px-4 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-red-500 text-cream shadow-[var(--button-shadow)]">
              <Sparkles className="size-5" />
            </span>
            <p className="mt-4 text-[20px] tracking-[-0.03em]">
              Ask this note <span className="serif-accent text-red-500">anything</span>.
            </p>
            <p className="mt-1 max-w-[38ch] text-sm text-muted">
              {ready ? <>Answers come only from “{itemTitle}”, with citations you can click.</> : "Chat opens once the source has been read."}
            </p>
          </div>
        )}
        {msgs.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="rise flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[image:var(--button-ink)] px-4 py-2.5 text-sm whitespace-pre-line text-[#f6ece8]">{m.content}</p>
            </div>
          ) : (
            <div key={m.id} className="rise flex max-w-[92%] gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-red-500 text-cream">
                <Sparkles className="size-3.5" />
              </span>
              <div className="min-w-0 rounded-2xl rounded-tl-md border border-line bg-paper px-4 py-3 text-sm leading-relaxed">
                <p className="whitespace-pre-line">{m.content}</p>
                {m.citations.some((c) => anchorFits(c, contentKind)) && (
                  <div className="rise mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
                    <span className="font-mono text-[9px] tracking-[0.12em] text-muted uppercase">Sources</span>
                    {m.citations
                      .filter((c) => anchorFits(c, contentKind))
                      .map((c, i) => (
                        <AnchorChip key={i} anchor={c} />
                      ))}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
        {pending && (
          <>
            <div className="rise flex justify-end">
              <p className={`max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm whitespace-pre-line ${pending.error ? "border border-red-200 bg-red-50 text-red-800" : "bg-[image:var(--button-ink)] text-[#f6ece8]"}`}>{pending.text}</p>
            </div>
            {pending.error ? (
              <p className="rise flex items-start gap-2 text-[13px] text-red-700" role="alert">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>
                  {pending.error}{" "}
                  <button type="button" onClick={() => send(pending.text)} className="underline underline-offset-4">
                    Try again
                  </button>
                </span>
              </p>
            ) : (
              <div className="rise flex max-w-[92%] gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-red-500 text-cream">
                  <Sparkles className="size-3.5" />
                </span>
                <div className="rounded-2xl rounded-tl-md border border-line bg-paper px-4 py-3">
                  <span className="flex items-center gap-1 py-1" aria-label="Thinking">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="pulse-dot size-1.5 rounded-full bg-muted" style={{ animationDelay: `${d * 160}ms` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4">
        {msgs.length === 0 && !pending && ready && (
          <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="shrink-0 rounded-full border border-line bg-card px-3 py-1.5 text-[12px] text-ink-soft transition-all hover:-translate-y-px hover:border-line-strong hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2 rounded-full border border-line bg-card p-1.5 pl-4 transition-[border-color,box-shadow] focus-within:border-red-400 focus-within:shadow-[0_0_0_4px_var(--red-50)]"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={4000}
            disabled={!ready}
            placeholder={ready ? "Ask anything about this item…" : "Available once the source has been read"}
            aria-label="Message"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            aria-label={busy ? "Waiting for the answer" : "Send"}
            disabled={!input.trim() || busy || !ready}
            className="grid size-9 place-items-center rounded-full bg-red-500 text-cream transition-all hover:bg-red-600 active:scale-90 disabled:bg-line-strong"
          >
            <ArrowUp className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
