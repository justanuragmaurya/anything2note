import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { auth } from "../auth";
import * as schema from "../db/schema";

export const db = drizzle(env.DB, { schema });

export type SessionUser = { id: string; name: string; email: string; image?: string | null };
export type AppEnv = { Variables: { user: SessionUser } };

export class HttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const fail = (status: ContentfulStatusCode, code: string, message: string) => new HttpError(status, code, message);

export function errorResponse(c: Context, err: unknown) {
  if (err instanceof HttpError) return c.json({ error: { code: err.code, message: err.message } }, err.status);
  console.error("[api]", err);
  return c.json({ error: { code: "INTERNAL", message: "Something went wrong on our side. Try again." } }, 500);
}

/** Rejects requests without a Better Auth session; the user is on `c.get("user")`. */
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) throw fail(401, "UNAUTHORIZED", "Sign in to continue.");
  c.set("user", session.user);
  await next();
});

export const newId = () => crypto.randomUUID();

/* Users are mostly in India, so "today" and streaks follow IST. */
const IST = 5.5 * 3600_000;
export const DAY = 86_400_000;
export const istDay = (ts: number) => Math.floor((ts + IST) / DAY);
export const startOfIstDay = (ts: number) => istDay(ts) * DAY - IST;
export const period = (ts = Date.now()) => new Date(ts + IST).toISOString().slice(0, 7);
