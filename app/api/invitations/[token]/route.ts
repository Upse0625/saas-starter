import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invitations, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/invitations/[token]
 *
 * Returns the public details of an invitation so the /invite page can render
 * the right state. The token is treated as a *read* bearer credential here —
 * knowing the token lets you see what org/role the invite is for, but it does
 * NOT let you join (that requires an email-matched, authenticated accept).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const invite = await db.select().from(invitations).where(eq(invitations.token, token)).get();

    if (!invite) {
      return NextResponse.json(
        { valid: false, reason: 'not_found', error: 'This invitation link is invalid.' },
        { status: 404 },
      );
    }

    if (invite.accepted_at) {
      return NextResponse.json(
        { valid: false, reason: 'accepted', error: 'This invitation has already been accepted.' },
        { status: 409 },
      );
    }

    if (invite.declined_at) {
      return NextResponse.json(
        { valid: false, reason: 'declined', error: 'This invitation was declined.' },
        { status: 409 },
      );
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { valid: false, reason: 'expired', error: 'This invitation has expired.' },
        { status: 410 },
      );
    }

    const org = await db.select().from(organizations).where(eq(organizations.id, invite.org_id)).get();

    return NextResponse.json({
      valid: true,
      orgName: org?.name ?? 'an organization',
      role: invite.role,
      email: invite.email,
      expiresAt: invite.expires_at,
    });
  } catch (err) {
    console.error('[invitations:get]', err);
    return NextResponse.json({ valid: false, reason: 'error', error: 'Internal server error' }, { status: 500 });
  }
}
