import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { sqlite } from '@/lib/db';
import { WEBHOOK_EVENTS } from '@/lib/webhooks';
import WebhooksClient from './WebhooksClient';

export const dynamic = 'force-dynamic';

interface EndpointRow {
  id: string;
  url: string;
  description: string | null;
  events: string;
  enabled: number;
  created_at: string;
}

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

interface MemberRow {
  role: 'owner' | 'admin' | 'member';
}

export default async function WebhooksPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const member = sqlite
    .prepare('SELECT role FROM org_members WHERE org_id = ? AND user_id = ?')
    .get(session.orgId, session.userId) as MemberRow | undefined;
  const canManage = !!member && member.role !== 'member';

  const endpoints = sqlite
    .prepare(
      `SELECT id, url, description, events, enabled, created_at
       FROM webhook_endpoints
       WHERE org_id = ?
       ORDER BY created_at DESC`,
    )
    .all(session.orgId) as EndpointRow[];

  const deliveries = sqlite
    .prepare(
      `SELECT id, endpoint_id, event_type, status, status_code, attempts, created_at,
              last_attempt_at, next_retry_at, error, payload, response_body
       FROM webhook_deliveries
       WHERE org_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
    )
    .all(session.orgId) as DeliveryRow[];

  return (
    <div>
      <div className="mb-8 anim-fade-up delay-0">
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
          Settings · Webhooks
        </p>
        <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
          Webhooks
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
          Get notified about events in your organization by sending signed HTTP requests to your
          endpoints.
        </p>
      </div>

      <WebhooksClient
        initialEndpoints={endpoints}
        initialDeliveries={deliveries}
        availableEvents={WEBHOOK_EVENTS as readonly string[] as string[]}
        canManage={canManage}
      />
    </div>
  );
}
