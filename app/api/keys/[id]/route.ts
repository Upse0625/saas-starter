import { NextResponse } from 'next/server';
import { sqlite } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface ApiKeyOwnership {
  id: string;
  org_id: string;
  name: string;
  revoked_at: string | null;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Key ID required' }, { status: 400 });
  }

  const row = sqlite.prepare(`
    SELECT id, org_id, name, revoked_at
    FROM api_keys
    WHERE id = ?
  `).get(id) as ApiKeyOwnership | undefined;

  if (!row || row.org_id !== session.orgId) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  }

  if (row.revoked_at) {
    return NextResponse.json({ error: 'Key already revoked' }, { status: 409 });
  }

  const revokedAt = new Date().toISOString();
  sqlite.prepare('UPDATE api_keys SET revoked_at = ? WHERE id = ?').run(revokedAt, id);

  await audit({
    action: 'api_key.revoked',
    orgId: session.orgId,
    actorUserId: session.userId,
    targetType: 'api_key',
    targetId: id,
    metadata: { name: row.name },
  });

  return NextResponse.json({ ok: true, revoked_at: revokedAt });
}
