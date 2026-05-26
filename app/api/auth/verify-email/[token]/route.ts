import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/lib/db';
import { audit } from '@/lib/audit';

interface VerificationRow {
  token: string;
  user_id: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid verification link' }, { status: 400 });
    }

    const row = sqlite
      .prepare(
        `SELECT token, user_id, expires_at, used_at, created_at FROM email_verifications WHERE token = ?`,
      )
      .get(token) as VerificationRow | undefined;

    if (!row) {
      return NextResponse.json({ error: 'Verification link is invalid' }, { status: 404 });
    }

    if (row.used_at) {
      return NextResponse.json({ error: 'Verification link has already been used' }, { status: 410 });
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Verification link has expired' }, { status: 410 });
    }

    const now = new Date().toISOString();

    sqlite
      .prepare(`UPDATE email_verifications SET used_at = ? WHERE token = ?`)
      .run(now, token);

    sqlite
      .prepare(`UPDATE users SET email_verified_at = ? WHERE id = ?`)
      .run(now, row.user_id);

    try {
      await audit({ action: 'user.email_verified', actorUserId: row.user_id });
    } catch (err) {
      console.error('[verify-email] audit failed', err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[verify-email]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
