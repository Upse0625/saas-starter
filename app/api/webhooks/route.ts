import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { generateWebhookSecret, WEBHOOK_EVENTS, type WebhookEventType } from '@/lib/webhooks';
import { nanoid } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface EndpointListRow {
  id: string;
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
  // Allow http only for localhost (local development/testing).
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

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const endpoints = sqlite
      .prepare(
        `SELECT id, url, description, events, enabled, created_at
         FROM webhook_endpoints
         WHERE org_id = ?
         ORDER BY created_at DESC`,
      )
      .all(session.orgId) as EndpointListRow[];

    return NextResponse.json({ endpoints });
  } catch (err) {
    console.error('[webhooks:get]', err);
    return NextResponse.json({ error: 'Failed to load webhook endpoints' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Owner/admin only for mutations.
  const member = sqlite
    .prepare(`SELECT role FROM org_members WHERE org_id = ? AND user_id = ?`)
    .get(session.orgId, session.userId) as MemberRow | undefined;
  if (!member || member.role === 'member') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  let body: { url?: unknown; description?: unknown; events?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url || !isAllowedUrl(url)) {
    return NextResponse.json(
      { error: 'A valid https URL is required (http is only allowed for localhost)' },
      { status: 400 },
    );
  }

  const description =
    typeof body.description === 'string' && body.description.trim().length > 0
      ? body.description.trim().slice(0, 200)
      : null;

  const events = normalizeEvents(body.events);
  if (!events) {
    return NextResponse.json({ error: 'Select at least one valid event' }, { status: 400 });
  }

  try {
    const id = `whe_${nanoid()}`;
    const secret = generateWebhookSecret();
    const createdAt = new Date().toISOString();

    sqlite
      .prepare(
        `INSERT INTO webhook_endpoints
           (id, org_id, url, secret, description, events, enabled, created_by_user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      )
      .run(id, session.orgId, url, secret, description, events, session.userId, createdAt);

    // Return the secret ONCE so the UI can show it like an API key.
    return NextResponse.json(
      { id, url, description, events, enabled: 1, created_at: createdAt, secret },
      { status: 201 },
    );
  } catch (err) {
    console.error('[webhooks:post]', err);
    return NextResponse.json({ error: 'Failed to create webhook endpoint' }, { status: 500 });
  }
}
