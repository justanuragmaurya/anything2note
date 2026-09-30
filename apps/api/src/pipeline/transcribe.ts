import { env, type WorkflowStep } from "cloudflare:workers";
import type { ContentSegment } from "@a2n/shared";
import { presignGet } from "../lib/r2";
import { contentKey, type ExtractedContent } from "./content";
import { userError, whisper } from "./extract";
import { processor, uploadInstance } from "./processor";

/*
 * Long audio through the processor container, as workflow steps: start a job that produces
 * Whisper-sized opus chunks, poll it, then copy each chunk to R2 and transcribe it in its own
 * step, so a retry never repeats work. Used for YouTube videos without captions and for uploaded
 * recordings/videos too big (or in a format) Whisper can't take in one request. The result is
 * written to content/{sourceId}.json like every other source.
 */

const STEP = { retries: { limit: 2, delay: "10 seconds", backoff: "exponential" }, timeout: "10 minutes" } as const;
const POLL_EVERY = "15 seconds";
/** 240 polls × 15 s: an hour to fetch and split a very long video. */
const MAX_POLLS = 240;

export type ChunkedAudio = {
  /** Step-name prefix; "youtube" keeps the names earlier runs used */
  steps: string;
  sourceId: string;
  /** Processor container instance that runs the job and serves its chunks */
  instance: string;
  /** Starts (or, after a container restart, restarts) the processor job */
  start: () => Promise<{ jobId: string }>;
  /** Length when known up front (YouTube); otherwise the chunks' total */
  durationSec?: number;
  /** Runs once the length is known, before anything is spent on transcription */
  checkDuration?: (durationSec: number) => Promise<void>;
  noSpeech: string;
  /** Keeps this run's claim on the source alive */
  heartbeat: () => Promise<void>;
  /** 0–1 through transcription, for the progress bar */
  onTranscribing: (fraction: number) => Promise<void>;
};

const put = (key: string, body: string | ArrayBuffer, contentType: string) => env.BUCKET.put(key, body, { httpMetadata: { contentType } });

export async function transcribeChunks(step: WorkflowStep, job: ChunkedAudio): Promise<void> {
  const { sourceId, instance, steps: p } = job;
  await job.onTranscribing(0);
  let { jobId } = await step.do(`${p}:audio`, STEP, job.start);
  let chunks: { index: number; offsetSec: number; durationSec: number }[] | undefined;
  for (let i = 0, restarts = 0; !chunks; i++) {
    const state = await step.do(`${p}:audio-poll:${i}`, STEP, async () => {
      await job.heartbeat();
      return (await processor.job(instance, jobId)) ?? { status: "lost" as const };
    });
    if (state.status === "done") chunks = state.chunks ?? [];
    else if (state.status === "failed") {
      if (state.error?.code === "INTERNAL" || !state.error) throw new Error(`Audio job failed: ${state.error?.message}`);
      throw userError(state.error.message);
    } else if (state.status === "lost") {
      // The container restarted mid-job; start once more before giving up.
      if (++restarts > 1) throw new Error("Processor lost the audio job twice");
      ({ jobId } = await step.do(`${p}:audio-restart:${restarts}`, STEP, job.start));
    } else if (i >= MAX_POLLS) throw new Error("Audio job timed out");
    else await step.sleep(`${p}:audio-wait:${i}`, POLL_EVERY);
  }

  const durationSec = job.durationSec || Math.round(chunks.reduce((n, c) => n + c.durationSec, 0));
  if (job.checkDuration) await step.do(`${p}:check`, STEP, () => job.checkDuration!(durationSec));

  let language: string | undefined;
  for (const chunk of chunks) {
    const r = await step.do(`${p}:stt:${chunk.index}`, STEP, async () => {
      await job.heartbeat();
      const key = `audio/${sourceId}/${chunk.index}`;
      let audio = await (await env.BUCKET.get(`${key}.ogg`))?.arrayBuffer();
      if (!audio) {
        audio = await processor.chunk(instance, jobId, chunk.index);
        await put(`${key}.ogg`, audio, "audio/ogg");
      }
      const w = await whisper(audio, `chunk${chunk.index}.ogg`, "audio/ogg", chunk.offsetSec);
      await put(`${key}.json`, JSON.stringify(w.lines), "application/json");
      return { language: w.language ?? null };
    });
    language ??= r.language ?? undefined;
    await job.onTranscribing((chunk.index + 1) / chunks.length);
  }

  await step.do(`${p}:merge`, STEP, async () => {
    const segments: ContentSegment[] = [];
    for (const chunk of chunks) {
      const lines = await (await env.BUCKET.get(`audio/${sourceId}/${chunk.index}.json`))!.json<{ at: number; text: string }[]>();
      for (const l of lines) segments.push({ id: `t${segments.length + 1}`, anchor: { kind: "time", at: l.at }, text: l.text });
    }
    if (!segments.length) throw userError(job.noSpeech);
    const content: ExtractedContent = { kind: "media", segments, durationSec, language, method: "whisper" };
    await put(contentKey(sourceId), JSON.stringify(content), "application/json");
    await env.BUCKET.delete(chunks.flatMap((c) => [`audio/${sourceId}/${c.index}.ogg`, `audio/${sourceId}/${c.index}.json`]));
    await processor.dropJob(instance, jobId);
  });
}

/* ───────────── Uploaded recordings and videos ───────────── */

/** Formats Groq's Whisper accepts as they are. */
const WHISPER_TYPES = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/webm", "audio/ogg", "audio/flac"];
/** Whisper's request limit is 25 MB; leave room for the multipart form around the file. */
const DIRECT_BYTES = 24 * 1024 * 1024;

/**
 * Small audio in a format Whisper reads goes to it in one request (pipeline/extract.ts). Everything
 * else goes through the processor: any video (mostly picture bytes, and QuickTime isn't a Whisper
 * format; ffmpeg keeps just the audio), audio over ~24 MB, and formats Whisper doesn't take (AAC, …).
 */
export const needsProcessor = (kind: string, mime: string | undefined, size: number | undefined) =>
  kind === "video" || !mime || !WHISPER_TYPES.includes(mime) || !size || size > DIRECT_BYTES;

export type UploadedMediaJob = Pick<ChunkedAudio, "sourceId" | "checkDuration" | "heartbeat" | "onTranscribing"> & { r2Key: string };

export function extractUploadedMedia(step: WorkflowStep, job: UploadedMediaJob): Promise<void> {
  const instance = uploadInstance(job.sourceId);
  return transcribeChunks(step, {
    ...job,
    steps: "media",
    instance,
    // The link only has to last while ffmpeg reads the file, which it does once, start to end.
    start: async () => processor.startMedia(instance, await presignGet(job.r2Key, 3 * 3600)),
    noSpeech: "We couldn't hear any speech in that recording.",
  });
}
