import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { sqlite } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { audit } from '@/lib/audit';

interface SessionRow {
  id: string;
  user_id: string;
  ip: string | null;
  user_agent: string | null;
  last_active_at: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = sqlite.prepare(`
    SELECT id, user_id, ip, user_agent, last_active_at, expires_at, revoked_at, created_at
    FROM sessions
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(session.userId) as SessionRow[];

  return NextResponse.json({
    sessions: rows.map(r => ({
      id: r.id,
      ip: r.ip,
      user_agent: r.user_agent,
      last_active_at: r.last_active_at,
      expires_at: r.expires_at,
      revoked_at: r.revoked_at,
      created_at: r.created_at,
      current: session.sessionId === r.id,
    })),
    currentSessionId: session.sessionId ?? null,
  });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { id?: string } = {};
  try {
    body = await request.json() as { id?: string };
  } catch {
    // Allow ?id= query param fallback
  }

  let targetId = body.id;
  if (!targetId) {
    const { searchParams } = new URL(request.url);
    targetId = searchParams.get('id') ?? undefined;
  }
  if (!targetId) {
    return NextResponse.json({ error: 'Session id is required' }, { status: 400 });
  }

  const row = sqlite.prepare(
    'SELECT id, user_id, revoked_at FROM sessions WHERE id = ?',
  ).get(targetId) as { id: string; user_id: string; revoked_at: string | null } | undefined;

  if (!row || row.user_id !== session.userId) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (row.revoked_at) {
    return NextResponse.json({ ok: true, alreadyRevoked: true });
  }

  if (session.sessionId && row.id === session.sessionId) {
    return NextResponse.json(
      { error: 'Cannot revoke your current session. Sign out instead.' },
      { status: 400 },
    );
  }

  sqlite.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?')
    .run(new Date().toISOString(), row.id);

  await audit({
    action: 'session.revoked',
    orgId: session.orgId,
    actorUserId: session.userId,
    targetType: 'session',
    targetId: row.id,
  });

  return NextResponse.json({ ok: true });
}
