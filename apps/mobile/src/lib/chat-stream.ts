import { fetch as expoFetch } from "expo/fetch";
import type { ChatMessage, ChatResponse, ChatStreamEvent } from "@a2n/shared";
import { ApiError, apiUrl, responseError, sessionHeaders } from "./api";

/**
 * Asks an item's chat with `Accept: text/event-stream`: `onDelta` gets the answer as it's written,
 * and the promise resolves to the saved reply. React Native's own fetch can't read a body as a
 * stream, so this uses `expo/fetch`. A server that answers with plain JSON works too.
 */
export async function streamChat(itemId: string, message: string, onDelta: (text: string) => void): Promise<ChatMessage> {
  let res;
  try {
    res = await expoFetch(apiUrl(`/sources/${itemId}/chat`), {
      method: "POST",
      credentials: "omit",
      headers: { ...(await sessionHeaders()), "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ message }),
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Can't reach anything2note. Check your connection and try again.");
  }
  if (!res.ok) throw responseError(res.status, await res.text().catch(() => ""));

  if (!(res.headers.get("content-type") ?? "").includes("text/event-stream") || !res.body) {
    return ((await res.json()) as ChatResponse).message;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  // Set from inside `handle`, so kept in an object TypeScript doesn't narrow.
  const saved: { reply: ChatMessage | null } = { reply: null };

  // One JSON event per `data:` line; blank lines separate events.
  const handle = (line: string) => {
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (!payload) return;
    let event: ChatStreamEvent;
    try {
      event = JSON.parse(payload) as ChatStreamEvent;
    } catch {
      return;
    }
    if (event.type === "delta") onDelta(event.text);
    else if (event.type === "done") saved.reply = event.message;
    else throw new ApiError(500, event.error.code, event.error.message);
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        handle(buffer.slice(0, nl).replace(/\r$/, ""));
        buffer = buffer.slice(nl + 1);
      }
    }
    handle(buffer.trim());
  } catch (e) {
    void reader.cancel().catch(() => undefined);
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, "NETWORK", "The connection dropped mid-answer. Try again.");
  }

  if (!saved.reply) throw new ApiError(0, "STREAM_ENDED", "The answer was cut off. Try again.");
  return saved.reply;
}
