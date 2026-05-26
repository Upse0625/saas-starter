import { NextRequest, NextResponse } from 'next/server';
import { db, sqlite } from '@/lib/db';
import { users, org_members } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { setSessionCookie, createSessionRow } from '@/lib/auth';
import { verifyTotpCode, consumeRecoveryCode } from '@/lib/totp';
import { rateLimitByIp, getClientIp } from '@/lib/rate-limit';
import { audit } from '@/lib/audit';

interface ChallengeBody {
  token: string;
  code: string;
}

interface PendingRow {
  token: string;
  user_id: string;
  expires_at: string;
}

export async function POST(request: NextRequest) {
  try {
    const limit = await rateLimitByIp('2fa', 10, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${Math.ceil(limit.resetIn / 1000)}s.` },
        { status: 429 },
      );
    }

    const body = await request.json() as ChallengeBody;
    const { token, code } = body;

    if (!token || !code) {
      return NextResponse.json({ error: 'Token and code are required' }, { status: 400 });
    }

    const pending = sqlite.prepare(
      'SELECT token, user_id, expires_at FROM pending_2fa WHERE token = ?',
    ).get(token) as PendingRow | undefined;

    if (!pending) {
      return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 400 });
    }

    if (new Date(pending.expires_at).getTime() < Date.now()) {
      sqlite.prepare('DELETE FROM pending_2fa WHERE token = ?').run(token);
      return NextResponse.json({ error: 'Challenge expired. Please sign in again.' }, { status: 400 });
    }

    const user = await db.select().from(users).where(eq(users.id, pending.user_id)).get();
    if (!user || !user.totp_secret) {
      sqlite.prepare('DELETE FROM pending_2fa WHERE token = ?').run(token);
      return NextResponse.json({ error: 'Invalid challenge state' }, { status: 400 });
    }

    let method: 'totp' | 'recovery' | null = null;

    const trimmed = code.trim();
    if (verifyTotpCode(trimmed, user.totp_secret)) {
      method = 'totp';
    } else if (user.totp_recovery_codes) {
      const result = consumeRecoveryCode(user.totp_recovery_codes, trimmed);
      if (result.ok) {
        method = 'recovery';
        sqlite.prepare('UPDATE users SET totp_recovery_codes = ? WHERE id = ?')
          .run(result.remaining, user.id);
      }
    }

    if (!method) {
      await audit({
        action: 'user.login_failed',
        actorUserId: user.id,
        metadata: { reason: '2fa_invalid' },
      });
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 });
    }

    // Burn the pending challenge
    sqlite.prepare('DELETE FROM pending_2fa WHERE token = ?').run(token);

    // Resolve org membership for the session
    const membership = await db
      .select()
      .from(org_members)
      .where(eq(org_members.user_id, user.id))
      .get();

    if (!membership) {
      return NextResponse.json({ error: 'No organization found for this user' }, { status: 404 });
    }

    const ip = await getClientIp();
    const userAgent = request.headers.get('user-agent');
    const sessionId = createSessionRow({
      userId: user.id,
      ip: ip === 'unknown' ? null : ip,
      userAgent,
    });

    await setSessionCookie({
      userId: user.id,
      orgId: membership.org_id,
      email: user.email,
      sessionId,
    });

    await audit({
      action: 'user.2fa_challenge',
      orgId: membership.org_id,
      actorUserId: user.id,
      metadata: { method },
    });
    await audit({
      action: 'user.login',
      orgId: membership.org_id,
      actorUserId: user.id,
      metadata: { via: '2fa' },
    });

    return NextResponse.json({
      userId: user.id,
      orgId: membership.org_id,
      email: user.email,
      method,
    });
  } catch (err) {
    console.error('[2fa.challenge]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
