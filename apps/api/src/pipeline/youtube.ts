import { env, type WorkflowStep } from "cloudflare:workers";
import { contentKey, type ExtractedContent } from "./content";
import { processor, youtubeInstance } from "./processor";
import { transcribeChunks } from "./transcribe";

/*
 * YouTube extraction (plan §5.2 step 2), as workflow steps against the processor container:
 * the video's captions if it has any, otherwise its audio in 20-minute chunks through Whisper
 * (pipeline/transcribe.ts, shared with uploaded recordings). The result is written to
 * content/{sourceId}.json like every other source.
 */

const STEP = { retries: { limit: 2, delay: "10 seconds", backoff: "exponential" }, timeout: "10 minutes" } as const;

export type YoutubeJob = {
  sourceId: string;
  videoId: string;
  durationSec: number;
  /** Spoken language from the Data API, to pick the right caption track */
  language?: string;
  /** Keeps this run's claim on the source alive */
  heartbeat: () => Promise<void>;
  /** 0–1 through transcription, for the progress bar */
  onTranscribing: (fraction: number) => Promise<void>;
};

const put = (key: string, body: string | ArrayBuffer, contentType: string) => env.BUCKET.put(key, body, { httpMetadata: { contentType } });

export async function extractYoutube(step: WorkflowStep, job: YoutubeJob): Promise<void> {
  const { sourceId, videoId } = job;

  const caps = await step.do("youtube:captions", STEP, async () => {
    await job.heartbeat();
    const r = await processor.captions(videoId, job.language);
    if (!r.found) return { found: false };
    const content: ExtractedContent = {
      kind: "media",
      segments: r.segments.map((s, i) => ({ id: `t${i + 1}`, anchor: { kind: "time", at: s.start }, text: s.text })),
      durationSec: job.durationSec,
      language: r.language,
      method: r.method,
    };
    await put(contentKey(sourceId), JSON.stringify(content), "application/json");
    return { found: true };
  });
  if (caps.found) return;

  /* No captions: download the audio and transcribe it. */
  await transcribeChunks(step, {
    steps: "youtube",
    sourceId,
    instance: youtubeInstance(videoId),
    start: () => processor.startAudio(videoId),
    durationSec: job.durationSec,
    noSpeech: "We couldn't hear any speech in this video.",
    heartbeat: job.heartbeat,
    onTranscribing: job.onTranscribing,
  });
}
