import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invitations, org_members, organizations } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { nanoid } from '@/lib/utils';
import { audit } from '@/lib/audit';
import { sendInviteEmail } from '@/lib/email';
import { rateLimitByIp } from '@/lib/rate-limit';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const limit = await rateLimitByIp('invite', 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many invitation requests. Please try again shortly.' },
      {
        status: 429,
        headers: { 'Retry-After': Math.ceil(limit.resetIn / 1000).toString() },
      },
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { email: string; role: 'admin' | 'member' };
  const { email, role } = body;

  if (!email || !role) {
    return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
  }

  // Check caller permissions
  const callerMembership = await db
    .select()
    .from(org_members)
    .where(and(eq(org_members.org_id, session.orgId), eq(org_members.user_id, session.userId)))
    .get();

  if (!callerMembership || callerMembership.role === 'member') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.orgId))
    .get();

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const token = nanoid(32);
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const inviteId = nanoid();
  await db.insert(invitations).values({
    id: inviteId,
    org_id: session.orgId,
    email,
    role,
    token,
    expires_at: expires.toISOString(),
    created_at: now.toISOString(),
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/invite/${token}`;

  // Sends a real email when RESEND_API_KEY is set; logs to the console otherwise.
  sendInviteEmail(email, org.name, token, session.email).catch((err) => {
    console.error('[invitations] email send failed', err);
  });

  audit({
    action: 'org.member_invited',
    orgId: session.orgId,
    actorUserId: session.userId,
    targetType: 'email',
    targetId: email,
    metadata: { role, inviteId },
  }).catch((err) => {
    console.error('[invitations] audit failed', err);
  });

  return NextResponse.json({ ok: true, inviteId, inviteUrl });
}
