import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { organizations, org_members, invitations, users } from '@/lib/db/schema';
import { eq, and, isNull, gt, sql } from 'drizzle-orm';
import MembersClient from './MembersClient';

export default async function MembersPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.orgId))
    .get();

  const membership = await db
    .select()
    .from(org_members)
    .where(and(eq(org_members.org_id, session.orgId), eq(org_members.user_id, session.userId)))
    .get();

  if (!org || !membership) redirect('/login');

  const members = await db
    .select({
      id: org_members.id,
      role: org_members.role,
      created_at: org_members.created_at,
      user_id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
    })
    .from(org_members)
    .innerJoin(users, eq(org_members.user_id, users.id))
    .where(eq(org_members.org_id, session.orgId))
    .all();

  // Pending invitations: not accepted, not declined, not expired.
  // Expiry is filtered in SQL (against the DB clock) to keep render pure.
  const pendingInvites = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      token: invitations.token,
      expires_at: invitations.expires_at,
      created_at: invitations.created_at,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.org_id, session.orgId),
        isNull(invitations.accepted_at),
        isNull(invitations.declined_at),
        gt(invitations.expires_at, sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`),
      ),
    )
    .all();

  const canManage = membership.role === 'owner' || membership.role === 'admin';

  return (
    <div>
      <div className="mb-8 anim-fade-up delay-0">
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
          Settings · Members
        </p>
        <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
          Team members
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
          Manage your organization&apos;s members and invite new ones.
        </p>
      </div>

      <MembersClient
        initialMembers={members}
        initialInvitations={pendingInvites}
        currentUserId={session.userId}
        canManage={canManage}
        orgPlan={org.plan}
      />
    </div>
  );
}
