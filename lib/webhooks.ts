import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { sqlite } from './db';

// ─── Event catalog ───────────────────────────────────────────────────────────
// The events your app emits to customer-configured webhook endpoints. Keep this
// list in sync with the publishEvent() call sites scattered through the app.
export const WEBHOOK_EVENTS = [
  'user.created',
  'org.created',
  'org.updated',
  'member.invited',
  'member.joined',
  'member.removed',
  'member.role_changed',
  'api_key.created',
  'api_key.revoked',
  'billing.subscription_updated',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

const MAX_ATTEMPTS = 5;
// Exponential backoff (seconds) per attempt number: ~1m, 5m, 30m, 2h, 6h.
const BACKOFF_SECONDS = [60, 300, 1800, 7200, 21600];
const REQUEST_TIMEOUT_MS = 8000;

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString('base64url')}`;
}

function nanoid(size = 21): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(size);
  let id = '';
  for (let i = 0; i < size; i++) id += alphabet[bytes[i] % alphabet.length];
  return id;
}

/**
 * Signature scheme (Stripe/Svix-style):
 *   signed = `${timestamp}.${rawBody}`
 *   header = `t=${timestamp},v1=${hex hmac_sha256(secret, signed)}`
 * Receivers recompute the HMAC and compare in constant time, and should reject
 * timestamps outside a tolerance window to prevent replay.
 */
export function signPayload(secret: string, timestamp: number, rawBody: string): string {
  const mac = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return `t=${timestamp},v1=${mac}`;
}

export function verifySignature(secret: string, header: string, rawBody: string, toleranceSec = 300): boolean {
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=')));
  const t = Number(parts['t']);
  const v1 = parts['v1'];
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const a = Buffer.from(v1);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface EndpointRow {
  id: string;
  url: string;
  secret: string;
  events: string;
  enabled: number;
}

interface DeliveryRow {
  id: string;
  endpoint_id: string;
  event_type: string;
  payload: string;
  attempts: number;
}

function endpointSubscribes(events: string, type: string): boolean {
  if (events.trim() === '*') return true;
  return events.split(',').map((e) => e.trim()).includes(type);
}

async function attemptDelivery(d: DeliveryRow, endpoint: { url: string; secret: string }): Promise<void> {
  const ts = Math.floor(Date.now() / 1000);
  const signature = signPayload(endpoint.secret, ts, d.payload);
  const nowIso = new Date().toISOString();
  const attempts = d.attempts + 1;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Saasly-Webhooks/1.0',
        'X-Webhook-Id': d.id,
        'X-Webhook-Event': d.event_type,
        'X-Webhook-Timestamp': String(ts),
        'X-Webhook-Signature': signature,
      },
      body: d.payload,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const body = (await res.text().catch(() => '')).slice(0, 2000);

    if (res.ok) {
      sqlite
        .prepare(
          `UPDATE webhook_deliveries SET status='success', status_code=?, response_body=?, error=NULL,
             attempts=?, last_attempt_at=?, next_retry_at=NULL WHERE id=?`,
        )
        .run(res.status, body, attempts, nowIso, d.id);
      return;
    }
    scheduleRetryOrFail(d.id, attempts, res.status, body, `HTTP ${res.status}`, nowIso);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'request failed';
    scheduleRetryOrFail(d.id, attempts, null, null, msg, nowIso);
  }
}

function scheduleRetryOrFail(
  id: string,
  attempts: number,
  statusCode: number | null,
  body: string | null,
  error: string,
  nowIso: string,
): void {
  if (attempts >= MAX_ATTEMPTS) {
    sqlite
      .prepare(
        `UPDATE webhook_deliveries SET status='failed', status_code=?, response_body=?, error=?,
           attempts=?, last_attempt_at=?, next_retry_at=NULL WHERE id=?`,
      )
      .run(statusCode, body, error, attempts, nowIso, id);
    return;
  }
  const delay = BACKOFF_SECONDS[Math.min(attempts - 1, BACKOFF_SECONDS.length - 1)];
  const nextRetry = new Date(Date.now() + delay * 1000).toISOString();
  sqlite
    .prepare(
      `UPDATE webhook_deliveries SET status='failed', status_code=?, response_body=?, error=?,
         attempts=?, last_attempt_at=?, next_retry_at=? WHERE id=?`,
    )
    .run(statusCode, body, error, attempts, nowIso, nextRetry, id);
}

/**
 * Emit an event to every enabled endpoint of the org that subscribes to it.
 * Fire-and-forget: creates delivery rows synchronously, then attempts HTTP in
 * the background so it never blocks the request that triggered it.
 */
export function publishEvent(args: {
  orgId: string;
  type: WebhookEventType;
  data: Record<string, unknown>;
}): void {
  try {
    const endpoints = sqlite
      .prepare(`SELECT id, url, secret, events, enabled FROM webhook_endpoints WHERE org_id = ? AND enabled = 1`)
      .all(args.orgId) as EndpointRow[];
    const targets = endpoints.filter((e) => endpointSubscribes(e.events, args.type));
    if (targets.length === 0) return;

    const eventId = `evt_${nanoid()}`;
    const createdAt = new Date().toISOString();
    const envelope = JSON.stringify({
      id: eventId,
      type: args.type,
      created_at: createdAt,
      data: args.data,
    });

    for (const ep of targets) {
      const deliveryId = `whd_${nanoid()}`;
      sqlite
        .prepare(
          `INSERT INTO webhook_deliveries
             (id, endpoint_id, org_id, event_type, event_id, payload, status, attempts, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
        )
        .run(deliveryId, ep.id, args.orgId, args.type, eventId, envelope, createdAt);
      // Don't await — let the request return immediately.
      void attemptDelivery(
        { id: deliveryId, endpoint_id: ep.id, event_type: args.type, payload: envelope, attempts: 0 },
        { url: ep.url, secret: ep.secret },
      );
    }
  } catch (err) {
    console.error('[webhooks] publishEvent failed', err);
  }
}

/** Re-attempt a single delivery now (used by the manual "retry" button). */
export async function retryDelivery(id: string): Promise<boolean> {
  const d = sqlite
    .prepare(`SELECT id, endpoint_id, event_type, payload, attempts FROM webhook_deliveries WHERE id = ?`)
    .get(id) as DeliveryRow | undefined;
  if (!d) return false;
  const ep = sqlite
    .prepare(`SELECT url, secret FROM webhook_endpoints WHERE id = ?`)
    .get(d.endpoint_id) as { url: string; secret: string } | undefined;
  if (!ep) return false;
  await attemptDelivery(d, ep);
  return true;
}

// ─── Background retry sweeper ─────────────────────────────────────────────────
// Single-container model: an in-process interval re-attempts due retries.
// For multi-instance/serverless, replace with a real queue (BullMQ/Redis/SQS).
declare global {
  // eslint-disable-next-line no-var
  var __WEBHOOK_SWEEPER__: NodeJS.Timeout | undefined;
}

function startSweeper(): void {
  if (globalThis.__WEBHOOK_SWEEPER__ || typeof window !== 'undefined') return;
  globalThis.__WEBHOOK_SWEEPER__ = setInterval(() => {
    try {
      const due = sqlite
        .prepare(
          `SELECT id, endpoint_id, event_type, payload, attempts FROM webhook_deliveries
             WHERE status='failed' AND next_retry_at IS NOT NULL AND next_retry_at <= ?
             ORDER BY next_retry_at ASC LIMIT 20`,
        )
        .all(new Date().toISOString()) as DeliveryRow[];
      for (const d of due) {
        const ep = sqlite
          .prepare(`SELECT url, secret, enabled FROM webhook_endpoints WHERE id = ?`)
          .get(d.endpoint_id) as { url: string; secret: string; enabled: number } | undefined;
        if (!ep || ep.enabled !== 1) {
          // endpoint gone/disabled — stop retrying
          sqlite.prepare(`UPDATE webhook_deliveries SET next_retry_at=NULL WHERE id=?`).run(d.id);
          continue;
        }
        void attemptDelivery(d, { url: ep.url, secret: ep.secret });
      }
    } catch (err) {
      console.error('[webhooks] sweeper error', err);
    }
  }, 30_000);
  globalThis.__WEBHOOK_SWEEPER__.unref?.();
}

startSweeper();
