import { NextResponse } from 'next/server';
import { sqlite } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { retryDelivery } from '@/lib/webhooks';
import { nanoid } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface EndpointRow {
  id: string;
  org_id: string;
  url: string;
}

interface MemberRow {
  role: 'owner' | 'admin' | 'member';
}

interface DeliveryResultRow {
  id: string;
  event_type: string;
  status: 'pending' | 'success' | 'failed';
  status_code: number | null;
  response_body: string | null;
  error: string | null;
  attempts: number;
  created_at: string;
  last_attempt_at: string | null;
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
  const endpoint = sqlite
    .prepare(`SELECT id, org_id, url FROM webhook_endpoints WHERE id = ?`)
    .get(id) as EndpointRow | undefined;
  if (!endpoint || endpoint.org_id !== session.orgId) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  try {
    const deliveryId = `whd_${nanoid()}`;
    const eventId = `evt_${nanoid()}`;
    const createdAt = new Date().toISOString();
    const envelope = JSON.stringify({
      id: eventId,
      type: 'webhook.test',
      created_at: createdAt,
      data: {
        message: 'This is a test event from your dashboard.',
        endpoint_id: endpoint.id,
      },
    });

    sqlite
      .prepare(
        `INSERT INTO webhook_deliveries
           (id, endpoint_id, org_id, event_type, event_id, payload, status, attempts, created_at)
         VALUES (?, ?, ?, 'webhook.test', ?, ?, 'pending', 0, ?)`,
      )
      .run(deliveryId, endpoint.id, session.orgId, eventId, envelope, createdAt);

    // retryDelivery attempts immediately and records the result in the row.
    await retryDelivery(deliveryId);

    const result = sqlite
      .prepare(
        `SELECT id, event_type, status, status_code, response_body, error, attempts, created_at, last_attempt_at
         FROM webhook_deliveries WHERE id = ?`,
      )
      .get(deliveryId) as DeliveryResultRow | undefined;

    return NextResponse.json({ delivery: result });
  } catch (err) {
    console.error('[webhooks:test]', err);
    return NextResponse.json({ error: 'Failed to send test event' }, { status: 500 });
  }
}
