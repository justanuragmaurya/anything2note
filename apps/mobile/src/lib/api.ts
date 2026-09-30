import { Directory, File, FileMode, Paths, UploadType, type UploadResult } from "expo-file-system";
import type { ApiError as ApiErrorBody, CompleteUploadRequest, CreateUploadRequest, CreateUploadResponse } from "@a2n/shared";
import { authClient } from "./auth-client";

const baseURL = process.env.EXPO_PUBLIC_API_URL!;

/** A failed API call. `message` is the server's user-facing text and is safe to show. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const errorMessage = (e: unknown): string => (e instanceof Error && e.message ? e.message : "Something went wrong. Try again.");

type Method = "GET" | "POST" | "PATCH" | "DELETE";

/**
 * JSON call to apps/api (`/api/*`). Native fetch has no cookie jar for Better Auth, so the
 * session cookie from SecureStore goes in by hand, with `credentials: "omit"` so nothing clashes.
 */
export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${baseURL}/api${path}`, {
      method,
      credentials: "omit",
      headers: {
        Cookie: await authClient.getCookie(),
        ...(body === undefined ? null : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Can't reach anything2note. Check your connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const err = (json as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, err?.code ?? "HTTP", err?.message ?? `Request failed (${res.status}).`);
  }
  return json as T;
}

export type LocalFile = { uri: string; name: string; mimeType: string; size: number };

/* ───────────── Uploads (add flow) ───────────── */

/**
 * Where an upload has got to. It's saved with the draft, so an interrupted upload resumes rather
 * than starting over: a single PUT goes again to the same URL, and a multipart upload re-sends only
 * the parts with no ETag yet. Both hold until the presigned URLs expire.
 */
export type UploadSession = CreateUploadResponse & {
  /** Multipart: the ETag of each finished part, by part number */
  etags?: Record<number, string>;
  /** Every byte is in storage (and a multipart upload has been completed) */
  done?: boolean;
};

type MultipartSession = Extract<UploadSession, { mode: "multipart" }>;

export type UploadOptions = {
  /** A session saved from an earlier attempt, to resume */
  session?: UploadSession | null;
  /** Called whenever the session moves on (created, a part finished, completed) or is dropped (null) */
  onSession?: (session: UploadSession | null) => void;
  onProgress?: (fraction: number) => void;
};

/** A URL this close to expiring isn't worth starting a transfer on. */
const EXPIRY_MARGIN_MS = 2 * 60_000;
/** Bytes copied per read when cutting a part out of the file. */
const CHUNK_BYTES = 4 * 1024 * 1024;

const ok = (status: number) => status >= 200 && status < 300;
const interrupted = () =>
  new ApiError(0, "UPLOAD_FAILED", "The upload was interrupted. Check your connection and try again. It picks up where it left off.");

/** Storage answers 403 once a presigned URL has expired; the next try then asks for fresh ones. */
function putFailed(status: number, onSession: UploadOptions["onSession"]) {
  if (status === 403) {
    onSession?.(null);
    return new ApiError(status, "UPLOAD_EXPIRED", "The upload link expired. Try again to start the upload over.");
  }
  return new ApiError(status, "UPLOAD_FAILED", `The upload failed (${status}). Try again.`);
}

const headerOf = (headers: Record<string, string>, name: string) => {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
  return key ? headers[key] : undefined;
};

/**
 * PUTs a file to a presigned URL. On iOS it runs in a background URL session, so the transfer
 * carries on while the app is in the background.
 */
async function put(file: File, url: string, headers: Record<string, string>, onBytes: (sent: number) => void): Promise<UploadResult> {
  try {
    return await file.upload(url, {
      httpMethod: "PUT",
      uploadType: UploadType.BINARY_CONTENT,
      headers,
      sessionType: "background",
      onProgress: ({ bytesSent }) => onBytes(bytesSent),
    });
  } catch {
    throw interrupted();
  }
}

/** Copies `length` bytes from `start` into `dest`, a few MB at a time so the UI keeps moving. */
async function cutPart(source: File, dest: File, start: number, length: number) {
  dest.create({ overwrite: true });
  const src = source.open(FileMode.ReadOnly);
  const out = dest.open(FileMode.WriteOnly);
  try {
    src.offset = start;
    let left = length;
    while (left > 0) {
      const bytes = src.readBytes(Math.min(CHUNK_BYTES, left));
      if (!bytes.length) break;
      out.writeBytes(bytes);
      left -= bytes.length;
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    src.close();
    out.close();
  }
}

/** Sends every part without an ETag, one at a time, then completes the upload. */
async function uploadParts(source: File, size: number, session: MultipartSession, onSession: UploadOptions["onSession"], report: (sent: number) => void) {
  const etags: Record<number, string> = { ...session.etags };
  const partSize = (n: number) => Math.max(0, Math.min(session.partBytes, size - (n - 1) * session.partBytes));
  let sent = session.parts.reduce((sum, p) => sum + (etags[p.number] ? partSize(p.number) : 0), 0);
  report(sent);

  const dir = new Directory(Paths.cache, "upload-parts");
  dir.create({ intermediates: true, idempotent: true });
  for (const part of session.parts) {
    if (etags[part.number]) continue;
    const slice = new File(dir, `${session.uploadId}-${part.number}`);
    try {
      await cutPart(source, slice, (part.number - 1) * session.partBytes, partSize(part.number));
      const res = await put(slice, part.url, {}, (bytes) => report(sent + bytes));
      if (!ok(res.status)) throw putFailed(res.status, onSession);
      const etag = headerOf(res.headers, "etag");
      if (!etag) throw new ApiError(0, "UPLOAD_FAILED", "Storage didn't confirm part of the upload. Try again.");
      etags[part.number] = etag;
      sent += partSize(part.number);
      onSession?.({ ...session, etags });
    } finally {
      if (slice.exists) slice.delete();
    }
  }
  const body: CompleteUploadRequest = { parts: session.parts.map((p) => ({ number: p.number, etag: etags[p.number]! })) };
  await api<unknown>("POST", `/uploads/${session.uploadId}/complete`, body);
  return etags;
}

/**
 * Uploads a file for `POST /sources` and resolves to its `uploadId`. The API picks the mode
 * (`CreateUploadResponse`): one presigned PUT, or parts of `partBytes` each for big files.
 * Pass the last saved `session` to resume an interrupted upload.
 */
export async function uploadFile(file: LocalFile, { session, onSession, onProgress }: UploadOptions = {}): Promise<string> {
  if (session?.done) return session.uploadId;
  let s = session && session.expiresAt - EXPIRY_MARGIN_MS > Date.now() ? session : null;
  if (!s) {
    const req: CreateUploadRequest = { filename: file.name, contentType: file.mimeType, size: file.size };
    s = { ...(await api<CreateUploadResponse>("POST", "/uploads", req)), etags: {} };
    onSession?.(s);
  }
  const report = (sent: number) => {
    if (file.size > 0) onProgress?.(Math.min(1, sent / file.size));
  };
  const source = new File(file.uri);
  if (s.mode === "single") {
    const res = await put(source, s.url, s.headers, report);
    if (!ok(res.status)) throw putFailed(res.status, onSession);
    onSession?.({ ...s, done: true });
  } else {
    const etags = await uploadParts(source, file.size, s, onSession, report);
    onSession?.({ ...s, etags, done: true });
  }
  onProgress?.(1);
  return s.uploadId;
}

/* ───────────── Raw requests: exports and streamed chat (item screen) ───────────── */

/** Absolute URL of an `/api` route, for requests `api()` can't make (file downloads, streams). */
export const apiUrl = (path: string) => `${baseURL}/api${path}`;

/** The session cookie header every `/api` request needs. */
export const sessionHeaders = async (): Promise<Record<string, string>> => ({ Cookie: await authClient.getCookie() });

/** The ApiError for a failed response, from its `ApiError` JSON body when it has one. */
export function responseError(status: number, body: string): ApiError {
  let err: ApiErrorBody["error"] | undefined;
  try {
    err = (JSON.parse(body) as ApiErrorBody | null)?.error;
  } catch {
    // Not JSON (a proxy page, an empty body): fall back to the status.
  }
  return new ApiError(status, err?.code ?? "HTTP", err?.message ?? `Request failed (${status}).`);
}
