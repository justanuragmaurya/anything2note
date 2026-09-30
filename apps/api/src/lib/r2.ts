import { env } from "cloudflare:workers";
import { AwsClient } from "aws4fetch";

/*
 * Presigned URLs so clients upload to / read from R2 directly (plan §5.1). The Worker itself
 * uses the BUCKET binding; the S3 keys are only for signing.
 */

const s3 = new AwsClient({
  accessKeyId: env.R2_ACCESS_KEY_ID,
  secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  service: "s3",
  region: "auto",
});

const objectUrl = (key: string) =>
  `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key.split("/").map(encodeURIComponent).join("/")}`;

export async function presignPut(key: string, contentType: string, expiresSec = 3600): Promise<string> {
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(expiresSec));
  const signed = await s3.sign(new Request(url, { method: "PUT", headers: { "Content-Type": contentType } }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

export async function presignGet(key: string, expiresSec = 3600): Promise<string> {
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(expiresSec));
  const signed = await s3.sign(new Request(url, { method: "GET" }), { aws: { signQuery: true } });
  return signed.url;
}

/* ───────────── Multipart uploads (S3 API, so clients can PUT parts straight to R2) ───────────── */

const xmlValue = (xml: string, tag: string) => xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1];

async function s3Call(url: URL, init: RequestInit & { method: string }): Promise<string> {
  const res = await s3.fetch(url, init);
  const text = await res.text();
  // CompleteMultipartUpload can fail with a 200 and an <Error> body.
  if (!res.ok || text.includes("<Error>")) throw new Error(`R2 ${init.method} ${res.status}: ${xmlValue(text, "Code") ?? ""} ${xmlValue(text, "Message") ?? text.slice(0, 200)}`);
  return text;
}

/** Starts a multipart upload; returns its upload id. */
export async function createMultipart(key: string, contentType: string): Promise<string> {
  const url = new URL(objectUrl(key));
  url.searchParams.set("uploads", "");
  const id = xmlValue(await s3Call(url, { method: "POST", headers: { "Content-Type": contentType } }), "UploadId");
  if (!id) throw new Error("R2 returned no UploadId");
  return id;
}

export async function presignPart(key: string, uploadId: string, partNumber: number, expiresSec: number): Promise<string> {
  const url = new URL(objectUrl(key));
  url.searchParams.set("partNumber", String(partNumber));
  url.searchParams.set("uploadId", uploadId);
  url.searchParams.set("X-Amz-Expires", String(expiresSec));
  const signed = await s3.sign(new Request(url, { method: "PUT" }), { aws: { signQuery: true } });
  return signed.url;
}

const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Joins the uploaded parts into the object. Throws `InvalidPart`-style errors when an ETag doesn't
 * match what R2 received (the caller turns those into a user-facing message).
 */
export async function completeMultipart(key: string, uploadId: string, parts: { number: number; etag: string }[]): Promise<void> {
  const url = new URL(objectUrl(key));
  url.searchParams.set("uploadId", uploadId);
  const body = `<CompleteMultipartUpload>${parts
    .map((p) => `<Part><PartNumber>${p.number}</PartNumber><ETag>${xmlEscape(p.etag.startsWith('"') ? p.etag : `"${p.etag}"`)}</ETag></Part>`)
    .join("")}</CompleteMultipartUpload>`;
  await s3Call(url, { method: "POST", headers: { "Content-Type": "application/xml" }, body });
}

/** Drops an unfinished multipart upload and its parts (best effort). */
export async function abortMultipart(key: string, uploadId: string): Promise<void> {
  const url = new URL(objectUrl(key));
  url.searchParams.set("uploadId", uploadId);
  await s3.fetch(url, { method: "DELETE" }).catch(() => undefined);
}
