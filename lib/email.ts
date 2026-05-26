import { Resend } from 'resend';

const FROM = process.env.EMAIL_FROM ?? 'noreply@example.com';
const APP_NAME = process.env.APP_NAME ?? 'SaaS Starter';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

let client: Resend | null = null;
function getClient(): Resend | null {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key || key === 're_placeholder') return null;
  client = new Resend(key);
  return client;
}

interface SendArgs { to: string; subject: string; text: string; html?: string }

export async function sendEmail({ to, subject, text, html }: SendArgs): Promise<void> {
  const c = getClient();
  if (!c) {
    console.log(`\n━━━ EMAIL (dev mode — no RESEND_API_KEY) ━━━`);
    console.log(`To: ${to}\nSubject: ${subject}\n${text}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    return;
  }
  await c.emails.send({ from: FROM, to, subject, text, html: html ?? text.replace(/\n/g, '<br>') });
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${APP_URL}/verify-email/${token}`;
  await sendEmail({
    to,
    subject: `Verify your ${APP_NAME} account`,
    text: `Welcome to ${APP_NAME}.\n\nClick the link below to verify your email:\n${url}\n\nThis link expires in 24 hours.`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${APP_URL}/reset-password/${token}`;
  await sendEmail({
    to,
    subject: `Reset your ${APP_NAME} password`,
    text: `Someone requested a password reset for your ${APP_NAME} account.\n\nClick the link below to set a new password:\n${url}\n\nIf this wasn't you, you can ignore this email. The link expires in 1 hour.`,
  });
}

export async function sendInviteEmail(to: string, orgName: string, token: string, inviterName: string) {
  const url = `${APP_URL}/invite/${token}`;
  await sendEmail({
    to,
    subject: `${inviterName} invited you to ${orgName} on ${APP_NAME}`,
    text: `${inviterName} invited you to join "${orgName}" on ${APP_NAME}.\n\nAccept the invitation:\n${url}\n\nThis link expires in 7 days.`,
  });
}
