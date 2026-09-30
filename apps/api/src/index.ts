import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { ZodError } from "zod";
import { auth } from "./auth";
import { errorResponse, requireUser, type AppEnv } from "./lib/http";
import { REMINDER_CRON, sendDailyReminders } from "./lib/notify";
import { limitAuth, limitUser } from "./lib/ratelimit";
import { account } from "./routes/account";
import { billing, dodoWebhook } from "./routes/billing";
import { exportsRoute } from "./routes/exports";
import { library } from "./routes/library";
import { outputs } from "./routes/outputs";
import { settings } from "./routes/settings";
import { publicShares, shareRoutes } from "./routes/shares";
import { study } from "./routes/study";
import { uploadRoutes } from "./routes/uploads";

export { ProcessSource } from "./pipeline/workflow";
export { Processor } from "./pipeline/processor";

const app = new Hono<AppEnv>();

app.use(
  "/api/*",
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    // So the web app can read the export's file name.
    exposeHeaders: ["Content-Disposition"],
  }),
);

app.use("/api/auth/*", limitAuth);
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Outside /api: no session or CORS, authenticated by its signature instead.
app.post("/webhooks/dodo", dodoWebhook);

// Read-only share links: no session. Mounted before the session-checked routes below.
app.route("/api/public", publicShares);

const api = new Hono<AppEnv>();
api.use("*", requireUser);
// Rate limits before the routes (lib/ratelimit.ts has the numbers).
api.post("/sources", limitUser("RL_SOURCES"));
api.post("/uploads", limitUser("RL_UPLOADS"));
api.post("/sources/:id/chat", limitUser("RL_CHAT"));
api.route("/", library);
api.route("/", outputs);
api.route("/", shareRoutes);
api.route("/", exportsRoute);
api.route("/", uploadRoutes);
api.route("/", study);
api.route("/", account);
api.route("/", billing);
api.route("/", settings);
app.route("/api", api);

app.get("/", (c) => c.json({ ok: true }));

app.onError((err, c) => {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return c.json({ error: { code: "INVALID_REQUEST", message: first ? `${first.path.join(".") || "body"}: ${first.message}` : "Invalid request." } }, 400);
  }
  if (err instanceof SyntaxError) return c.json({ error: { code: "INVALID_JSON", message: "The request body isn't valid JSON." } }, 400);
  return errorResponse(c, err);
});

export default {
  fetch: app.fetch,
  async scheduled(controller, _env, ctx) {
    if (controller.cron === REMINDER_CRON) ctx.waitUntil(sendDailyReminders(controller.scheduledTime));
  },
} satisfies ExportedHandler<Cloudflare.Env>;
