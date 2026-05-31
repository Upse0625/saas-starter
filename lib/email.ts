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
  // Resend's SDK returns API errors in { data, error } instead of throwing —
  // surface them so problems like an unverified sender domain don't get swallowed.
  const result = await c.emails.send({ from: FROM, to, subject, text, html: html ?? text.replace(/\n/g, '<br>') });
  if (result.error) {
    console.error(`[email] Resend rejected "${subject}" to ${to}:`, result.error.name, '-', result.error.message);
    throw new Error(`Resend: ${result.error.name} — ${result.error.message}`);
  }
}

// ─── HTML template kit ───────────────────────────────────────────────────────
// One responsive, inline-styled layout shared by every email. Inline styles are
// deliberate — most email clients strip <style> blocks. Tweak BRAND to rebrand.
const BRAND = { accent: '#6366f1', accentText: '#ffffff', text: '#0f172a', muted: '#64748b', bg: '#f4f4f5', card: '#ffffff', border: '#e4e4e7' };

function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND.accent};color:${BRAND.accentText};text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">${label}</a>`;
}

function layout(opts: { heading: string; intro: string; cta?: { label: string; href: string }; outro?: string; footnote?: string }): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;">
        <tr><td style="padding:28px 32px 0;">
          <span style="display:inline-block;font-weight:700;font-size:16px;color:${BRAND.text};letter-spacing:-0.01em;">${APP_NAME}</span>
        </td></tr>
        <tr><td style="padding:20px 32px 8px;">
          <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:${BRAND.text};letter-spacing:-0.02em;">${opts.heading}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.muted};">${opts.intro}</p>
          ${opts.cta ? `<p style="margin:0 0 20px;">${button(opts.cta.label, opts.cta.href)}</p>` : ''}
          ${opts.outro ? `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:${BRAND.muted};">${opts.outro}</p>` : ''}
        </td></tr>
        <tr><td style="padding:16px 32px 28px;border-top:1px solid ${BRAND.border};margin-top:12px;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.muted};">${opts.footnote ?? `Sent by ${APP_NAME}. If you didn't expect this email, you can safely ignore it.`}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ─── Transactional emails ────────────────────────────────────────────────────
export async function sendVerificationEmail(to: string, token: string) {
  const url = `${APP_URL}/verify-email/${token}`;
  await sendEmail({
    to,
    subject: `Verify your ${APP_NAME} account`,
    text: `Welcome to ${APP_NAME}.\n\nVerify your email:\n${url}\n\nThis link expires in 24 hours.`,
    html: layout({
      heading: 'Verify your email',
      intro: `Welcome to ${APP_NAME}. Confirm this address to activate your account.`,
      cta: { label: 'Verify email', href: url },
      outro: `Or paste this link into your browser:<br><a href="${url}" style="color:${BRAND.accent};word-break:break-all;">${url}</a>`,
      footnote: 'This link expires in 24 hours.',
    }),
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${APP_URL}/reset-password/${token}`;
  await sendEmail({
    to,
    subject: `Reset your ${APP_NAME} password`,
    text: `Reset your ${APP_NAME} password:\n${url}\n\nIf this wasn't you, ignore this email. The link expires in 1 hour.`,
    html: layout({
      heading: 'Reset your password',
      intro: `We received a request to reset the password for your ${APP_NAME} account.`,
      cta: { label: 'Choose a new password', href: url },
      footnote: "If you didn't request this, ignore this email — the link expires in 1 hour and your password stays unchanged.",
    }),
  });
}

export async function sendInviteEmail(to: string, orgName: string, token: string, inviterName: string) {
  const url = `${APP_URL}/invite/${token}`;
  await sendEmail({
    to,
    subject: `${inviterName} invited you to ${orgName} on ${APP_NAME}`,
    text: `${inviterName} invited you to join "${orgName}" on ${APP_NAME}.\n\nAccept:\n${url}\n\nThis link expires in 7 days.`,
    html: layout({
      heading: `Join ${orgName}`,
      intro: `<strong style="color:${BRAND.text};">${inviterName}</strong> invited you to join <strong style="color:${BRAND.text};">${orgName}</strong> on ${APP_NAME}.`,
      cta: { label: 'Accept invitation', href: url },
      footnote: 'This invitation expires in 7 days.',
    }),
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  const url = `${APP_URL}/dashboard`;
  const first = name.split(' ')[0] || 'there';
  await sendEmail({
    to,
    subject: `Welcome to ${APP_NAME}`,
    text: `Hi ${first}, welcome to ${APP_NAME}! Your workspace is ready.\n\nOpen your dashboard:\n${url}`,
    html: layout({
      heading: `Welcome aboard, ${first}`,
      intro: `Your ${APP_NAME} workspace is ready. Invite your team, set up billing, and start building.`,
      cta: { label: 'Open your dashboard', href: url },
      footnote: `Need a hand getting started? Just reply to this email.`,
    }),
  });
}

export async function sendBillingReceiptEmail(
  to: string,
  opts: { plan: string; amount: string; date: string; invoiceUrl?: string },
) {
  await sendEmail({
    to,
    subject: `Your ${APP_NAME} receipt — ${opts.plan} plan`,
    text: `Thanks for your payment.\n\nPlan: ${opts.plan}\nAmount: ${opts.amount}\nDate: ${opts.date}\n${opts.invoiceUrl ? `Invoice: ${opts.invoiceUrl}` : ''}`,
    html: layout({
      heading: 'Payment received',
      intro: `Thanks for subscribing to ${APP_NAME}. Here's your receipt.`,
      outro: `<table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;color:${BRAND.text};">
        <tr><td style="padding:6px 0;color:${BRAND.muted};">Plan</td><td style="padding:6px 0;text-align:right;font-weight:600;">${opts.plan}</td></tr>
        <tr><td style="padding:6px 0;color:${BRAND.muted};">Amount</td><td style="padding:6px 0;text-align:right;font-weight:600;">${opts.amount}</td></tr>
        <tr><td style="padding:6px 0;color:${BRAND.muted};">Date</td><td style="padding:6px 0;text-align:right;font-weight:600;">${opts.date}</td></tr>
      </table>`,
      cta: opts.invoiceUrl ? { label: 'View invoice', href: opts.invoiceUrl } : undefined,
      footnote: `Manage your subscription anytime from Settings → Billing.`,
    }),
  });
}
