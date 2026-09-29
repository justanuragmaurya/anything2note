import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { ZodError } from "zod";
import { auth } from "./auth";
import { errorResponse, requireUser, type AppEnv } from "./lib/http";
import { account } from "./routes/account";
import { billing, dodoWebhook } from "./routes/billing";
import { library } from "./routes/library";
import { study } from "./routes/study";

export { ProcessSource } from "./pipeline/workflow";

const app = new Hono<AppEnv>();

app.use(
  "/api/*",
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Outside /api: no session or CORS, authenticated by its signature instead.
app.post("/webhooks/dodo", dodoWebhook);

const api = new Hono<AppEnv>();
api.use("*", requireUser);
api.route("/", library);
api.route("/", study);
api.route("/", account);
api.route("/", billing);
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

export default app;
