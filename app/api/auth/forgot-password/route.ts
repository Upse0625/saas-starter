import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db, sqlite } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { sendPasswordResetEmail } from '@/lib/email';
import { audit } from '@/lib/audit';
import { rateLimitByIp } from '@/lib/rate-limit';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const limit = await rateLimitByIp('forgot', 3, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { ok: true },
        {
          status: 200,
          headers: { 'Retry-After': Math.ceil(limit.resetIn / 1000).toString() },
        },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      // Still return ok so we don't leak validation specifics.
      return NextResponse.json({ ok: true });
    }

    const user = await db.select().from(users).where(eq(users.email, email)).get();

    if (user) {
      const token = randomBytes(32).toString('hex');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour

      sqlite
        .prepare(
          `INSERT INTO password_resets (token, user_id, expires_at, used_at, created_at) VALUES (?, ?, ?, NULL, ?)`,
        )
        .run(token, user.id, expiresAt, now.toISOString());

      try {
        await sendPasswordResetEmail(user.email, token);
      } catch (err) {
        console.error('[forgot-password] email failed', err);
      }

      try {
        await audit({
          action: 'user.password_reset_requested',
          actorUserId: user.id,
          metadata: { email: user.email },
        });
      } catch (err) {
        console.error('[forgot-password] audit failed', err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[forgot-password]', err);
    // Even on internal errors, do not leak — return ok.
    return NextResponse.json({ ok: true });
  }
}
