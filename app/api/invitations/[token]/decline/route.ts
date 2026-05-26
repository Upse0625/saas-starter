import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invitations } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * POST /api/invitations/[token]/decline
 *
 * Intentionally does NOT require authentication: the person an invite was
 * emailed to may not have (and may not want) an account. Holding the token is
 * sufficient to decline it — declining only sets declined_at and never grants
 * access, so there's no privilege to protect here. We capture the actor's user
 * id only if they happen to be signed in (best-effort, for the audit trail).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const invite = await db.select().from(invitations).where(eq(invitations.token, token)).get();
    if (!invite) {
      return NextResponse.json({ error: 'This invitation link is invalid.' }, { status: 404 });
    }
    if (invite.accepted_at) {
      return NextResponse.json({ error: 'This invitation was already accepted and cannot be declined.' }, { status: 409 });
    }
    if (invite.declined_at) {
      // Idempotent: declining an already-declined invite is a no-op success.
      return NextResponse.json({ success: true, already_declined: true });
    }

    await db
      .update(invitations)
      .set({ declined_at: new Date().toISOString() })
      .where(eq(invitations.id, invite.id));

    const session = await getSession(); // may be null — that's fine
    audit({
      action: 'org.invitation_declined',
      orgId: invite.org_id,
      actorUserId: session?.userId ?? null,
      targetType: 'invitation',
      targetId: invite.id,
      metadata: { email: invite.email, role: invite.role },
    }).catch((err) => console.error('[invitations:decline] audit failed', err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[invitations:decline]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
