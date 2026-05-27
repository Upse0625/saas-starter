import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { sqlite } from '@/lib/db';
import { getSession, setSessionCookie } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';

interface EmailBody {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as EmailBody;
    const email = body.email?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    if (email === session.email.toLowerCase()) {
      return NextResponse.json({ error: 'That is already your email address' }, { status: 400 });
    }

    // Uniqueness check (exclude the current user).
    const existing = sqlite
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .get(email, session.userId) as { id: string } | undefined;
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const now = new Date().toISOString();

    // Update email and clear verification.
    sqlite
      .prepare('UPDATE users SET email = ?, email_verified_at = NULL WHERE id = ?')
      .run(email, session.userId);

    // Issue a fresh verification token (24h expiry), mirroring signup.
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    sqlite
      .prepare(
        `INSERT INTO email_verifications (token, user_id, expires_at, used_at, created_at) VALUES (?, ?, ?, NULL, ?)`,
      )
      .run(verificationToken, session.userId, verificationExpires, now);

    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (err) {
      console.error('[profile.email] verification email failed', err);
    }

    // Refresh the session cookie with the new email (same user/org/session).
    await setSessionCookie({
      userId: session.userId,
      orgId: session.orgId,
      email,
      sessionId: session.sessionId,
    });

    return NextResponse.json({ ok: true, email });
  } catch (err) {
    console.error('[profile.email]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
