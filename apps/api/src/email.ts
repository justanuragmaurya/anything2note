import { env } from "cloudflare:workers";

export type Email = { to: string; subject: string; text: string; html: string };

/** Local dev (wrangler dev, tests) runs against seeded and test accounts. */
const isLocal = env.BETTER_AUTH_URL.startsWith("http://localhost");

export async function sendEmail({ to, subject, text, html }: Email): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

/**
 * Notifications ("notes ready", reminders), sent with Resend's batch endpoint (100 per request,
 * which keeps a big morning run inside its rate limit). In local dev they're only logged, so
 * seeded or test accounts never email a real inbox. Sign-in codes use sendEmail.
 */
export async function sendNotifications(emails: Email[]): Promise<void> {
  if (isLocal) {
    for (const e of emails) console.log(`[email] not sent (local dev) → ${e.to}: ${e.subject}\n${e.text}`);
    return;
  }
  for (let i = 0; i < emails.length; i += 100) {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(emails.slice(i, i + 100).map((e) => ({ from: env.EMAIL_FROM, ...e }))),
    });
    if (!res.ok) throw new Error(`Resend batch ${res.status}: ${await res.text()}`);
  }
}

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
