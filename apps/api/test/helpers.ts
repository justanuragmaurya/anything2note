import { env, exports } from "cloudflare:workers";

/*
 * Test helpers: users with a Better Auth session and a signed cookie (the same shape the
 * browser gets), plus small SQL seeders. Everything is written straight to D1, so tests never
 * start a workflow or call an AI provider.
 */

const now = Date.now();
const future = now + 30 * 86_400_000;

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.BETTER_AUTH_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export type TestUser = { id: string; cookie: string };

/** A user on an active Plus plan with 500 credits, signed in. */
export async function createUser(id: string): Promise<TestUser> {
  const token = `tok_${id}_${crypto.randomUUID().replace(/-/g, "")}`;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO user (id,name,email,email_verified,created_at,updated_at) VALUES (?,?,?,1,?,?)").bind(id, `User ${id}`, `${id}@example.test`, now, now),
    env.DB.prepare("INSERT INTO session (id,expires_at,token,created_at,updated_at,user_id) VALUES (?,?,?,?,?,?)").bind(`s_${id}`, future, token, now, now, id),
    env.DB.prepare(
      "INSERT INTO subscriptions (id,user_id,provider_sub_id,provider_customer_id,plan,status,current_period_start,current_period_end) VALUES (?,?,?,?,'plus','active',?,?)",
    ).bind(`sub_${id}`, id, `p_${id}`, `c_${id}`, now, future),
    env.DB.prepare(
      "INSERT INTO credit_buckets (id,user_id,kind,granted,remaining,chat_granted,chat_remaining,expires_at,ref) VALUES (?,?,'plan',500,500,50,50,?,?)",
    ).bind(`b_${id}`, id, future, `ref_${id}`),
  ]);
  return { id, cookie: `better-auth.session_token=${encodeURIComponent(`${token}.${await sign(token)}`)}` };
}

/** A request to the Worker as `user` (or signed out with null). */
export async function api(user: TestUser | null, method: string, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = {};
  if (user) headers.Cookie = user.cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return exports.default.fetch(
    new Request(`http://localhost${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }),
  );
}

export const json = async <T = any>(res: Response): Promise<T> => (await res.json()) as T;

export const run = (sql: string, ...args: unknown[]) => env.DB.prepare(sql).bind(...args).run();
export const all = async <T = Record<string, unknown>>(sql: string, ...args: unknown[]) => (await env.DB.prepare(sql).bind(...args).all<T>()).results;

type SourceSeed = { id: string; kind?: string; visibility?: "private" | "shared"; owner: string | null; sourceRef?: string; title?: string };

/** A source with extracted content in R2 (so chat and the workspace can read it). */
export async function seedSource(s: SourceSeed) {
  await run(
    "INSERT INTO sources (id,kind,visibility,owner_user_id,source_ref,title,meta_json,content_r2_key,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,'ready',?,?)",
    s.id,
    s.kind ?? "text",
    s.visibility ?? "private",
    s.owner,
    s.sourceRef ?? null,
    s.title ?? `Title ${s.id}`,
    JSON.stringify({ label: "Pasted text", credits: 1, pages: 1 }),
    `content/${s.id}.json`,
    now,
    now,
  );
  await env.BUCKET.put(`content/${s.id}.json`, JSON.stringify({ kind: "text", segments: [{ id: "s1", text: `Secret content of ${s.id}` }], method: "plain" }));
}

export async function addToLibrary(userId: string, sourceId: string, opts: { titleOverride?: string; instructions?: string } = {}) {
  await run(
    "INSERT INTO user_sources (user_id,source_id,note_type,selected_outputs_json,language,instructions,title_override,status,progress,added_at,updated_at) VALUES (?,?,'lecture',?,'auto',?,?,'ready',100,?,?)",
    userId,
    sourceId,
    JSON.stringify(["tasks", "summary"]),
    opts.instructions ?? null,
    opts.titleOverride ?? null,
    now,
    now,
  );
}

export async function seedGeneration(id: string, sourceId: string, variant: string, output: string, content: unknown) {
  await run(
    "INSERT INTO generations (id,source_id,variant,note_type,output_type,language,status,content_json,created_at,updated_at) VALUES (?,?,?,'lecture',?,'auto','ready',?,?,?)",
    id,
    sourceId,
    variant,
    output,
    JSON.stringify(content),
    now,
    now,
  );
}

/** A user's task; the workspace shows tasks that belong to the tasks generation they read. */
export async function seedTask(id: string, userId: string, sourceId: string, task: string, due: string | null = null, generationId: string | null = null) {
  await run(
    "INSERT INTO tasks (id,user_id,source_id,generation_id,task,kind,due_date,status,position) VALUES (?,?,?,?,?,'homework',?,'open',0)",
    id,
    userId,
    sourceId,
    generationId,
    task,
    due,
  );
}

export async function seedChat(id: string, userId: string, sourceId: string, content: string) {
  await run("INSERT INTO chat_messages (id,user_id,source_id,role,content,created_at) VALUES (?,?,?,'user',?,?)", id, userId, sourceId, content, now);
}

export async function seedCard(id: string, generationId: string, sourceId: string, reviewers: string[]) {
  await run("INSERT INTO flashcards (id,generation_id,source_id,front,back,topic,position) VALUES (?,?,?,?,?,'t',0)", id, generationId, sourceId, `Front ${id}`, `Back ${id}`);
  for (const u of reviewers) await run("INSERT INTO card_reviews (user_id,card_id,due) VALUES (?,?,?)", u, id, now - 1000);
}
