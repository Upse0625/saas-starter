import { NextResponse } from 'next/server';
import { sqlite } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { retryDelivery } from '@/lib/webhooks';

export const dynamic = 'force-dynamic';

interface DeliveryRow {
  id: string;
  org_id: string;
}

interface MemberRow {
  role: 'owner' | 'admin' | 'member';
}

interface UpdatedDeliveryRow {
  id: string;
  endpoint_id: string;
  event_type: string;
  status: 'pending' | 'success' | 'failed';
  status_code: number | null;
  attempts: number;
  created_at: string;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  error: string | null;
  payload: string;
  response_body: string | null;
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const member = sqlite
    .prepare(`SELECT role FROM org_members WHERE org_id = ? AND user_id = ?`)
    .get(session.orgId, session.userId) as MemberRow | undefined;
  if (!member || member.role === 'member') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { id } = await params;
  const row = sqlite
    .prepare(`SELECT id, org_id FROM webhook_deliveries WHERE id = ?`)
    .get(id) as DeliveryRow | undefined;
  if (!row || row.org_id !== session.orgId) {
    return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
  }

  try {
    await retryDelivery(id);

    const updated = sqlite
      .prepare(
        `SELECT id, endpoint_id, event_type, status, status_code, attempts, created_at,
                last_attempt_at, next_retry_at, error, payload, response_body
         FROM webhook_deliveries WHERE id = ?`,
      )
      .get(id) as UpdatedDeliveryRow | undefined;

    return NextResponse.json({ delivery: updated });
  } catch (err) {
    console.error('[webhooks:deliveries:retry]', err);
    return NextResponse.json({ error: 'Failed to retry delivery' }, { status: 500 });
  }
}
