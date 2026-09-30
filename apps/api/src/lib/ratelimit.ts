import { env } from "cloudflare:workers";
import type { Context, MiddlewareHandler } from "hono";
import type { AppEnv } from "./http";

/*
 * Rate limits (plan.md §12) with the Workers Rate Limiting bindings in wrangler.jsonc:
 *
 *   RL_AUTH_IP    60/min per IP     POST /api/auth/*  (GETs like get-session are left alone)
 *   RL_OTP_EMAIL   5/min per email  sending a sign-in code
 *   RL_SOURCES    20/min per user   POST /api/sources
 *   RL_UPLOADS    30/min per user   POST /api/uploads
 *   RL_CHAT       20/min per user   POST /api/sources/:id/chat
 *
 * Over the limit → 429 with a plain message and Retry-After.
 */

type Limiter = "RL_AUTH_IP" | "RL_OTP_EMAIL" | "RL_SOURCES" | "RL_UPLOADS" | "RL_CHAT";

const tooMany = (c: Context) =>
  c.json({ error: { code: "RATE_LIMITED", message: "You're doing that too often. Wait a minute, then try again." } }, 429, { "Retry-After": "60" });

async function allowed(limiter: Limiter, key: string): Promise<boolean> {
  try {
    return (await env[limiter].limit({ key })).success;
  } catch (e) {
    // A limiter outage shouldn't take the API down with it.
    console.error("[ratelimit]", limiter, e);
    return true;
  }
}

/** Per signed-in user; mount after requireUser. */
export const limitUser =
  (limiter: Limiter): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    if (!(await allowed(limiter, c.get("user").id))) return tooMany(c);
    await next();
  };

const clientIp = (c: Context) => c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

/** Better Auth email-otp endpoints that email a code. */
const SENDS_CODE = /\/(send-verification-otp|request-password-reset|forget-password\/email-otp|request-email-change)$/;

/** Better Auth's POST routes: per IP, plus per address for the ones that email a code. */
export const limitAuth: MiddlewareHandler = async (c, next) => {
  if (c.req.method !== "POST") return next();
  if (!(await allowed("RL_AUTH_IP", clientIp(c)))) return tooMany(c);
  if (SENDS_CODE.test(c.req.path)) {
    const body = (await c.req.raw
      .clone()
      .json()
      .catch(() => null)) as { email?: unknown } | null;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email && !(await allowed("RL_OTP_EMAIL", email))) return tooMany(c);
  }
  await next();
};
