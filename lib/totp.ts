import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { randomBytes } from 'crypto';

const APP_NAME = process.env.APP_NAME ?? 'SaaS Starter';

authenticator.options = { window: 1, step: 30 };

export interface TotpSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  recoveryCodes: string[];
}

export async function generateTotpSetup(userEmail: string): Promise<TotpSetup> {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(userEmail, APP_NAME, secret);
  const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
  const recoveryCodes = Array.from({ length: 10 }, () => randomBytes(5).toString('hex'));
  return { secret, otpauthUrl, qrCodeDataUrl, recoveryCodes };
}

export function verifyTotpCode(token: string, secret: string): boolean {
  try {
    return authenticator.check(token, secret);
  } catch {
    return false;
  }
}

export function consumeRecoveryCode(stored: string, provided: string): { ok: boolean; remaining: string } {
  const codes = stored.split(',').map(c => c.trim()).filter(Boolean);
  const i = codes.indexOf(provided.trim().toLowerCase());
  if (i === -1) return { ok: false, remaining: stored };
  codes.splice(i, 1);
  return { ok: true, remaining: codes.join(',') };
}
