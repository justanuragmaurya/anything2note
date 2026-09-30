import { env } from "cloudflare:workers";

/*
 * YouTube Data API v3 (API key only). It can't return caption text for other people's videos
 * (captions.download needs the owner's OAuth), so it's used for the checks we can do before
 * spending anything: does the video exist, is it live, how long is it. Transcripts come from
 * the processor container.
 */

export type VideoInfo = {
  id: string;
  title: string;
  channel: string;
  durationSec: number;
  /** "none" for normal videos; "live" / "upcoming" can't be processed yet */
  live: "none" | "live" | "upcoming";
  privacy: "public" | "unlisted" | "private";
  embeddable: boolean;
  /** Spoken language when the uploader set it (e.g. "en", "hi") */
  language?: string;
};

type VideosResponse = {
  items?: {
    id: string;
    snippet: { title: string; channelTitle: string; liveBroadcastContent: VideoInfo["live"]; defaultAudioLanguage?: string; defaultLanguage?: string };
    contentDetails: { duration: string };
    status: { privacyStatus: VideoInfo["privacy"]; embeddable: boolean };
  }[];
};

/** ISO 8601 duration ("PT1H2M3S", "P1DT2H") → seconds. */
function seconds(iso: string): number {
  const m = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((v) => Number(v ?? 0));
  return d! * 86400 + h! * 3600 + min! * 60 + s!;
}

/** Null when the video doesn't exist or is private. */
export async function videoInfo(id: string): Promise<VideoInfo | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,contentDetails,status");
  url.searchParams.set("id", id);
  url.searchParams.set("key", env.YOUTUBE_API_KEY);
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`YouTube Data API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const v = ((await res.json()) as VideosResponse).items?.[0];
  if (!v) return null;
  return {
    id: v.id,
    title: v.snippet.title,
    channel: v.snippet.channelTitle,
    durationSec: seconds(v.contentDetails.duration),
    live: v.snippet.liveBroadcastContent,
    privacy: v.status.privacyStatus,
    embeddable: v.status.embeddable,
    language: v.snippet.defaultAudioLanguage ?? v.snippet.defaultLanguage,
  };
}
