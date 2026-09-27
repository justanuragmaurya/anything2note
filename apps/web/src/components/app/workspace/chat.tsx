"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles, Square } from "lucide-react";
import type { Anchor, Workspace } from "@/lib/mock/app-data";
import { AnchorChip } from "../ui";

type Msg = { id: number; role: "user" | "assistant"; text: string; citations: Anchor[]; state: "thinking" | "streaming" | "done" };

function pickReply(chat: Workspace["chat"], q: string) {
  const s = q.toLowerCase();
  return chat.replies.find((r) => r.keywords.some((k) => s.includes(k))) ?? chat.fallback;
}

/** Mock of the SSE chat endpoint: "thinking", then word-sized chunks, then citations. */
export function ChatView({ chat, itemTitle }: { chat: Workspace["chat"]; itemTitle: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const busy = msgs.some((m) => m.state !== "done");

  useEffect(() => {
    const ts = timers.current;
    return () => ts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setMsgs((ms) => ms.map((m) => (m.state === "done" ? m : { ...m, state: "done", text: m.text || "Stopped." })));
  };

  const send = (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    const reply = pickReply(chat, q);
    const id = nextId.current;
    nextId.current += 2;
    setMsgs((ms) => [...ms, { id, role: "user", text: q, citations: [], state: "done" }, { id: id + 1, role: "assistant", text: "", citations: reply.citations, state: "thinking" }]);

    const words = reply.text.split(/(\s+)/);
    let n = 0;
    const tick = () => {
      n += 2;
      const done = n >= words.length;
      setMsgs((ms) => ms.map((m) => (m.id === id + 1 ? { ...m, text: words.slice(0, n).join(""), state: done ? "done" : "streaming" } : m)));
      if (!done) timers.current.push(setTimeout(tick, 45 + (n % 5) * 12));
    };
    timers.current.push(setTimeout(tick, 700));
  };

  return (
    <div className="flex h-[min(68vh,620px)] flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1" aria-live="polite">
        {msgs.length === 0 && (
          <div className="rise flex h-full flex-col items-center justify-center px-4 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-red-500 text-cream shadow-[var(--button-shadow)]">
              <Sparkles className="size-5" />
            </span>
            <p className="mt-4 text-[20px] tracking-[-0.03em]">
              Ask this note <span className="serif-accent text-red-500">anything</span>.
            </p>
            <p className="mt-1 max-w-[38ch] text-sm text-muted">Answers come only from “{itemTitle}”, with citations you can click.</p>
          </div>
        )}
        {msgs.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="rise flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[image:var(--button-ink)] px-4 py-2.5 text-sm text-[#f6ece8]">{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className="rise flex max-w-[92%] gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-red-500 text-cream">
                <Sparkles className="size-3.5" />
              </span>
              <div className="min-w-0 rounded-2xl rounded-tl-md border border-line bg-paper px-4 py-3 text-sm leading-relaxed">
                {m.state === "thinking" ? (
                  <span className="flex items-center gap-1 py-1" aria-label="Thinking">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="pulse-dot size-1.5 rounded-full bg-muted" style={{ animationDelay: `${d * 160}ms` }} />
                    ))}
                  </span>
                ) : (
                  <span className={m.state === "streaming" ? "caret" : ""}>{m.text}</span>
                )}
                {m.state === "done" && m.citations.length > 0 && (
                  <div className="rise mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
                    <span className="font-mono text-[9px] tracking-[0.12em] text-muted uppercase">Sources</span>
                    {m.citations.map((c, i) => (
                      <AnchorChip key={i} anchor={c} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      <div className="mt-4">
        {msgs.length === 0 && (
          <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto">
            {chat.suggestions.map((s) => (
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
            send(input);
          }}
          className="flex items-center gap-2 rounded-full border border-line bg-card p-1.5 pl-4 transition-[border-color,box-shadow] focus-within:border-red-400 focus-within:shadow-[0_0_0_4px_var(--red-50)]"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about this item…"
            aria-label="Message"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          {busy ? (
            <button type="button" onClick={stop} aria-label="Stop generating" className="grid size-9 place-items-center rounded-full bg-ink text-cream transition-transform active:scale-90">
              <Square className="size-3 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Send"
              disabled={!input.trim()}
              className="grid size-9 place-items-center rounded-full bg-red-500 text-cream transition-all hover:bg-red-600 active:scale-90 disabled:bg-line-strong"
            >
              <ArrowUp className="size-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
