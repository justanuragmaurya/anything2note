import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import { addToLibrary, all, api, createUser, json, run, seedCard, seedChat, seedGeneration, seedSource, seedTask, type TestUser } from "./helpers";

/*
 * plan.md §12 "Private content isolation": user A can never read or change user B's private
 * items, uploads, tasks, chat, settings, shares or credit history, and a shared YouTube source
 * shows each user only their own state. Each check that expects a 404 for B's data has a
 * matching check that B (or A, on A's own data) gets it, so a missing route can't pass as isolation.
 */

let A: TestUser;
let B: TestUser;

beforeAll(async () => {
  A = await createUser("user_a");
  B = await createUser("user_b");

  // A's own private item (positive control).
  await seedSource({ id: "src_a", owner: A.id, sourceRef: `text/${A.id}/src_a.txt` });
  await addToLibrary(A.id, "src_a");
  await seedGeneration("gen_a_summary", "src_a", "shared", "summary", { type: "summary", tldr: "A's summary", points: [] });

  // B's private item with everything a user can have on it.
  await seedSource({ id: "src_b", owner: B.id, sourceRef: `uploads/${B.id}/up_b/lecture.pdf`, title: "B private lecture" });
  await addToLibrary(B.id, "src_b");
  await seedGeneration("gen_b_summary", "src_b", "shared", "summary", { type: "summary", tldr: "B's secret summary", points: [] });
  await seedGeneration("gen_b_tasks", "src_b", "shared", "tasks", { type: "tasks", items: [] });
  await seedGeneration("gen_b_cards", "src_b", "shared", "flashcards", { type: "flashcards", cards: [] });
  await seedTask("task_b", B.id, "src_b", "B's private homework", null, "gen_b_tasks");
  await seedChat("chat_b", B.id, "src_b", "B's private question");
  await seedCard("card_b", "gen_b_cards", "src_b", [B.id]);
  await run("INSERT INTO shares (id,user_id,source_id) VALUES ('share_b','user_b','src_b')");

  // B's uploads: one finished single PUT, one unfinished multipart.
  await env.BUCKET.put(`uploads/${B.id}/up_b/lecture.pdf`, "%PDF-1.4 B's file");
  await run("INSERT INTO uploads (id,user_id,r2_key,filename,content_type,size) VALUES ('up_b','user_b',?,'lecture.pdf','application/pdf',17)", `uploads/${B.id}/up_b/lecture.pdf`);
  await run(
    "INSERT INTO uploads (id,user_id,r2_key,filename,content_type,size,multipart_id) VALUES ('up_b_mp','user_b',?,'long.mp3','audio/mpeg',104857600,'mp-1')",
    `uploads/${B.id}/up_b_mp/long.mp3`,
  );

  // A shared public YouTube video both users have, each with their own state.
  await seedSource({ id: "src_yt", kind: "youtube", visibility: "shared", owner: null, sourceRef: "dQw4w9WgXcQ", title: "Shared video" });
  await addToLibrary(A.id, "src_yt");
  await addToLibrary(B.id, "src_yt", { titleOverride: "B's private rename" });
  await seedGeneration("gen_yt_summary", "src_yt", "shared", "summary", { type: "summary", tldr: "Shared summary", points: [] });
  await seedGeneration("gen_yt_tasks", "src_yt", "shared", "tasks", { type: "tasks", items: [] });
  // B edited the summary: their own copy, which A must never see.
  await seedGeneration("gen_yt_summary_b", "src_yt", B.id, "summary", { type: "summary", tldr: "B's edited summary", points: [] });
  await seedTask("task_yt_a", A.id, "src_yt", "A's task on the video", null, "gen_yt_tasks");
  await seedTask("task_yt_b", B.id, "src_yt", "B's task on the video", null, "gen_yt_tasks");
  await seedChat("chat_yt_a", A.id, "src_yt", "A asks about the video");
  await seedChat("chat_yt_b", B.id, "src_yt", "B asks about the video");
  await run("INSERT INTO shares (id,user_id,source_id) VALUES ('share_yt_b','user_b','src_yt')");

  // Credit history.
  await run("INSERT INTO credit_ledger (id,user_id,bucket_id,delta,reason,source_id,meta_json) VALUES ('l_a','user_a','b_user_a',-3,'item','src_a','{\"minutes\":3,\"pages\":0}')");
  await run("INSERT INTO credit_ledger (id,user_id,bucket_id,delta,reason,source_id,meta_json) VALUES ('l_b','user_b','b_user_b',-7,'item','src_b','{\"minutes\":0,\"pages\":7}')");
});

describe("signed out", () => {
  it("gets 401 everywhere under /api", async () => {
    for (const path of ["/api/library", "/api/sources/src_a", "/api/tasks", "/api/settings", "/api/billing/credits"]) expect((await api(null, "GET", path)).status).toBe(401);
  });
});

describe("private items", () => {
  it("lists only the user's own library", async () => {
    const ids = (await json<{ items: { id: string }[] }>(await api(A, "GET", "/api/library"))).items.map((i) => i.id).sort();
    expect(ids).toEqual(["src_a", "src_yt"]);
    const idsB = (await json<{ items: { id: string }[] }>(await api(B, "GET", "/api/library"))).items.map((i) => i.id).sort();
    expect(idsB).toEqual(["src_b", "src_yt"]);
  });

  it("can't open, edit, retry, chat with or delete another user's item", async () => {
    expect((await api(B, "GET", "/api/sources/src_b")).status).toBe(200);
    const res = await api(A, "GET", "/api/sources/src_b");
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain("secret");

    expect((await api(A, "PATCH", "/api/sources/src_b", { title: "pwned" })).status).toBe(404);
    expect((await api(A, "POST", "/api/sources/src_b/retry")).status).toBe(404);
    expect((await api(A, "POST", "/api/sources/src_b/chat", { message: "What does it say?" })).status).toBe(404);
    expect((await api(A, "POST", "/api/sources/src_b/outputs", { outputs: ["quiz"] })).status).toBe(404);
    expect((await api(A, "POST", "/api/sources/src_b/outputs/summary/regenerate", {})).status).toBe(404);
    expect((await api(A, "PATCH", "/api/sources/src_b/outputs/summary", { data: { type: "summary", tldr: "pwned", points: [] } })).status).toBe(404);
    expect((await api(A, "GET", "/api/sources/src_b/export?format=html")).status).toBe(404);
    expect((await api(A, "DELETE", "/api/sources/src_b")).status).toBe(404);

    // Nothing of B's changed.
    const [src] = await all("SELECT id FROM sources WHERE id = 'src_b'");
    expect(src).toBeTruthy();
    const [us] = await all<{ title_override: string | null }>("SELECT title_override FROM user_sources WHERE source_id = 'src_b'");
    expect(us!.title_override).toBeNull();
    expect(await env.BUCKET.head("content/src_b.json")).toBeTruthy();
    const [gen] = await all<{ content_json: string }>("SELECT content_json FROM generations WHERE id = 'gen_b_summary'");
    expect(gen!.content_json).toContain("B's secret summary");
  });

  it("can't move another user's item into a folder or see their folders", async () => {
    const folder = await json<{ folder: { id: string } }>(await api(B, "POST", "/api/folders", { name: "B's folder" }));
    expect((await json<{ folders: unknown[] }>(await api(A, "GET", "/api/library"))).folders).toEqual([]);
    expect((await api(A, "PATCH", "/api/sources/src_a", { folderId: folder.folder.id })).status).toBe(404);
    expect((await api(A, "DELETE", `/api/folders/${folder.folder.id}`)).status).toBe(204);
    expect(await all("SELECT id FROM folders WHERE id = ?", folder.folder.id)).toHaveLength(1);
  });
});

describe("uploads", () => {
  it("can't turn another user's upload into an item", async () => {
    const res = await api(A, "POST", "/api/sources", { source: { type: "upload", uploadId: "up_b" }, noteType: "lecture" });
    expect(res.status).toBe(404);
    expect((await json(res)).error.code).toBe("UPLOAD_NOT_FOUND");
  });

  it("can't complete another user's multipart upload", async () => {
    const res = await api(A, "POST", "/api/uploads/up_b_mp/complete", { parts: [{ number: 1, etag: "x" }] });
    expect(res.status).toBe(404);
  });

  it("refuses an unfinished multipart upload, even for its owner", async () => {
    const res = await api(B, "POST", "/api/sources", { source: { type: "upload", uploadId: "up_b_mp" }, noteType: "lecture" });
    expect(res.status).toBe(409);
    expect((await json(res)).error.code).toBe("UPLOAD_INCOMPLETE");
  });

  it("checks the part list before completing", async () => {
    const res = await api(B, "POST", "/api/uploads/up_b_mp/complete", { parts: [{ number: 1, etag: "x" }] });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("PARTS_MISMATCH");
  });
});

describe("tasks, reviews and quizzes", () => {
  it("lists only the user's own tasks", async () => {
    const tasks = (await json<{ tasks: { id: string }[] }>(await api(A, "GET", "/api/tasks"))).tasks.map((t) => t.id);
    expect(tasks).toEqual(["task_yt_a"]);
  });

  it("can't tick or edit another user's task", async () => {
    expect((await api(A, "PATCH", "/api/tasks/task_b", { done: true })).status).toBe(404);
    expect((await api(A, "PATCH", "/api/tasks/task_yt_b", { done: true })).status).toBe(404);
    const rows = await all<{ status: string; task: string }>("SELECT status, task FROM tasks WHERE id IN ('task_b','task_yt_b')");
    expect(rows.every((r) => r.status === "open")).toBe(true);
    expect((await api(B, "PATCH", "/api/tasks/task_b", { done: false })).status).toBe(200);
  });

  it("doesn't show or accept reviews of another user's cards", async () => {
    expect((await json<{ cards: unknown[] }>(await api(A, "GET", "/api/reviews/due"))).cards).toEqual([]);
    expect((await api(A, "POST", "/api/reviews", { cardId: "card_b", rating: "good" })).status).toBe(404);
    expect((await json<{ cards: { id: string }[] }>(await api(B, "GET", "/api/reviews/due"))).cards.map((c) => c.id)).toEqual(["card_b"]);
  });

  it("can't submit a quiz on another user's item", async () => {
    expect((await api(A, "POST", "/api/quiz-attempts", { itemId: "src_b", output: "quiz", answers: [0] })).status).toBe(404);
  });
});

describe("shared YouTube sources", () => {
  it("shows each user only their own title, tasks, chat, outputs and share", async () => {
    const a = await json(await api(A, "GET", "/api/sources/src_yt"));
    expect(a.item.title).toBe("Shared video");
    expect(a.chat.map((m: { content: string }) => m.content)).toEqual(["A asks about the video"]);
    expect(a.outputs.summary.data.tldr).toBe("Shared summary");
    expect(a.outputs.tasks.data.items.map((t: { id: string }) => t.id)).toEqual(["task_yt_a"]);
    expect(a.share ?? null).toBeNull();
    expect(a.mediaUrl).toBeNull();
    const text = JSON.stringify(a);
    for (const leak of ["B's private rename", "B's task", "B asks", "B's edited summary", "share_yt_b"]) expect(text).not.toContain(leak);

    const b = await json(await api(B, "GET", "/api/sources/src_yt"));
    expect(b.item.title).toBe("B's private rename");
    expect(b.chat.map((m: { content: string }) => m.content)).toEqual(["B asks about the video"]);
  });

  it("removing it from one library leaves the other user's state alone", async () => {
    const C = await createUser("user_c");
    await addToLibrary(C.id, "src_yt");
    await seedTask("task_yt_c", C.id, "src_yt", "C's task");
    expect((await api(C, "DELETE", "/api/sources/src_yt")).status).toBe(204);
    expect(await all("SELECT user_id FROM user_sources WHERE source_id = 'src_yt' ORDER BY user_id")).toEqual([{ user_id: "user_a" }, { user_id: "user_b" }]);
    expect(await all("SELECT id FROM tasks WHERE source_id = 'src_yt' ORDER BY id")).toEqual([{ id: "task_yt_a" }, { id: "task_yt_b" }]);
    expect(await all("SELECT id FROM generations WHERE id = 'gen_yt_summary_b'")).toHaveLength(1);
    expect(await all("SELECT id FROM chat_messages WHERE source_id = 'src_yt' ORDER BY id")).toEqual([{ id: "chat_yt_a" }, { id: "chat_yt_b" }]);
  });
});

describe("shares", () => {
  it("can't share or unshare another user's item", async () => {
    expect((await api(A, "POST", "/api/sources/src_b/share")).status).toBe(404);
    expect((await api(A, "DELETE", "/api/sources/src_b/share")).status).toBe(404);
    expect(await all("SELECT id FROM shares WHERE user_id = 'user_b' ORDER BY id")).toEqual([{ id: "share_b" }, { id: "share_yt_b" }]);
  });
});

describe("settings", () => {
  it("are per user", async () => {
    const patched = await json(await api(A, "PATCH", "/api/settings", { deleteOriginals: true, defaultNoteType: "podcast" }));
    expect(patched.settings).toMatchObject({ deleteOriginals: true, defaultNoteType: "podcast", emailReminders: true });
    expect((await json(await api(A, "GET", "/api/settings"))).settings.deleteOriginals).toBe(true);
    // B still has the defaults.
    expect((await json(await api(B, "GET", "/api/settings"))).settings).toEqual({
      defaultNoteType: "auto",
      language: "auto",
      deleteOriginals: false,
      emailNotesReady: true,
      emailReminders: true,
    });
  });

  it("validates the note type", async () => {
    expect((await api(A, "PATCH", "/api/settings", { defaultNoteType: "nope" })).status).toBe(400);
    expect((await api(A, "PATCH", "/api/settings", { defaultNoteType: "auto" })).status).toBe(200);
  });
});

describe("credit history", () => {
  it("shows only the user's own ledger, with item titles", async () => {
    const a = await json(await api(A, "GET", "/api/billing/credits"));
    expect(a.entries.map((e: { id: string }) => e.id)).toEqual(["l_a"]);
    expect(a.entries[0]).toMatchObject({ delta: -3, reason: "item", itemId: "src_a", itemTitle: "Title src_a", minutes: 3 });
    expect(a.next).toBeNull();
    expect(JSON.stringify(a)).not.toContain("B private lecture");
  });
});
