import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { sqlite } from '@/lib/db';
import { audit } from '@/lib/audit';
import { rateLimitByIp } from '@/lib/rate-limit';

interface ResetRow {
  token: string;
  user_id: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export async function POST(request: NextRequest) {
  try {
    const limit = await rateLimitByIp('reset-password', 10, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again shortly.' },
        {
          status: 429,
          headers: { 'Retry-After': Math.ceil(limit.resetIn / 1000).toString() },
        },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      token?: string;
      password?: string;
    };
    const token = typeof body.token === 'string' ? body.token : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!token) {
      return NextResponse.json({ error: 'Reset token is required' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    const row = sqlite
      .prepare(
        `SELECT token, user_id, expires_at, used_at, created_at FROM password_resets WHERE token = ?`,
      )
      .get(token) as ResetRow | undefined;

    if (!row) {
      return NextResponse.json({ error: 'Reset link is invalid' }, { status: 404 });
    }

    if (row.used_at) {
      return NextResponse.json({ error: 'Reset link has already been used' }, { status: 410 });
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Reset link has expired' }, { status: 410 });
    }

    const password_hash = await hash(password, 12);
    const now = new Date().toISOString();

    sqlite
      .prepare(`UPDATE users SET password_hash = ? WHERE id = ?`)
      .run(password_hash, row.user_id);

    sqlite
      .prepare(`UPDATE password_resets SET used_at = ? WHERE token = ?`)
      .run(now, token);

    try {
      await audit({ action: 'user.password_reset', actorUserId: row.user_id });
    } catch (err) {
      console.error('[reset-password] audit failed', err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[reset-password]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
