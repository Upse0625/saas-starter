import { sqlite } from './db';
import { headers } from 'next/headers';

export type AuditAction =
  | 'user.signup' | 'user.login' | 'user.logout' | 'user.login_failed'
  | 'user.email_verified' | 'user.password_reset_requested' | 'user.password_reset'
  | 'user.2fa_enabled' | 'user.2fa_disabled' | 'user.2fa_challenge'
  | 'session.revoked'
  | 'org.created' | 'org.updated'
  | 'org.member_invited' | 'org.member_joined' | 'org.member_removed' | 'org.member_role_changed'
  | 'api_key.created' | 'api_key.revoked' | 'api_key.used'
  | 'billing.checkout_started' | 'billing.subscription_updated';

interface LogArgs {
  action: AuditAction;
  orgId?: string | null;
  actorUserId?: string | null;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function audit(args: LogArgs): Promise<void> {
  let ip: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
    userAgent = h.get('user-agent') ?? null;
  } catch {
    // headers() unavailable outside request context — that's fine
  }
  sqlite.prepare(`
    INSERT INTO audit_logs (org_id, actor_user_id, action, target_type, target_id, metadata, ip, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    args.orgId ?? null,
    args.actorUserId ?? null,
    args.action,
    args.targetType ?? null,
    args.targetId ?? null,
    args.metadata ? JSON.stringify(args.metadata) : null,
    ip,
    userAgent,
    new Date().toISOString(),
  );
}

export interface AuditEntry {
  id: number;
  org_id: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export function listAuditLogs(orgId: string, limit = 100, offset = 0): AuditEntry[] {
  const rows = sqlite.prepare(`
    SELECT a.*, u.email AS actor_email, u.name AS actor_name
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.actor_user_id
    WHERE a.org_id = ?
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(orgId, limit, offset) as Array<Omit<AuditEntry, 'metadata'> & { metadata: string | null }>;
  return rows.map(r => ({ ...r, metadata: r.metadata ? JSON.parse(r.metadata) : null }));
}
