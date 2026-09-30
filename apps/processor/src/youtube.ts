import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { run, splitAudio, UserFacingError, type Chunk } from "./media.ts";

/*
 * yt-dlp and ffmpeg wrappers. Captions come from the video's own tracks (manual first, then
 * YouTube's auto-generated track in the original language); audio is downloaded only when a
 * video has neither, then split into chunks small enough for Whisper.
 */

export type Segment = { start: number; text: string };
export type CaptionsResult =
  | { found: false }
  | { found: true; method: "manual_captions" | "auto_captions"; language: string; segments: Segment[] };

const COOKIES_FILE = "/tmp/yt-cookies.txt";
let cookiesReady: Promise<boolean> | null = null;

/** YTDLP_COOKIES is a base64 Netscape cookies.txt, for when YouTube asks us to sign in. */
function cookies(): Promise<boolean> {
  cookiesReady ??= (async () => {
    const b64 = process.env.YTDLP_COOKIES?.trim();
    if (!b64) return false;
    await writeFile(COOKIES_FILE, Buffer.from(b64, "base64"));
    return true;
  })();
  return cookiesReady;
}

async function commonArgs(): Promise<string[]> {
  const args = ["--no-playlist", "--no-warnings", "--no-progress", "--js-runtimes", "node"];
  if (process.env.YTDLP_PROXY) args.push("--proxy", process.env.YTDLP_PROXY);
  if (await cookies()) args.push("--cookies", COOKIES_FILE);
  return args;
}

const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** Turns yt-dlp's stderr into something a user can act on. */
function ytError(stderr: string): Error {
  const s = stderr.toLowerCase();
  if (s.includes("sign in to confirm you") && s.includes("bot"))
    return new UserFacingError("BLOCKED", "YouTube is blocking us from reading this video right now. Try again in a while.");
  if (s.includes("confirm your age") || s.includes("age-restricted")) return new UserFacingError("AGE_RESTRICTED", "Age-restricted videos aren't supported.");
  if (s.includes("members-only") || s.includes("join this channel")) return new UserFacingError("MEMBERS_ONLY", "Members-only videos aren't supported.");
  if (s.includes("private video")) return new UserFacingError("PRIVATE", "This video is private.");
  if (s.includes("video unavailable") || s.includes("not available")) return new UserFacingError("UNAVAILABLE", "This video isn't available.");
  if (s.includes("live event") || s.includes("is live")) return new UserFacingError("LIVE", "Live streams aren't supported. Try again once it has finished.");
  return new Error(`yt-dlp failed: ${stderr.trim().split("\n").slice(-3).join(" | ").slice(0, 500)}`);
}

async function ytdlp(args: string[], timeoutMs: number) {
  const res = await run("yt-dlp", [...(await commonArgs()), ...args], timeoutMs);
  if (res.code !== 0) throw ytError(res.stderr);
  return res.stdout;
}

/** Keeps yt-dlp current between image builds; YouTube changes often break old versions. */
export function selfUpdate() {
  run("yt-dlp", ["-U"], 120_000)
    .then((r) => console.log("[yt-dlp]", (r.stdout || r.stderr).trim().split("\n").pop()))
    .catch((e) => console.warn("[yt-dlp] update failed", e));
}

/* ───────────── Captions ───────────── */

type Track = { ext: string; url: string; name?: string };
type Info = {
  language?: string | null;
  subtitles?: Record<string, Track[]>;
  automatic_captions?: Record<string, Track[]>;
  http_headers?: Record<string, string>;
};

const base = (lang: string) => lang.toLowerCase().split(/[-_]/)[0]!;

/** Picks the transcript track: a manual track in the spoken language, else the auto-generated original. */
function pickTrack(info: Info, hint?: string): { lang: string; track: Track; method: "manual_captions" | "auto_captions" } | null {
  const spoken = info.language || hint || null;
  const json3 = (tracks: Track[] | undefined) => tracks?.find((t) => t.ext === "json3");

  const manual = Object.entries(info.subtitles ?? {}).filter(([lang, tracks]) => lang !== "live_chat" && json3(tracks));
  const manualPick =
    (spoken && (manual.find(([l]) => l.toLowerCase() === spoken.toLowerCase()) ?? manual.find(([l]) => base(l) === base(spoken)))) ||
    (manual.length === 1 ? manual[0] : undefined);
  if (manualPick) return { lang: manualPick[0], track: json3(manualPick[1])!, method: "manual_captions" };

  // Auto captions list every machine translation too; only the original track is a transcript.
  const auto = Object.entries(info.automatic_captions ?? {}).filter(([, tracks]) => json3(tracks));
  const autoPick = auto.find(([l]) => l.endsWith("-orig")) ?? (spoken ? auto.find(([l]) => l.toLowerCase() === spoken.toLowerCase()) : undefined);
  if (autoPick) return { lang: autoPick[0].replace(/-orig$/, ""), track: json3(autoPick[1])!, method: "auto_captions" };
  return null;
}

type Json3 = { events?: { tStartMs?: number; dDurationMs?: number; segs?: { utf8?: string }[] }[] };

/** Caption lines are a few words each; merge them into sentence-sized segments with a start time. */
function toSegments(data: Json3): Segment[] {
  const lines = (data.events ?? [])
    .filter((e) => e.segs?.length)
    .map((e) => ({ start: (e.tStartMs ?? 0) / 1000, text: e.segs!.map((s) => s.utf8 ?? "").join("").replace(/\s+/g, " ").trim() }))
    .filter((l) => l.text);
  const out: Segment[] = [];
  let cur: Segment | null = null;
  for (const line of lines) {
    if (!cur) cur = { start: line.start, text: line.text };
    else cur.text += ` ${line.text}`;
    const span = line.start - cur.start;
    if ((/[.?!]["')\]]?$/.test(cur.text) && span >= 4) || span >= 20 || cur.text.length > 400) {
      out.push(cur);
      cur = null;
    }
  }
  if (cur) out.push(cur);
  return out.map((s) => ({ start: Math.floor(s.start), text: s.text }));
}

export async function captions(videoId: string, langHint?: string): Promise<CaptionsResult> {
  const info = JSON.parse(await ytdlp(["-J", "--skip-download", watchUrl(videoId)], 90_000)) as Info;
  const pick = pickTrack(info, langHint);
  if (!pick) return { found: false };
  const url = new URL(pick.track.url);
  url.searchParams.set("fmt", "json3");
  const res = await fetch(url, { headers: info.http_headers, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Caption download ${res.status}`);
  const segments = toSegments((await res.json()) as Json3);
  if (!segments.length) return { found: false };
  return { found: true, method: pick.method, language: base(pick.lang), segments };
}

/* ───────────── Audio ───────────── */

/** Downloads the audio track into `dir` and splits it into Whisper-sized chunks. */
export async function audioChunks(videoId: string, dir: string): Promise<Chunk[]> {
  await mkdir(dir, { recursive: true });
  // Prefer the smallest opus stream: it can be split without re-encoding.
  await ytdlp(["-f", "wa[acodec^=opus]/ba[acodec^=opus]/wa/ba/b", "-o", join(dir, "source.%(ext)s"), watchUrl(videoId)], 60 * 60_000);
  const source = (await readdir(dir)).find((f) => f.startsWith("source."));
  if (!source) throw new Error("yt-dlp produced no audio file");
  const input = join(dir, source);

  try {
    return await splitAudio(input, dir);
  } finally {
    await rm(input, { force: true });
  }
}
