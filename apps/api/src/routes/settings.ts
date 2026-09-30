import { Hono } from "hono";
import { z } from "zod";
import { NOTE_TYPE_KEYS, type NoteTypeKey, type SettingsResponse } from "@a2n/shared";
import { userSettings } from "../db/schema";
import { db, type AppEnv } from "../lib/http";
import { settingsFor, toSettings } from "../lib/settings";

/* GET/PATCH /settings: per-user preferences, synced across devices. A missing row means the defaults. */

export const settings = new Hono<AppEnv>();

const patchSchema = z
  .object({
    defaultNoteType: z.enum([...(NOTE_TYPE_KEYS as [NoteTypeKey, ...NoteTypeKey[]]), "auto"]),
    language: z.string().trim().min(1).max(40),
    deleteOriginals: z.boolean(),
    emailNotesReady: z.boolean(),
    emailReminders: z.boolean(),
  })
  .partial()
  .strict();

settings.get("/settings", async (c) => c.json({ settings: await settingsFor(c.get("user").id) } satisfies SettingsResponse));

settings.patch("/settings", async (c) => {
  const userId = c.get("user").id;
  const patch = patchSchema.parse(await c.req.json());
  const now = Date.now();
  // Start from the current values so a first PATCH doesn't reset the fields it leaves out.
  const [row] = await db
    .insert(userSettings)
    .values({ ...(await settingsFor(userId)), ...patch, userId, updatedAt: now })
    .onConflictDoUpdate({ target: userSettings.userId, set: { ...patch, updatedAt: now } })
    .returning();
  return c.json({ settings: toSettings(row) } satisfies SettingsResponse);
});
