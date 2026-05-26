import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getSession } from '@/lib/auth';
import { listAuditLogs } from '@/lib/audit';

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 100;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = Number(searchParams.get('limit') ?? DEFAULT_LIMIT);
  const rawOffset = Number(searchParams.get('offset') ?? 0);

  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, Math.floor(rawLimit)), MAX_LIMIT) : DEFAULT_LIMIT;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0;

  const entries = listAuditLogs(session.orgId, limit, offset);

  return NextResponse.json({ entries });
}
