import { env } from "cloudflare:workers";
import { Container, getContainer } from "@cloudflare/containers";
import { userError } from "./extract";

/*
 * The processor service (apps/processor: yt-dlp + ffmpeg) as a Cloudflare Container. Each
 * YouTube video and each uploaded recording/video gets its own instance name, so a job and the
 * later requests for its chunks reach the same container. It sleeps once idle; nothing needs it to stay up.
 */
export class Processor extends Container {
  defaultPort = 8080;
  sleepAfter = "15m";
  envVars = {
    // Optional; set as secrets if YouTube starts blocking Cloudflare's IPs.
    YTDLP_PROXY: env.YTDLP_PROXY ?? "",
    YTDLP_COOKIES: env.YTDLP_COOKIES ?? "",
  };
}

export type CaptionsResult =
  | { found: false }
  | { found: true; method: "manual_captions" | "auto_captions"; language: string; segments: { start: number; text: string }[] };
export type AudioJob = {
  status: "running" | "done" | "failed";
  error?: { code: string; message: string };
  chunks?: { index: number; offsetSec: number; durationSec: number; bytes: number }[];
};

/** Container instance names: one per YouTube video, one per uploaded source. */
export const youtubeInstance = (videoId: string) => `yt-${videoId}`;
export const uploadInstance = (sourceId: string) => `upload-${sourceId}`;

const stub = (instance: string) => getContainer(env.PROCESSOR, instance);

async function call(instance: string, path: string, init?: RequestInit): Promise<Response> {
  const res = await stub(instance).fetch(new Request(`http://processor${path}`, init));
  if (res.ok) return res;
  const body = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
  // 422s are written for users (private, age-restricted, blocked, no audio track…); anything else is ours.
  if (res.status === 422 && body?.error) {
    if (body.error.code === "BLOCKED") console.error("[processor] YouTube blocked", instance);
    throw userError(body.error.message);
  }
  throw new Error(`Processor ${path} ${res.status}: ${body?.error?.message ?? ""}`);
}

const post = (instance: string, path: string, body: object) =>
  call(instance, path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const processor = {
  captions: async (videoId: string, lang?: string) => (await post(youtubeInstance(videoId), "/youtube/captions", { videoId, lang })).json<CaptionsResult>(),
  startAudio: async (videoId: string) => (await post(youtubeInstance(videoId), "/youtube/audio", { videoId })).json<{ jobId: string }>(),
  /** Audio from an uploaded file, read by the container from a presigned R2 GET link (it never holds R2 keys). */
  startMedia: async (instance: string, url: string) => (await post(instance, "/media", { url })).json<{ jobId: string }>(),
  /** Null when the job is gone (the container restarted), so the caller can start it again. */
  job: async (instance: string, jobId: string): Promise<AudioJob | null> => {
    const res = await stub(instance).fetch(new Request(`http://processor/jobs/${jobId}`));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Processor job ${res.status}`);
    return res.json<AudioJob>();
  },
  chunk: async (instance: string, jobId: string, index: number) => (await call(instance, `/jobs/${jobId}/chunks/${index}`)).arrayBuffer(),
  dropJob: (instance: string, jobId: string) => call(instance, `/jobs/${jobId}`, { method: "DELETE" }).catch(() => undefined),
};
