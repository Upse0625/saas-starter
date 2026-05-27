import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface DeliveryRow {
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

const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const endpointId = searchParams.get('endpoint_id');
    const rawLimit = Number(searchParams.get('limit'));
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), MAX_LIMIT) : MAX_LIMIT;

    let rows: DeliveryRow[];
    if (endpointId) {
      rows = sqlite
        .prepare(
          `SELECT id, endpoint_id, event_type, status, status_code, attempts, created_at,
                  last_attempt_at, next_retry_at, error, payload, response_body
           FROM webhook_deliveries
           WHERE org_id = ? AND endpoint_id = ?
           ORDER BY created_at DESC
           LIMIT ?`,
        )
        .all(session.orgId, endpointId, limit) as DeliveryRow[];
    } else {
      rows = sqlite
        .prepare(
          `SELECT id, endpoint_id, event_type, status, status_code, attempts, created_at,
                  last_attempt_at, next_retry_at, error, payload, response_body
           FROM webhook_deliveries
           WHERE org_id = ?
           ORDER BY created_at DESC
           LIMIT ?`,
        )
        .all(session.orgId, limit) as DeliveryRow[];
    }

    return NextResponse.json({ deliveries: rows });
  } catch (err) {
    console.error('[webhooks:deliveries:get]', err);
    return NextResponse.json({ error: 'Failed to load deliveries' }, { status: 500 });
  }
}
