import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { db, sqlite } from '@/lib/db';
import { users, organizations, org_members } from '@/lib/db/schema';
import { setSessionCookie, createSessionRow } from '@/lib/auth';
import { nanoid, slugify } from '@/lib/utils';
import { sendVerificationEmail } from '@/lib/email';
import { audit } from '@/lib/audit';
import { publishEvent } from '@/lib/webhooks';
import { rateLimitByIp, getClientIp } from '@/lib/rate-limit';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const limit = await rateLimitByIp('signup', 5, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again shortly.' },
        {
          status: 429,
          headers: { 'Retry-After': Math.ceil(limit.resetIn / 1000).toString() },
        },
      );
    }

    const body = await request.json() as {
      name: string;
      email: string;
      password: string;
      orgName: string;
    };
    const { name, email, password, orgName } = body;

    if (!name || !email || !password || !orgName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await db.select().from(users).where(eq(users.email, email)).get();
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const password_hash = await hash(password, 12);
    const userId = nanoid();
    const orgId = nanoid();
    const now = new Date().toISOString();

    // Create a unique slug
    let slug = slugify(orgName);
    const existing_org = await db.select().from(organizations).where(eq(organizations.slug, slug)).get();
    if (existing_org) {
      slug = `${slug}-${nanoid(6)}`;
    }

    // Create user
    await db.insert(users).values({
      id: userId,
      email,
      password_hash,
      name,
      created_at: now,
    });

    // Create org
    await db.insert(organizations).values({
      id: orgId,
      name: orgName,
      slug,
      plan: 'starter',
      created_at: now,
    });

    // Create owner membership
    await db.insert(org_members).values({
      org_id: orgId,
      user_id: userId,
      role: 'owner',
      created_at: now,
    });

    // Create email verification token (24h expiry)
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    sqlite
      .prepare(
        `INSERT INTO email_verifications (token, user_id, expires_at, used_at, created_at) VALUES (?, ?, ?, NULL, ?)`,
      )
      .run(verificationToken, userId, verificationExpires, now);

    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (err) {
      console.error('[signup] verification email failed', err);
    }

    try {
      await audit({
        action: 'user.signup',
        actorUserId: userId,
        orgId,
        metadata: { email },
      });
    } catch (err) {
      console.error('[signup] audit failed', err);
    }

    const ip = await getClientIp();
    const userAgent = request.headers.get('user-agent');
    const sessionId = createSessionRow({
      userId,
      ip: ip === 'unknown' ? null : ip,
      userAgent,
    });

    await setSessionCookie({ userId, orgId, email, sessionId });

    // Emit outbound webhook events (no-op until the org configures an endpoint).
    publishEvent({ orgId, type: 'org.created', data: { id: orgId, name: orgName, slug } });
    publishEvent({ orgId, type: 'user.created', data: { id: userId, email, name } });

    return NextResponse.json({ userId, orgId, email }, { status: 201 });
  } catch (err) {
    console.error('[signup]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
