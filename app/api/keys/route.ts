import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { generateKey } from '@/lib/api-key';
import { audit } from '@/lib/audit';
import { nanoid } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keys = sqlite.prepare(`
    SELECT id, name, key_prefix, last_used_at, created_at, revoked_at
    FROM api_keys
    WHERE org_id = ?
    ORDER BY created_at DESC
  `).all(session.orgId) as ApiKeyRow[];

  return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawName = typeof body.name === 'string' ? body.name.trim() : '';
  if (rawName.length < 1 || rawName.length > 100) {
    return NextResponse.json(
      { error: 'Name is required (1-100 characters)' },
      { status: 400 },
    );
  }

  const id = nanoid();
  const { full, prefix, hash } = generateKey();
  const createdAt = new Date().toISOString();

  sqlite.prepare(`
    INSERT INTO api_keys (id, org_id, created_by_user_id, name, key_hash, key_prefix, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, session.orgId, session.userId, rawName, hash, prefix, createdAt);

  await audit({
    action: 'api_key.created',
    orgId: session.orgId,
    actorUserId: session.userId,
    targetType: 'api_key',
    targetId: id,
    metadata: { name: rawName, prefix },
  });

  return NextResponse.json({ id, name: rawName, key: full }, { status: 201 });
}
