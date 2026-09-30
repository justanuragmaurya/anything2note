import { eq } from "drizzle-orm";
import type { NoteTypeKey, UserSettings } from "@a2n/shared";
import { userSettings } from "../db/schema";
import { db } from "./http";

/** What a user without a user_settings row gets (same as the table defaults). */
export const DEFAULT_SETTINGS: UserSettings = {
  defaultNoteType: "auto",
  language: "auto",
  deleteOriginals: false,
  emailNotesReady: true,
  emailReminders: true,
};

export const toSettings = (row: typeof userSettings.$inferSelect | undefined): UserSettings =>
  row
    ? {
        defaultNoteType: row.defaultNoteType as NoteTypeKey | "auto",
        language: row.language,
        deleteOriginals: row.deleteOriginals,
        emailNotesReady: row.emailNotesReady,
        emailReminders: row.emailReminders,
      }
    : { ...DEFAULT_SETTINGS };

export async function settingsFor(userId: string): Promise<UserSettings> {
  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  return toSettings(row);
}
