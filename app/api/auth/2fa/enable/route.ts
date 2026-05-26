import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { verifyTotpCode } from '@/lib/totp';
import { audit } from '@/lib/audit';
import { rateLimitByKey } from '@/lib/rate-limit';

interface EnableBody { code: string }

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = rateLimitByKey('2fa-enable', session.userId, 10, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${Math.ceil(limit.resetIn / 1000)}s.` },
        { status: 429 },
      );
    }

    const body = await request.json() as EnableBody;
    const code = body.code?.trim();
    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    const row = sqlite.prepare(
      'SELECT totp_secret, totp_enabled FROM users WHERE id = ?',
    ).get(session.userId) as { totp_secret: string | null; totp_enabled: number } | undefined;

    if (!row || !row.totp_secret) {
      return NextResponse.json(
        { error: 'No 2FA setup in progress. Start setup first.' },
        { status: 400 },
      );
    }

    if (row.totp_enabled === 1) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });
    }

    if (!verifyTotpCode(code, row.totp_secret)) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    sqlite.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').run(session.userId);

    await audit({
      action: 'user.2fa_enabled',
      orgId: session.orgId,
      actorUserId: session.userId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[2fa.enable]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
