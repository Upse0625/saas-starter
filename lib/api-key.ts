import { createHash, randomBytes } from 'crypto';
import { sqlite } from './db';

const PREFIX = 'sk_live_';

export interface GeneratedKey {
  full: string;
  prefix: string;
  hash: string;
}

export function generateKey(): GeneratedKey {
  const random = randomBytes(24).toString('base64url');
  const full = `${PREFIX}${random}`;
  const prefix = full.slice(0, 14);
  const hash = createHash('sha256').update(full).digest('hex');
  return { full, prefix, hash };
}

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export interface ApiKeyAuthResult {
  ok: boolean;
  orgId?: string;
  userId?: string;
  keyId?: string;
}

export function authenticateApiKey(token: string): ApiKeyAuthResult {
  if (!token.startsWith(PREFIX)) return { ok: false };
  const hash = hashKey(token);
  const row = sqlite.prepare(`
    SELECT id, org_id, created_by_user_id, revoked_at
    FROM api_keys
    WHERE key_hash = ?
  `).get(hash) as { id: string; org_id: string; created_by_user_id: string; revoked_at: string | null } | undefined;
  if (!row || row.revoked_at) return { ok: false };
  sqlite.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').run(new Date().toISOString(), row.id);
  return { ok: true, orgId: row.org_id, userId: row.created_by_user_id, keyId: row.id };
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}
