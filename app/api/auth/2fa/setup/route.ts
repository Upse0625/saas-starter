import { NextResponse } from 'next/server';
import { sqlite } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { generateTotpSetup } from '@/lib/totp';
import { rateLimitByKey } from '@/lib/rate-limit';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = rateLimitByKey('2fa-setup', session.userId, 5, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${Math.ceil(limit.resetIn / 1000)}s.` },
        { status: 429 },
      );
    }

    const enabledRow = sqlite.prepare(
      'SELECT totp_enabled FROM users WHERE id = ?',
    ).get(session.userId) as { totp_enabled: number } | undefined;

    if (enabledRow?.totp_enabled === 1) {
      return NextResponse.json(
        { error: '2FA is already enabled. Disable it first to regenerate.' },
        { status: 400 },
      );
    }

    const setup = await generateTotpSetup(session.email);

    sqlite.prepare(`
      UPDATE users
      SET totp_secret = ?, totp_recovery_codes = ?
      WHERE id = ?
    `).run(setup.secret, setup.recoveryCodes.join(','), session.userId);

    return NextResponse.json({
      qrCodeDataUrl: setup.qrCodeDataUrl,
      otpauthUrl: setup.otpauthUrl,
      secret: setup.secret,
      recoveryCodes: setup.recoveryCodes,
    });
  } catch (err) {
    console.error('[2fa.setup]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
