import { env } from "cloudflare:workers";
import { z } from "zod";

/*
 * Provider-agnostic LLM client (plan §5.4): any OpenAI-compatible chat API, configured by
 * LLM_BASE_URL / LLM_API_KEY / MODEL_*. `llmJSON` asks for JSON matching a zod schema, validates
 * it, repairs once on a bad shape, and falls back to MODEL_FALLBACK on provider errors.
 * `llmStream` streams plain text (chat).
 */

export type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type Message = { role: "system" | "user" | "assistant"; content: string | Part[] };

export class LlmError extends Error {}

/** Reasoning models (e.g. MiMo) think before answering; that eats max_tokens, so callers choose how much. */
export type Reasoning = "off" | "low" | "medium";

function request(model: string, messages: Message[], maxTokens: number, reasoning: Reasoning, extra: object) {
  return fetch(`${env.LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.LLM_API_KEY}`,
      "Content-Type": "application/json",
      "X-Title": "anything2note",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
      reasoning: reasoning === "off" ? { enabled: false } : { effort: reasoning, exclude: true },
      // OpenRouter otherwise may route to a slow host; on MiMo this is ~4x faster for long notes.
      provider: { sort: "throughput" },
      ...extra,
    }),
  });
}

async function complete(model: string, messages: Message[], jsonSchema: object, maxTokens: number, reasoning: Reasoning): Promise<string> {
  const res = await request(model, messages, maxTokens, reasoning, {
    response_format: { type: "json_schema", json_schema: { name: "output", strict: false, schema: jsonSchema } },
  });
  if (!res.ok) throw new LlmError(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string }; finish_reason?: string }[]; error?: { message?: string } };
  const choice = body.choices?.[0];
  const text = choice?.message?.content;
  if (!text) throw new LlmError(`LLM returned no content (finish: ${choice?.finish_reason ?? "?"}${body.error?.message ? `, ${body.error.message}` : ""})`);
  return text;
}

function parseJson(text: string): unknown {
  // Some models wrap JSON in ```json fences despite response_format.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

export async function llmJSON<T>(opts: {
  model: string;
  system: string;
  user: string | Part[];
  schema: z.ZodType<T>;
  maxTokens?: number;
  reasoning?: Reasoning;
}): Promise<{ data: T; model: string }> {
  const jsonSchema = z.toJSONSchema(opts.schema, { target: "draft-7" });
  const base: Message[] = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ];
  const maxTokens = opts.maxTokens ?? 16_000;
  const reasoning = opts.reasoning ?? "low";

  const attempt = async (model: string) => {
    let messages = base;
    let lastError = "";
    for (let i = 0; i < 2; i++) {
      const text = await complete(model, messages, jsonSchema, maxTokens, reasoning);
      try {
        const parsed = opts.schema.safeParse(parseJson(text));
        if (parsed.success) return { data: parsed.data, model };
        lastError = z.prettifyError(parsed.error).slice(0, 1500);
      } catch (e) {
        lastError = `Not valid JSON: ${(e as Error).message}`;
      }
      messages = [
        ...base,
        { role: "assistant", content: text.slice(0, 20_000) },
        { role: "user", content: `That didn't match the required JSON schema:\n${lastError}\nReply again with only the corrected JSON.` },
      ];
    }
    throw new LlmError(`Output failed validation: ${lastError}`);
  };

  try {
    return await attempt(opts.model);
  } catch (e) {
    if (env.MODEL_FALLBACK && env.MODEL_FALLBACK !== opts.model) return attempt(env.MODEL_FALLBACK);
    throw e;
  }
}

/**
 * Streams a plain-text answer, yielding text as it arrives. Falls back to MODEL_FALLBACK only if
 * the first model fails before sending anything (a half-sent answer can't be restarted).
 */
export async function* llmStream(opts: { model: string; system: string; user: string; maxTokens?: number; reasoning?: Reasoning }): AsyncGenerator<string> {
  const messages: Message[] = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ];
  const open = async (model: string) => {
    const res = await request(model, messages, opts.maxTokens ?? 4000, opts.reasoning ?? "off", { stream: true });
    if (!res.ok || !res.body) throw new LlmError(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res.body;
  };
  let body: ReadableStream<Uint8Array>;
  try {
    body = await open(opts.model);
  } catch (e) {
    if (!env.MODEL_FALLBACK || env.MODEL_FALLBACK === opts.model) throw e;
    body = await open(env.MODEL_FALLBACK);
  }

  // Server-sent events: `data: {chunk}` lines, `: comment` keep-alives, then `data: [DONE]`.
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += value;
    for (let nl = buf.indexOf("\n"); nl >= 0; nl = buf.indexOf("\n")) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      const chunk = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[]; error?: { message?: string } };
      if (chunk.error) throw new LlmError(`LLM stream error: ${chunk.error.message ?? "unknown"}`);
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) yield text;
    }
  }
}
