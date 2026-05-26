import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { sqlite } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
import { rateLimitByKey } from '@/lib/rate-limit';

interface UserRow {
  id: string;
  email: string;
  email_verified_at: string | null;
}

export async function POST(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Throttle: max 1 resend per minute per user.
    const limit = rateLimitByKey('resend-verification', session.userId, 1, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        {
          error: `Please wait ${Math.ceil(limit.resetIn / 1000)}s before requesting another email.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': Math.ceil(limit.resetIn / 1000).toString() },
        },
      );
    }

    const userRow = sqlite
      .prepare(`SELECT id, email, email_verified_at FROM users WHERE id = ?`)
      .get(session.userId) as UserRow | undefined;

    if (!userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userRow.email_verified_at) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const token = randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    sqlite
      .prepare(
        `INSERT INTO email_verifications (token, user_id, expires_at, used_at, created_at) VALUES (?, ?, ?, NULL, ?)`,
      )
      .run(token, userRow.id, expiresAt, now.toISOString());

    try {
      await sendVerificationEmail(userRow.email, token);
    } catch (err) {
      console.error('[resend-verification] email failed', err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[resend-verification]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
