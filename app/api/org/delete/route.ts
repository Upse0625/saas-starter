import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db, sqlite } from '@/lib/db';
import { organizations, org_members } from '@/lib/db/schema';
import { getSession, setSessionCookie, clearSessionCookie, createSessionRow } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface DeleteBody {
  confirm?: string;
}

interface OrgMemberRow {
  org_id: string;
  created_at: string;
}

/**
 * POST /api/org/delete
 *
 * Owner-only. Requires the org name typed back in `confirm`. Cascades the
 * delete across all org-scoped tables inside a single transaction, then
 * resolves the caller's session:
 *  - if they belong to another org, switch the session into it ('switched')
 *  - otherwise clear the session and ask the client to redirect ('logout')
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const callerMembership = await db
    .select()
    .from(org_members)
    .where(and(eq(org_members.org_id, session.orgId), eq(org_members.user_id, session.userId)))
    .get();

  if (!callerMembership || callerMembership.role !== 'owner') {
    return NextResponse.json({ error: 'Only the organization owner can delete it.' }, { status: 403 });
  }

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.orgId))
    .get();

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as DeleteBody;
  if (!body.confirm || body.confirm.trim() !== org.name) {
    return NextResponse.json(
      { error: 'Type the organization name exactly to confirm.' },
      { status: 400 },
    );
  }

  const orgId = session.orgId;

  // Audit BEFORE deletion — the org row still exists to satisfy the FK on
  // audit_logs.org_id, and the rows we delete below leave the audit intact.
  await audit({
    action: 'org.updated',
    orgId,
    actorUserId: session.userId,
    targetType: 'organization',
    targetId: orgId,
    metadata: { deleted: true, name: org.name },
  }).catch((err) => console.error('[org:delete] audit failed', err));

  // Cascading delete in one transaction. Order matters because of FKs:
  // remove child rows that reference the org (and audit_logs which we keep
  // only for OTHER orgs — this org's logs go too) before the org row itself.
  const cascade = sqlite.transaction((id: string) => {
    sqlite.prepare('DELETE FROM org_members WHERE org_id = ?').run(id);
    sqlite.prepare('DELETE FROM invitations WHERE org_id = ?').run(id);
    sqlite.prepare('DELETE FROM api_keys WHERE org_id = ?').run(id);
    sqlite.prepare('DELETE FROM audit_logs WHERE org_id = ?').run(id);
    sqlite.prepare('DELETE FROM organizations WHERE id = ?').run(id);
  });
  cascade(orgId);

  // Resolve the caller's session: if the deleted org was their active one,
  // move them into another org they belong to, or log them out.
  if (session.orgId === orgId) {
    const nextMembership = sqlite
      .prepare('SELECT org_id, created_at FROM org_members WHERE user_id = ? ORDER BY created_at ASC LIMIT 1')
      .get(session.userId) as OrgMemberRow | undefined;

    if (nextMembership) {
      const h = await headers();
      const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
      const ua = h.get('user-agent') ?? null;
      const sessionId = createSessionRow({ userId: session.userId, ip, userAgent: ua });
      await setSessionCookie({
        userId: session.userId,
        orgId: nextMembership.org_id,
        email: session.email,
        sessionId,
      });
      return NextResponse.json({ ok: true, action: 'switched', orgId: nextMembership.org_id });
    }

    await clearSessionCookie();
    return NextResponse.json({ ok: true, action: 'logout', redirect: '/signup' });
  }

  return NextResponse.json({ ok: true, action: 'none' });
}
