import { authenticateApiKey, extractBearerToken } from '@/lib/api-key';
import { rateLimitByKey } from '@/lib/rate-limit';
import { audit } from '@/lib/audit';

export interface ApiContext {
  orgId: string;
  userId: string;
  keyId: string;
}

const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;

function jsonError(status: number, body: Record<string, unknown>, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
  });
}

/**
 * Authenticates a request to the public /v1 API.
 *
 * - Reads `Authorization: Bearer ...`.
 * - Verifies the key against the database (must be valid + not revoked).
 * - Applies a 60 req/min per-key rate limit.
 * - Audits each successful authenticated call as `api_key.used`.
 *
 * Returns the authenticated context, or throws a `Response` with the
 * appropriate status (401 / 429) for the caller to return directly.
 */
export async function requireApiKey(req: Request): Promise<ApiContext> {
  const token = extractBearerToken(req.headers.get('authorization'));
  if (!token) {
    throw jsonError(401, { error: 'Missing or malformed Authorization header. Expected: Bearer <api-key>' }, {
      'WWW-Authenticate': 'Bearer realm="v1", error="invalid_request"',
    });
  }

  const auth = authenticateApiKey(token);
  if (!auth.ok || !auth.orgId || !auth.userId || !auth.keyId) {
    throw jsonError(401, { error: 'Invalid or revoked API key' }, {
      'WWW-Authenticate': 'Bearer realm="v1", error="invalid_token"',
    });
  }

  const rl = rateLimitByKey('v1', auth.keyId, RATE_LIMIT, WINDOW_MS);
  const remaining = Math.max(0, rl.remaining);
  const resetSec = Math.max(1, Math.ceil(rl.resetIn / 1000));

  if (!rl.ok) {
    throw jsonError(429, { error: 'Rate limit exceeded. Try again shortly.' }, {
      'Retry-After': String(resetSec),
      'X-RateLimit-Limit': String(RATE_LIMIT),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(resetSec),
    });
  }

  await audit({
    action: 'api_key.used',
    orgId: auth.orgId,
    actorUserId: auth.userId,
    targetType: 'api_key',
    targetId: auth.keyId,
    metadata: { path: req.url },
  });

  return { orgId: auth.orgId, userId: auth.userId, keyId: auth.keyId };
}

/**
 * Helper for /v1 route handlers — wraps authentication + standard
 * error handling. Pass a function that receives the auth context.
 */
export async function withApiKey(
  req: Request,
  handler: (ctx: ApiContext) => Promise<Response> | Response,
): Promise<Response> {
  let ctx: ApiContext;
  try {
    ctx = await requireApiKey(req);
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, { error: 'Internal server error' });
  }
  try {
    return await handler(ctx);
  } catch (err) {
    console.error('[v1] handler error:', err);
    return jsonError(500, { error: 'Internal server error' });
  }
}
