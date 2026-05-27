import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { WEBHOOK_EVENTS, type WebhookEventType } from '@/lib/webhooks';

export const dynamic = 'force-dynamic';

interface EndpointRow {
  id: string;
  org_id: string;
  url: string;
  description: string | null;
  events: string;
  enabled: number;
  created_at: string;
}

interface MemberRow {
  role: 'owner' | 'admin' | 'member';
}

function isAllowedUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol === 'https:') return true;
  if (parsed.protocol === 'http:') {
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]';
  }
  return false;
}

function normalizeEvents(input: unknown): string | null {
  if (input === '*' || (Array.isArray(input) && input.length === 1 && input[0] === '*')) {
    return '*';
  }
  if (!Array.isArray(input) || input.length === 0) return null;
  const valid = new Set<string>(WEBHOOK_EVENTS as readonly string[]);
  const cleaned: string[] = [];
  for (const e of input) {
    if (typeof e !== 'string') return null;
    if (e === '*') return '*';
    if (!valid.has(e)) return null;
    if (!cleaned.includes(e)) cleaned.push(e as WebhookEventType);
  }
  if (cleaned.length === 0) return null;
  return cleaned.join(',');
}

function requireMutator(orgId: string, userId: string): boolean {
  const member = sqlite
    .prepare(`SELECT role FROM org_members WHERE org_id = ? AND user_id = ?`)
    .get(orgId, userId) as MemberRow | undefined;
  return !!member && member.role !== 'member';
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!requireMutator(session.orgId, session.userId)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { id } = await params;
  const row = sqlite
    .prepare(`SELECT id, org_id, url, description, events, enabled, created_at FROM webhook_endpoints WHERE id = ?`)
    .get(id) as EndpointRow | undefined;
  if (!row || row.org_id !== session.orgId) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  let body: { url?: unknown; description?: unknown; events?: unknown; enabled?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let url = row.url;
  if (body.url !== undefined) {
    const candidate = typeof body.url === 'string' ? body.url.trim() : '';
    if (!candidate || !isAllowedUrl(candidate)) {
      return NextResponse.json(
        { error: 'A valid https URL is required (http is only allowed for localhost)' },
        { status: 400 },
      );
    }
    url = candidate;
  }

  let description = row.description;
  if (body.description !== undefined) {
    description =
      typeof body.description === 'string' && body.description.trim().length > 0
        ? body.description.trim().slice(0, 200)
        : null;
  }

  let events = row.events;
  if (body.events !== undefined) {
    const normalized = normalizeEvents(body.events);
    if (!normalized) {
      return NextResponse.json({ error: 'Select at least one valid event' }, { status: 400 });
    }
    events = normalized;
  }

  let enabled = row.enabled;
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }
    enabled = body.enabled ? 1 : 0;
  }

  try {
    sqlite
      .prepare(
        `UPDATE webhook_endpoints SET url = ?, description = ?, events = ?, enabled = ? WHERE id = ? AND org_id = ?`,
      )
      .run(url, description, events, enabled, id, session.orgId);

    return NextResponse.json({
      id: row.id,
      url,
      description,
      events,
      enabled,
      created_at: row.created_at,
    });
  } catch (err) {
    console.error('[webhooks:patch]', err);
    return NextResponse.json({ error: 'Failed to update endpoint' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!requireMutator(session.orgId, session.userId)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { id } = await params;
  const row = sqlite
    .prepare(`SELECT id, org_id FROM webhook_endpoints WHERE id = ?`)
    .get(id) as Pick<EndpointRow, 'id' | 'org_id'> | undefined;
  if (!row || row.org_id !== session.orgId) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  try {
    const tx = sqlite.transaction(() => {
      sqlite.prepare(`DELETE FROM webhook_deliveries WHERE endpoint_id = ? AND org_id = ?`).run(id, session.orgId);
      sqlite.prepare(`DELETE FROM webhook_endpoints WHERE id = ? AND org_id = ?`).run(id, session.orgId);
    });
    tx();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[webhooks:delete]', err);
    return NextResponse.json({ error: 'Failed to delete endpoint' }, { status: 500 });
  }
}
