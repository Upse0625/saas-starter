import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { sqlite } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { rateLimitByKey } from '@/lib/rate-limit';

interface DisableBody { password: string }

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = rateLimitByKey('2fa-disable', session.userId, 10, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${Math.ceil(limit.resetIn / 1000)}s.` },
        { status: 429 },
      );
    }

    const body = await request.json() as DisableBody;
    const password = body.password;
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const row = sqlite.prepare(
      'SELECT password_hash FROM users WHERE id = ?',
    ).get(session.userId) as { password_hash: string } | undefined;

    if (!row) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const ok = await compare(password, row.password_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    sqlite.prepare(`
      UPDATE users
      SET totp_secret = NULL, totp_enabled = 0, totp_recovery_codes = NULL
      WHERE id = ?
    `).run(session.userId);

    await audit({
      action: 'user.2fa_disabled',
      orgId: session.orgId,
      actorUserId: session.userId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[2fa.disable]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
