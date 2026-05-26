import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { db, sqlite } from '@/lib/db';
import { users, org_members } from '@/lib/db/schema';
import { setSessionCookie, createSessionRow } from '@/lib/auth';
import { rateLimitByIp, getClientIp } from '@/lib/rate-limit';
import { audit } from '@/lib/audit';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const limit = await rateLimitByIp('login', 10, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${Math.ceil(limit.resetIn / 1000)}s.` },
        { status: 429 },
      );
    }

    const body = await request.json() as { email: string; password: string };
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await db.select().from(users).where(eq(users.email, email)).get();
    if (!user) {
      await audit({ action: 'user.login_failed', metadata: { email } });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await compare(password, user.password_hash);
    if (!valid) {
      await audit({ action: 'user.login_failed', actorUserId: user.id, metadata: { email } });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // 2FA gate — issue a short-lived pending token instead of a session.
    const totpEnabledRow = sqlite.prepare(
      'SELECT totp_enabled FROM users WHERE id = ?',
    ).get(user.id) as { totp_enabled: number } | undefined;

    if (totpEnabledRow?.totp_enabled === 1) {
      const token = randomBytes(16).toString('hex');
      const now = new Date();
      const expires = new Date(now.getTime() + 5 * 60 * 1000);
      sqlite.prepare(`
        INSERT INTO pending_2fa (token, user_id, expires_at, created_at)
        VALUES (?, ?, ?, ?)
      `).run(token, user.id, expires.toISOString(), now.toISOString());

      return NextResponse.json({ requires2fa: true, token });
    }

    // Get primary org (the one where user is owner, or the first they belong to)
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
      action: 'user.login',
      orgId: membership.org_id,
      actorUserId: user.id,
    });

    return NextResponse.json({ userId: user.id, orgId: membership.org_id, email: user.email });
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
