import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { invitations, org_members } from '@/lib/db/schema';
import { getSession, setSessionCookie, createSessionRow } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { publishEvent } from '@/lib/webhooks';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * POST /api/invitations/[token]/accept
 *
 * Accepting requires an authenticated user whose email matches the invite.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    // Must be signed in to accept — accepting mutates org membership.
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in to accept an invitation.' },
        { status: 401 },
      );
    }

    const invite = await db.select().from(invitations).where(eq(invitations.token, token)).get();
    if (!invite) {
      return NextResponse.json({ error: 'This invitation link is invalid.' }, { status: 404 });
    }
    if (invite.accepted_at) {
      return NextResponse.json({ error: 'This invitation has already been accepted.' }, { status: 409 });
    }
    if (invite.declined_at) {
      return NextResponse.json({ error: 'This invitation was declined and can no longer be used.' }, { status: 409 });
    }
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 });
    }

    // ─── CRITICAL SECURITY CHECK ──────────────────────────────────────────────
    // An invitation is addressed to a specific email. The token is only a *read*
    // credential; to actually JOIN we additionally require that the signed-in
    // user owns the invited email. Without this, anyone who obtained or guessed
    // a token could join an organization they were never invited to. Compared
    // case-insensitively because email casing is not significant.
    if (session.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        {
          error: `This invitation was sent to ${invite.email}. Sign in with that email address to accept it.`,
        },
        { status: 403 },
      );
    }
    // ──────────────────────────────────────────────────────────────────────────

    // Idempotent membership: if they're already in the org, don't duplicate the row.
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

    // Burn the invitation so the token can't be reused.
    await db
      .update(invitations)
      .set({ accepted_at: new Date().toISOString() })
      .where(eq(invitations.id, invite.id));

    // Switch the user's active session into the org they just joined, so the
    // dashboard reflects the new org immediately. We mint a fresh session row
    // (revocable) and re-issue the cookie with the new orgId.
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
      action: 'org.invitation_accepted',
      orgId: invite.org_id,
      actorUserId: session.userId,
      targetType: 'invitation',
      targetId: invite.id,
      metadata: { role: invite.role, alreadyMember: !!existing },
    }).catch((err) => console.error('[invitations:accept] audit failed', err));

    publishEvent({ orgId: invite.org_id, type: 'member.joined', data: { user_id: session.userId, email: session.email, role: invite.role } });

    return NextResponse.json({
      success: true,
      organization_id: invite.org_id,
      already_member: !!existing,
    });
  } catch (err) {
    console.error('[invitations:accept]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
