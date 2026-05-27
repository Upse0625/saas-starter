import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invitations, org_members } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/org/invitations/[id]
 *
 * Revoke (delete) a pending invitation belonging to the caller's org.
 * Owner/admin only. Already-accepted invitations cannot be revoked.
 *
 * No new audit action type is introduced — the AuditAction union is fixed and
 * none of the existing entries cleanly fit "invitation revoked", so audit is
 * intentionally skipped here.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Invitation ID required' }, { status: 400 });
  }

  // Owner/admin only.
  const callerMembership = await db
    .select()
    .from(org_members)
    .where(and(eq(org_members.org_id, session.orgId), eq(org_members.user_id, session.userId)))
    .get();

  if (!callerMembership || callerMembership.role === 'member') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const invite = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.org_id, session.orgId)))
    .get();

  if (!invite) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: 'This invitation has already been accepted.' }, { status: 409 });
  }

  await db
    .delete(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.org_id, session.orgId)));

  return NextResponse.json({ ok: true });
}
