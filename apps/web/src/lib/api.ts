/**
 * Typed client for apps/api (contract in @a2n/shared). Every call sends the Better Auth session
 * cookie for the API origin; errors come back as `{ error: { code, message } }` and are thrown
 * as `ApiError` so screens can show `message` as is.
 */

import type {
  ApiError as ApiErrorBody,
  BillingResponse,
  ChatResponse,
  CheckoutResponse,
  CreateSourceRequest,
  CreateSourceResponse,
  CreateUploadRequest,
  CreateUploadResponse,
  DueCardsResponse,
  Folder,
  ItemDetail,
  LibraryItem,
  LibraryResponse,
  MeResponse,
  PlanKey,
  PortalResponse,
  QuizAttemptRequest,
  QuizAttemptResponse,
  Rating,
  ReviewResponse,
  StatsResponse,
  TasksResponse,
  UpdateSourceRequest,
} from "@a2n/shared";
import type { CompleteUploadRequest, CreditHistoryResponse, SettingsResponse, UserSettings } from "@a2n/shared";
// Workspace block (output actions, sharing, exports, streaming chat, task edits) — see the end of the file.
import type { ChatMessage, ChatStreamEvent, EditOutputResponse, ExportFormat, ItemResponse, OutputData, OutputKey, ShareResponse, UpdateTaskRequest } from "@a2n/shared";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Can’t reach the server. Check your connection and try again.");
  }
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  if (!res.ok) {
    const err = (json as ApiErrorBody | undefined)?.error;
    throw new ApiError(res.status, err?.code ?? "HTTP_ERROR", err?.message ?? `Something went wrong (${res.status}). Try again.`);
  }
  return json as T;
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Try again.");

export const api = {
  me: () => request<MeResponse>("GET", "/api/me"),
  stats: () => request<StatsResponse>("GET", "/api/stats"),

  library: () => request<LibraryResponse>("GET", "/api/library"),
  createFolder: (name: string) => request<{ folder: Folder }>("POST", "/api/folders", { name }),
  deleteFolder: (id: string) => request<void>("DELETE", `/api/folders/${id}`),

  createUpload: (body: CreateUploadRequest) => request<CreateUploadResponse>("POST", "/api/uploads", body),
  createSource: (body: CreateSourceRequest) => request<CreateSourceResponse>("POST", "/api/sources", body),
  source: (id: string) => request<ItemDetail>("GET", `/api/sources/${id}`),
  updateSource: (id: string, body: UpdateSourceRequest) => request<{ item: LibraryItem }>("PATCH", `/api/sources/${id}`, body),
  deleteSource: (id: string) => request<void>("DELETE", `/api/sources/${id}`),
  retrySource: (id: string) => request<{ item: LibraryItem }>("POST", `/api/sources/${id}/retry`),
  chat: (id: string, message: string) => request<ChatResponse>("POST", `/api/sources/${id}/chat`, { message }),

  tasks: () => request<TasksResponse>("GET", "/api/tasks"),
  updateTask: (id: string, done: boolean) => request<{ ok: true }>("PATCH", `/api/tasks/${id}`, { done }),

  dueCards: () => request<DueCardsResponse>("GET", "/api/reviews/due"),
  review: (cardId: string, rating: Rating) => request<ReviewResponse>("POST", "/api/reviews", { cardId, rating }),
  quizAttempt: (body: QuizAttemptRequest) => request<QuizAttemptResponse>("POST", "/api/quiz-attempts", body),

  checkout: (plan: PlanKey) => request<CheckoutResponse>("POST", "/api/billing/checkout", { plan }),
  syncBilling: (subscriptionId?: string) => request<BillingResponse>("POST", "/api/billing/sync", { subscriptionId }),
  changePlan: (plan: PlanKey) => request<BillingResponse>("POST", "/api/billing/change-plan", { plan }),
  billingPortal: () => request<PortalResponse>("POST", "/api/billing/portal"),
};

/* ═════════════ Uploads, settings & credit history (add flow / settings / billing) ═════════════ */

export const accountApi = {
  settings: () => request<SettingsResponse>("GET", "/api/settings"),
  updateSettings: (patch: Partial<UserSettings>) => request<SettingsResponse>("PATCH", "/api/settings", patch),
  /** Newest first, 50 a page; pass the previous page's `next` as `before`. */
  creditHistory: (before?: number | null) => request<CreditHistoryResponse>("GET", `/api/billing/credits${before ? `?before=${before}` : ""}`),
  completeUpload: (uploadId: string, body: CompleteUploadRequest) => request<{ ok: true }>("POST", `/api/uploads/${uploadId}/complete`, body),
};

const PART_CONCURRENCY = 4;
const PUT_ATTEMPTS = 3;

const uploadAborted = () => new ApiError(0, "UPLOAD_ABORTED", "Upload cancelled.");
const isAborted = (e: unknown) => e instanceof ApiError && e.code === "UPLOAD_ABORTED";

/** PUT a blob to a presigned URL with XHR (fetch has no upload progress). Resolves with the ETag header, if any. */
function xhrPut(url: string, body: Blob, headers: Record<string, string> | undefined, onLoaded: (bytes: number) => void, signal: AbortSignal): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(uploadAborted());
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers ?? {})) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => onLoaded(e.loaded);
    const onAbort = () => xhr.abort();
    signal.addEventListener("abort", onAbort, { once: true });
    const done = () => signal.removeEventListener("abort", onAbort);
    xhr.onload = () => {
      done();
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.getResponseHeader("ETag"));
      else reject(new ApiError(xhr.status, "UPLOAD_FAILED", "The upload didn’t go through. Try again."));
    };
    xhr.onerror = () => {
      done();
      reject(new ApiError(0, "UPLOAD_FAILED", "The upload didn’t go through. Check your connection and try again."));
    };
    xhr.onabort = () => {
      done();
      reject(uploadAborted());
    };
    xhr.send(body);
  });
}

/** Network blips and 5xx get a couple more tries with a short backoff; 4xx and cancels don't. */
async function withRetries<T>(fn: () => Promise<T>, signal: AbortSignal): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const retryable = e instanceof ApiError && !isAborted(e) && (e.status === 0 || e.status >= 500);
      if (!retryable || attempt >= PUT_ATTEMPTS || signal.aborted) throw e;
      await new Promise((r) => setTimeout(r, 800 * 2 ** (attempt - 1)));
    }
  }
}

/**
 * One file going up to R2 (see CreateUploadResponse). Small files are one PUT; big ones go in
 * `partBytes` slices, a few at a time, then `POST /api/uploads/:id/complete` with every ETag.
 * `run()` again after a failure only re-sends the parts that didn't make it (or starts over once
 * the signed URLs have expired). `cancel()` stops it for good.
 */
export class FileUpload {
  private target: CreateUploadResponse | null = null;
  private readonly etags = new Map<number, string>();
  private readonly loaded = new Map<number, number>();
  private readonly ac = new AbortController();

  constructor(
    readonly file: File,
    readonly contentType: string,
    private readonly onProgress: (pct: number) => void,
  ) {}

  get cancelled() {
    return this.ac.signal.aborted;
  }

  cancel() {
    this.ac.abort();
  }

  private setLoaded(part: number, bytes: number) {
    this.loaded.set(part, bytes);
    this.report();
  }

  private report() {
    let sum = 0;
    for (const n of this.loaded.values()) sum += n;
    this.onProgress(this.file.size ? Math.min(100, (sum / this.file.size) * 100) : 100);
  }

  /** Resolves with the `uploadId` to put in `POST /api/sources`. */
  async run(): Promise<string> {
    const signal = this.ac.signal;
    if (signal.aborted) throw uploadAborted();
    if (!this.target || this.target.expiresAt < Date.now() + 60_000) {
      this.etags.clear();
      this.loaded.clear();
      this.report();
      this.target = await api.createUpload({ filename: this.file.name, contentType: this.contentType, size: this.file.size });
      if (signal.aborted) throw uploadAborted();
    }
    const t = this.target;

    if (t.mode === "single") {
      await withRetries(() => {
        this.loaded.set(1, 0);
        return xhrPut(t.url, this.file, t.headers, (n) => this.setLoaded(1, n), signal);
      }, signal);
      this.loaded.set(1, this.file.size);
      this.report();
      return t.uploadId;
    }

    const todo = t.parts.filter((p) => !this.etags.has(p.number));
    let next = 0;
    let failure: unknown = null;
    const worker = async () => {
      while (next < todo.length && failure === null && !signal.aborted) {
        const part = todo[next++]!;
        const start = (part.number - 1) * t.partBytes;
        const blob = this.file.slice(start, Math.min(this.file.size, start + t.partBytes));
        try {
          const etag = await withRetries(() => {
            this.loaded.set(part.number, 0);
            return xhrPut(part.url, blob, undefined, (n) => this.setLoaded(part.number, n), signal);
          }, signal);
          if (!etag) throw new ApiError(0, "UPLOAD_NO_ETAG", "The upload server didn’t confirm a part of this file. Try again.");
          this.etags.set(part.number, etag);
          this.loaded.set(part.number, blob.size);
        } catch (e) {
          this.loaded.set(part.number, 0);
          failure ??= e;
        }
        this.report();
      }
    };
    // Let parts already on the wire finish, so a retry has less to re-send.
    await Promise.all(Array.from({ length: Math.min(PART_CONCURRENCY, todo.length) }, worker));
    if (signal.aborted) throw uploadAborted();
    if (failure !== null) throw failure;

    const parts = [...this.etags].sort(([a], [b]) => a - b).map(([number, etag]) => ({ number, etag }));
    await withRetries(() => accountApi.completeUpload(t.uploadId, { parts }), signal);
    return t.uploadId;
  }
}

/* ═════════════ Workspace: output actions, sharing, exports, streaming chat, task edits ═════════════ */

const bodyError = async (res: Response): Promise<ApiError> => {
  let err: ApiErrorBody["error"] | undefined;
  try {
    err = ((await res.json()) as ApiErrorBody | undefined)?.error;
  } catch {
    err = undefined;
  }
  return new ApiError(res.status, err?.code ?? "HTTP_ERROR", err?.message ?? `Something went wrong (${res.status}). Try again.`);
};

/** `filename*=UTF-8''…` or `filename="…"` from a Content-Disposition header (needs the API to expose it over CORS). */
function dispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*\s*=\s*(?:UTF-8|utf-8)?''([^;]+)/.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      /* fall through to the plain form */
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim() || null;
}

export const workspaceApi = {
  /* Output actions — each answers `{ item }` and processing resumes; poll the item. */
  addOutputs: (id: string, outputs: OutputKey[]) => request<ItemResponse>("POST", `/api/sources/${id}/outputs`, { outputs }),
  regenerateOutput: (id: string, output: OutputKey, instructions?: string) =>
    request<ItemResponse>("POST", `/api/sources/${id}/outputs/${output}/regenerate`, instructions ? { instructions } : {}),
  editOutput: (id: string, output: OutputKey, data: OutputData) => request<EditOutputResponse>("PATCH", `/api/sources/${id}/outputs/${output}`, { data }),
  resetOutput: (id: string, output: OutputKey) => request<ItemResponse>("DELETE", `/api/sources/${id}/outputs/${output}/custom`),

  /* Sharing */
  share: (id: string) => request<ShareResponse>("POST", `/api/sources/${id}/share`),
  unshare: (id: string) => request<void>("DELETE", `/api/sources/${id}/share`),

  /* Tasks: any subset of text, kind and due date (ticking stays on `api.updateTask`). */
  editTask: (id: string, patch: Omit<UpdateTaskRequest, "done">) => request<{ ok: true }>("PATCH", `/api/tasks/${id}`, patch),

  /** Word file or print-ready HTML for some (or all ready) outputs. `filename` is the server's, when it's readable. */
  async exportFile(id: string, format: ExportFormat, outputs?: OutputKey[]): Promise<{ blob: Blob; filename: string | null }> {
    const q = new URLSearchParams({ format });
    if (outputs?.length) q.set("outputs", outputs.join(","));
    let res: Response;
    try {
      res = await fetch(`${BASE}/api/sources/${id}/export?${q}`, { credentials: "include" });
    } catch {
      throw new ApiError(0, "NETWORK", "Can’t reach the server. Check your connection and try again.");
    }
    if (!res.ok) throw await bodyError(res);
    return { blob: await res.blob(), filename: dispositionFilename(res.headers.get("Content-Disposition")) };
  },

  /**
   * Chat with the answer streamed as server-sent events: `onDelta` gets each piece of text in
   * order and the promise resolves with the saved reply. A server that answers with plain JSON
   * instead still works. Aborting rejects with code `ABORTED`.
   */
  async chatStream(id: string, message: string, { onDelta, signal }: { onDelta: (text: string) => void; signal?: AbortSignal }): Promise<ChatMessage> {
    const aborted = () => new ApiError(0, "ABORTED", "Stopped.");
    let res: Response;
    try {
      res = await fetch(`${BASE}/api/sources/${id}/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ message }),
        signal,
      });
    } catch {
      if (signal?.aborted) throw aborted();
      throw new ApiError(0, "NETWORK", "Can’t reach the server. Check your connection and try again.");
    }
    if (!res.ok) throw await bodyError(res);
    if (!res.headers.get("Content-Type")?.includes("text/event-stream") || !res.body) {
      const json = (await res.json()) as ChatResponse;
      return json.message;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    // One event per blank-line-separated block; its `data:` lines joined by newlines are one JSON object.
    const handle = (block: string): ChatMessage | null => {
      const data = block
        .split(/\r?\n/)
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).replace(/^ /, ""))
        .join("\n");
      if (!data || data === "[DONE]") return null;
      let ev: ChatStreamEvent;
      try {
        ev = JSON.parse(data) as ChatStreamEvent;
      } catch {
        return null;
      }
      if (ev.type === "delta") onDelta(ev.text);
      else if (ev.type === "error") throw new ApiError(200, ev.error.code, ev.error.message);
      else if (ev.type === "done") return ev.message;
      return null;
    };
    try {
      for (;;) {
        const { value, done } = await reader.read();
        buf += decoder.decode(value, { stream: !done });
        const blocks = buf.split(/\r?\n\r?\n/);
        buf = done ? "" : (blocks.pop() ?? "");
        for (const b of blocks) {
          const final = handle(b);
          if (final) return final;
        }
        if (done) break;
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (signal?.aborted) throw aborted();
      throw new ApiError(0, "NETWORK", "The connection dropped before the answer finished. Try again.");
    } finally {
      reader.cancel().catch(() => {});
    }
    throw new ApiError(0, "INCOMPLETE", "The answer was cut off. Try again.");
  },
};
