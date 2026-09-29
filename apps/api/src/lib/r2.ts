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
