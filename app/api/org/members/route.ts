import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { org_members, users } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const members = await db
    .select({
      id: org_members.id,
      role: org_members.role,
      created_at: org_members.created_at,
      user_id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(org_members)
    .innerJoin(users, eq(org_members.user_id, users.id))
    .where(eq(org_members.org_id, session.orgId))
    .all();

  return NextResponse.json({ members });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { id?: number; role?: 'admin' | 'member' };
  const memberId = body.id;
  const newRole = body.role;

  if (!memberId || !newRole) {
    return NextResponse.json({ error: 'Member ID and role are required' }, { status: 400 });
  }

  if (newRole !== 'admin' && newRole !== 'member') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Check caller is owner or admin
  const callerMembership = await db
    .select()
    .from(org_members)
    .where(and(eq(org_members.org_id, session.orgId), eq(org_members.user_id, session.userId)))
    .get();

  if (!callerMembership || callerMembership.role === 'member') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Find the target member
  const target = await db
    .select()
    .from(org_members)
    .where(and(eq(org_members.id, Number(memberId)), eq(org_members.org_id, session.orgId)))
    .get();

  if (!target) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Cannot change owner role
  if (target.role === 'owner') {
    return NextResponse.json({ error: 'Cannot change the owner role' }, { status: 403 });
  }

  // Cannot change your own role
  if (target.user_id === session.userId) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 403 });
  }

  const previousRole = target.role;

  if (previousRole === newRole) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  await db
    .update(org_members)
    .set({ role: newRole })
    .where(and(eq(org_members.id, Number(memberId)), eq(org_members.org_id, session.orgId)));

  audit({
    action: 'org.member_role_changed',
    orgId: session.orgId,
    actorUserId: session.userId,
    targetType: 'user',
    targetId: target.user_id,
    metadata: { from: previousRole, to: newRole },
  }).catch((err) => {
    console.error('[members:patch] audit failed', err);
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('id');
  if (!memberId) {
    return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
  }

  // Check caller is owner or admin
  const callerMembership = await db
    .select()
    .from(org_members)
    .where(and(eq(org_members.org_id, session.orgId), eq(org_members.user_id, session.userId)))
    .get();

  if (!callerMembership || callerMembership.role === 'member') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Find the target member
  const target = await db
    .select()
    .from(org_members)
    .where(and(eq(org_members.id, Number(memberId)), eq(org_members.org_id, session.orgId)))
    .get();

  if (!target) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Cannot remove the owner
  if (target.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove the organization owner' }, { status: 403 });
  }

  // Cannot remove yourself
  if (target.user_id === session.userId) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 403 });
  }

  const removedUserId = target.user_id;
  const removedRole = target.role;

  await db
    .delete(org_members)
    .where(and(eq(org_members.id, Number(memberId)), eq(org_members.org_id, session.orgId)));

  audit({
    action: 'org.member_removed',
    orgId: session.orgId,
    actorUserId: session.userId,
    targetType: 'user',
    targetId: removedUserId,
    metadata: { role: removedRole },
  }).catch((err) => {
    console.error('[members:delete] audit failed', err);
  });

  return NextResponse.json({ ok: true });
}
