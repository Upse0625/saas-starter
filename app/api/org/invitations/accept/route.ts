import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { invitations, org_members } from '@/lib/db/schema';
import { getSession, setSessionCookie, createSessionRow } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'You must be signed in to accept an invitation.' }, { status: 401 });
  }

  const { token } = (await request.json()) as { token?: string };
  if (!token) {
    return NextResponse.json({ error: 'Missing invitation token.' }, { status: 400 });
  }

  const invite = await db.select().from(invitations).where(eq(invitations.token, token)).get();
  if (!invite) {
    return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: 'This invitation has already been used.' }, { status: 409 });
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 });
  }

  // Add the user to the org if they're not already a member.
  const existing = await db
    .select()
    .from(org_members)
    .where(and(eq(org_members.org_id, invite.org_id), eq(org_members.user_id, session.userId)))
    .get();

  if (!existing) {
    await db.insert(org_members).values({
      org_id: invite.org_id,
      user_id: session.userId,
      role: invite.role,
      created_at: new Date().toISOString(),
    });
  }

  // Burn the invitation.
  await db
    .update(invitations)
    .set({ accepted_at: new Date().toISOString() })
    .where(eq(invitations.id, invite.id));

  // Switch the user's active session into the joined org.
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
  const ua = h.get('user-agent') ?? null;
  const sessionId = createSessionRow({ userId: session.userId, ip, userAgent: ua });
  await setSessionCookie({
    userId: session.userId,
    orgId: invite.org_id,
    email: session.email,
    sessionId,
  });

  audit({
    action: 'org.member_joined',
    orgId: invite.org_id,
    actorUserId: session.userId,
    targetType: 'user',
    targetId: session.userId,
    metadata: { role: invite.role, alreadyMember: !!existing },
  }).catch((err) => console.error('[invite accept] audit failed', err));

  return NextResponse.json({ ok: true });
}
