import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import { notifyReady, sendDailyReminders } from "../src/lib/notify";
import { deleteOriginal } from "../src/lib/retention";
import { addToLibrary, all, api, createUser, json, run, seedCard, seedGeneration, seedSource, seedTask, type TestUser } from "./helpers";

/* Retention, notification emails (logged, not sent, in tests) and rate limits. */

let A: TestUser;
let B: TestUser;

beforeAll(async () => {
  A = await createUser("ret_a");
  B = await createUser("ret_b");
});

describe("retention (deleteOriginals)", () => {
  it("deletes the owner's original and keeps the content when the setting is on", async () => {
    const key = `uploads/${A.id}/up1/talk.mp3`;
    await seedSource({ id: "r_src", kind: "audio", owner: A.id, sourceRef: key });
    await addToLibrary(A.id, "r_src");
    await env.BUCKET.put(key, "audio bytes");
    await run("INSERT INTO uploads (id,user_id,r2_key,filename,content_type,size) VALUES ('up1',?,?,'talk.mp3','audio/mpeg',11)", A.id, key);

    // Off by default: nothing happens.
    await deleteOriginal(A.id, "r_src");
    expect(await env.BUCKET.head(key)).toBeTruthy();

    await api(A, "PATCH", "/api/settings", { deleteOriginals: true });
    await deleteOriginal(A.id, "r_src");
    expect(await env.BUCKET.head(key)).toBeNull();
    expect(await env.BUCKET.head("content/r_src.json")).toBeTruthy();
    expect(await all("SELECT source_ref FROM sources WHERE id = 'r_src'")).toEqual([{ source_ref: null }]);
    expect(await all("SELECT id FROM uploads WHERE id = 'up1'")).toEqual([]);

    const detail = await json(await api(A, "GET", "/api/sources/r_src"));
    expect(detail.mediaUrl).toBeNull();
    expect(detail.content.segments).toHaveLength(1);
  });

  it("never touches a shared source or someone else's item", async () => {
    await api(B, "PATCH", "/api/settings", { deleteOriginals: true });
    await seedSource({ id: "r_yt", kind: "youtube", visibility: "shared", owner: null, sourceRef: "abcdefghijk" });
    await addToLibrary(B.id, "r_yt");
    await deleteOriginal(B.id, "r_yt");
    expect(await all("SELECT source_ref FROM sources WHERE id = 'r_yt'")).toEqual([{ source_ref: "abcdefghijk" }]);

    const key = `text/${A.id}/r_other.txt`;
    await seedSource({ id: "r_other", owner: A.id, sourceRef: key });
    await env.BUCKET.put(key, "A's text");
    await deleteOriginal(B.id, "r_other");
    expect(await env.BUCKET.head(key)).toBeTruthy();
  });
});

describe("notes ready email", () => {
  it("is sent once per item and respects the setting", async () => {
    await seedSource({ id: "n_src", owner: A.id });
    await addToLibrary(A.id, "n_src");
    await notifyReady(A.id, "n_src");
    await notifyReady(A.id, "n_src");
    expect(await all("SELECT kind FROM reminder_log WHERE user_id = ? AND kind LIKE 'ready:%'", A.id)).toEqual([{ kind: "ready:n_src" }]);

    await api(B, "PATCH", "/api/settings", { emailNotesReady: false });
    await seedSource({ id: "n_src_b", owner: B.id });
    await addToLibrary(B.id, "n_src_b");
    await notifyReady(B.id, "n_src_b");
    expect(await all("SELECT kind FROM reminder_log WHERE user_id = ? AND kind LIKE 'ready:%'", B.id)).toEqual([]);
  });
});

describe("morning reminders", () => {
  it("emails users with due cards or tasks due today, once a day, unless they opted out", async () => {
    const C = await createUser("rem_c");
    const D = await createUser("rem_d");
    const E = await createUser("rem_e");
    const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
    await seedSource({ id: "m_src", owner: C.id });
    await addToLibrary(C.id, "m_src");
    await seedGeneration("m_gen", "m_src", "shared", "flashcards", { type: "flashcards", cards: [] });
    await seedCard("m_card", "m_gen", "m_src", [C.id]);
    await seedSource({ id: "m_src_d", owner: D.id });
    await addToLibrary(D.id, "m_src_d");
    await seedTask("m_task_d", D.id, "m_src_d", "Essay due", today);
    await seedSource({ id: "m_src_e", owner: E.id });
    await addToLibrary(E.id, "m_src_e");
    await seedTask("m_task_e", E.id, "m_src_e", "Reading", today);
    await api(E, "PATCH", "/api/settings", { emailReminders: false });

    await sendDailyReminders();
    const sent = await all<{ user_id: string }>("SELECT user_id FROM reminder_log WHERE kind = 'daily' ORDER BY user_id");
    expect(sent.map((r) => r.user_id)).toEqual(["rem_c", "rem_d"]);
    expect((await sendDailyReminders()).sent).toBe(0);
  });
});

describe("rate limits", () => {
  it("returns 429 after 20 new items a minute", async () => {
    const statuses: number[] = [];
    // An invalid body is rejected after the limiter, so no item is created.
    for (let i = 0; i < 22; i++) statuses.push((await api(B, "POST", "/api/sources", {})).status);
    expect(statuses.slice(0, 20).every((s) => s === 400)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
    const res = await api(B, "POST", "/api/sources", {});
    expect((await json(res)).error.code).toBe("RATE_LIMITED");
    expect(res.headers.get("Retry-After")).toBe("60");
    // Per user: A is unaffected.
    expect((await api(A, "POST", "/api/sources", {})).status).toBe(400);
  });
});
