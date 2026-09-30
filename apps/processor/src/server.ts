import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { rm } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import { mediaChunks, UserFacingError, type Chunk } from "./media.ts";
import { audioChunks, captions, selfUpdate } from "./youtube.ts";

/*
 * Only reachable through the Processor Durable Object in apps/api, never from the internet.
 *
 *   GET    /health
 *   POST   /youtube/captions   { videoId, lang? }  → CaptionsResult
 *   POST   /youtube/audio      { videoId }         → { jobId }   (download runs in the background)
 *   POST   /media              { url }             → { jobId }   (an uploaded file's presigned R2 link; same jobs)
 *   GET    /jobs/:id                               → { status, error?, chunks? }
 *   GET    /jobs/:id/chunks/:n                     → audio/ogg bytes
 *   DELETE /jobs/:id
 *
 * Errors are { error: { code, message } }; 422 means the message is safe to show to users.
 */

type Job = { status: "running" | "done" | "failed"; dir: string; chunks?: Chunk[]; error?: { code: string; message: string }; at: number };
const jobs = new Map<string, Job>();
const JOB_TTL_MS = 2 * 3600_000;

const VIDEO_ID = /^[\w-]{11}$/;

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
}

function sendError(res: ServerResponse, e: unknown) {
  if (e instanceof UserFacingError) return send(res, 422, { error: { code: e.code, message: e.message } });
  console.error("[processor]", e);
  send(res, 500, { error: { code: "INTERNAL", message: e instanceof Error ? e.message : String(e) } });
}

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

function videoIdOf(b: Record<string, unknown>): string {
  const id = String(b.videoId ?? "");
  if (!VIDEO_ID.test(id)) throw new UserFacingError("BAD_VIDEO_ID", "That isn't a valid YouTube video.");
  return id;
}

function mediaUrlOf(b: Record<string, unknown>): string {
  const url = String(b.url ?? "");
  if (!/^https:\/\//.test(url)) throw new UserFacingError("BAD_URL", "That file link isn't valid.");
  return url;
}

/** Runs `work` (download + split) in the background as a job the Worker polls. */
function startAudioJob(label: string, work: (dir: string) => Promise<Chunk[]>): string {
  const id = randomUUID();
  const job: Job = { status: "running", dir: join("/tmp/jobs", id), at: Date.now() };
  jobs.set(id, job);
  work(job.dir)
    .then((chunks) => Object.assign(job, { status: "done", chunks }))
    .catch((e) => {
      if (!(e instanceof UserFacingError)) console.error("[audio]", label, e);
      Object.assign(job, {
        status: "failed",
        error: e instanceof UserFacingError ? { code: e.code, message: e.message } : { code: "INTERNAL", message: String(e?.message ?? e) },
      });
    });
  return id;
}

async function dropJob(id: string) {
  const job = jobs.get(id);
  jobs.delete(id);
  if (job) await rm(job.dir, { recursive: true, force: true });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://processor");
    const parts = url.pathname.split("/").filter(Boolean);

    if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { ok: true });

    if (req.method === "POST" && url.pathname === "/youtube/captions") {
      const b = await body(req);
      return send(res, 200, await captions(videoIdOf(b), typeof b.lang === "string" ? b.lang : undefined));
    }

    if (req.method === "POST" && url.pathname === "/youtube/audio") {
      const videoId = videoIdOf(await body(req));
      return send(res, 202, { jobId: startAudioJob(videoId, (dir) => audioChunks(videoId, dir)) });
    }

    if (req.method === "POST" && url.pathname === "/media") {
      const mediaUrl = mediaUrlOf(await body(req));
      return send(res, 202, { jobId: startAudioJob("upload", (dir) => mediaChunks(mediaUrl, dir)) });
    }

    if (parts[0] === "jobs" && parts[1]) {
      const job = jobs.get(parts[1]);
      if (req.method === "DELETE" && parts.length === 2) {
        await dropJob(parts[1]);
        return send(res, 200, { ok: true });
      }
      if (!job) return send(res, 404, { error: { code: "JOB_NOT_FOUND", message: "Job not found (the processor may have restarted)." } });

      if (req.method === "GET" && parts.length === 2) {
        const chunks = job.chunks?.map(({ file: _file, ...c }) => c);
        return send(res, 200, { status: job.status, error: job.error, chunks });
      }
      if (req.method === "GET" && parts[2] === "chunks" && parts[3]) {
        const chunk = job.chunks?.[Number(parts[3])];
        if (!chunk) return send(res, 404, { error: { code: "CHUNK_NOT_FOUND", message: "Chunk not found." } });
        res.writeHead(200, { "Content-Type": "audio/ogg", "Content-Length": String(chunk.bytes) });
        return createReadStream(chunk.file).pipe(res);
      }
    }

    send(res, 404, { error: { code: "NOT_FOUND", message: "Not found." } });
  } catch (e) {
    sendError(res, e);
  }
});

// Jobs the Worker never cleaned up (e.g. its workflow failed) are removed after a while.
setInterval(() => {
  for (const [id, job] of jobs) if (Date.now() - job.at > JOB_TTL_MS) void dropJob(id);
}, 10 * 60_000).unref();

selfUpdate();
server.listen(Number(process.env.PORT ?? 8080), () => console.log(`processor listening on ${process.env.PORT ?? 8080}`));
