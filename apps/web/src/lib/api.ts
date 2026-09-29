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

/**
 * PUT the file to the presigned R2 URL with exactly the headers the API signed. XHR rather than
 * fetch so we get real upload progress.
 */
export function putUpload(target: CreateUploadResponse, file: Blob, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", target.url);
    for (const [k, v] of Object.entries(target.headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new ApiError(xhr.status, "UPLOAD_FAILED", "The upload didn’t go through. Try again."));
    xhr.onerror = () => reject(new ApiError(0, "UPLOAD_FAILED", "The upload didn’t go through. Check your connection and try again."));
    xhr.onabort = () => reject(new ApiError(0, "UPLOAD_ABORTED", "Upload cancelled."));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
}
