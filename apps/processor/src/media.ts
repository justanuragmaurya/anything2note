import { spawn } from "node:child_process";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

/*
 * ffmpeg helpers shared by YouTube audio and uploaded recordings/videos: normalise any input's
 * first audio track and split it into chunks small enough for Whisper.
 */

export type Chunk = { index: number; offsetSec: number; durationSec: number; bytes: number; file: string };

/** A failure the Worker shows to the user as-is. */
export class UserFacingError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function run(cmd: string, args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? -1 });
    });
  });
}

/** Whisper takes up to 25 MB per request; 20 minutes of speech-quality opus is ~5–8 MB. */
const CHUNK_SECONDS = 20 * 60;

const isUrl = (input: string) => /^https?:\/\//.test(input);
/** Presigned R2 links are read over HTTP with range requests; retry dropped connections instead of failing the job. */
const inputArgs = (input: string) => (isUrl(input) ? ["-reconnect", "1", "-reconnect_on_network_error", "1", "-reconnect_delay_max", "30", "-i", input] : ["-i", input]);

async function probe(input: string, entry: string): Promise<{ value: string; ok: boolean }> {
  const res = await run("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", entry, "-of", "default=nw=1:nk=1", input], 5 * 60_000);
  return { value: res.stdout.trim().split("\n")[0] ?? "", ok: res.code === 0 };
}

/**
 * Splits the first audio track of `input` (a file path or an http(s) URL) into `dir/chunkNNN.ogg`.
 * Opus is copied as-is; anything else becomes 16 kHz mono opus, which is all speech needs.
 */
export async function splitAudio(input: string, dir: string): Promise<Chunk[]> {
  await mkdir(dir, { recursive: true });
  const codec = await probe(input, "stream=codec_name");
  if (!codec.ok) throw new UserFacingError("UNREADABLE", "We couldn't read that file. It may be damaged, or in a format we don't support.");
  if (!codec.value) throw new UserFacingError("NO_AUDIO", "This file has no audio track, so there's nothing to transcribe.");
  const encode = codec.value === "opus" ? ["-c:a", "copy"] : ["-ac", "1", "-ar", "16000", "-c:a", "libopus", "-b:a", "32k"];
  const res = await run(
    "ffmpeg",
    ["-v", "error", "-y", ...inputArgs(input), "-vn", "-map", "0:a:0", ...encode, "-f", "segment", "-segment_time", String(CHUNK_SECONDS), "-reset_timestamps", "1", join(dir, "chunk%03d.ogg")],
    90 * 60_000,
  );
  if (res.code !== 0) throw new Error(`ffmpeg failed: ${res.stderr.slice(-500)}`);

  const files = (await readdir(dir)).filter((f) => /^chunk\d+\.ogg$/.test(f)).sort();
  const chunks: Chunk[] = [];
  let offset = 0;
  for (const [index, name] of files.entries()) {
    const file = join(dir, name);
    const durationSec = Number((await probe(file, "format=duration")).value) || CHUNK_SECONDS;
    chunks.push({ index, offsetSec: Math.round(offset), durationSec, bytes: (await stat(file)).size, file });
    offset += durationSec;
  }
  if (!chunks.length) throw new UserFacingError("NO_AUDIO", "This file has no audio we could use.");
  return chunks;
}

/** An uploaded recording or video, read straight from its presigned R2 link (it's never stored whole here). */
export async function mediaChunks(url: string, dir: string): Promise<Chunk[]> {
  try {
    return await splitAudio(url, dir);
  } catch (e) {
    await rm(dir, { recursive: true, force: true });
    throw e;
  }
}
