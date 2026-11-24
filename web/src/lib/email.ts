// Outgoing email. The provider is configured by environment variables; until
// it is, nothing is sent and the caller records "skipped".
//
//   EMAIL_PROVIDER=resend   RESEND_API_KEY=…   EMAIL_FROM="SenecAI Compliance <hub@yourdomain>"
//
// Resend's API is called over HTTPS with fetch (no SDK). Another provider can
// be added here behind the same `sendEmail` signature.

export type EmailResult = { status: "sent" | "skipped" | "failed"; detail?: string };

export async function sendEmail(msg: { to: string[]; subject: string; text: string }): Promise<EmailResult> {
  if (!msg.to.length) return { status: "skipped", detail: "no recipients" };
  const provider = process.env.EMAIL_PROVIDER;
  const from = process.env.EMAIL_FROM;
  if (provider !== "resend" || !process.env.RESEND_API_KEY || !from) {
    return { status: "skipped", detail: "no email provider configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: msg.to, subject: msg.subject, text: msg.text }),
    });
    if (!res.ok) return { status: "failed", detail: `HTTP ${res.status}` };
    return { status: "sent" };
  } catch (e) {
    return { status: "failed", detail: e instanceof Error ? e.message : "network error" };
  }
}

/** Absolute base URL of the Hub, for links in emails. */
export function appUrl(): string {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}
