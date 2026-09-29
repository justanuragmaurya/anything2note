import { File, UploadType } from "expo-file-system";
import type { ApiError as ApiErrorBody, CreateUploadRequest, CreateUploadResponse } from "@a2n/shared";
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

/**
 * Two-step upload: ask the API for a presigned R2 URL, then PUT the raw bytes there with
 * exactly the headers it returned. Resolves to the `uploadId` for `POST /sources`.
 */
export async function uploadFile(file: LocalFile, onProgress?: (fraction: number) => void): Promise<string> {
  const req: CreateUploadRequest = { filename: file.name, contentType: file.mimeType, size: file.size };
  const { uploadId, url, headers } = await api<CreateUploadResponse>("POST", "/uploads", req);
  let result;
  try {
    result = await new File(file.uri).upload(url, {
      httpMethod: "PUT",
      uploadType: UploadType.BINARY_CONTENT,
      headers,
      onProgress: onProgress ? ({ bytesSent, totalBytes }) => totalBytes > 0 && onProgress(bytesSent / totalBytes) : undefined,
    });
  } catch {
    throw new ApiError(0, "UPLOAD_FAILED", "The upload was interrupted. Check your connection and try again.");
  }
  if (result.status < 200 || result.status >= 300) throw new ApiError(result.status, "UPLOAD_FAILED", `The upload failed (${result.status}). Try again.`);
  return uploadId;
}
