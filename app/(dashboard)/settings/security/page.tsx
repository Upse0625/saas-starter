import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { sqlite } from '@/lib/db';
import SecurityClient from './SecurityClient';

interface UserRow {
  id: string;
  email: string;
  totp_enabled: number;
}

interface SessionRow {
  id: string;
  ip: string | null;
  user_agent: string | null;
  last_active_at: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export default async function SecurityPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const user = sqlite
    .prepare('SELECT id, email, totp_enabled FROM users WHERE id = ?')
    .get(session.userId) as UserRow | undefined;

  if (!user) redirect('/login');

  const rows = sqlite
    .prepare(
      `SELECT id, ip, user_agent, last_active_at, expires_at, revoked_at, created_at
       FROM sessions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
    )
    .all(session.userId) as SessionRow[];

  return (
    <div>
      <div className="mb-8 anim-fade-up delay-0">
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
          Settings · Security
        </p>
        <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
          Security
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
          Manage two-factor authentication and your active sessions.
        </p>
      </div>

      <SecurityClient
        twoFactorEnabled={user.totp_enabled === 1}
        sessions={rows.map((r) => ({
          id: r.id,
          ip: r.ip,
          user_agent: r.user_agent,
          last_active_at: r.last_active_at,
          expires_at: r.expires_at,
          revoked_at: r.revoked_at,
          created_at: r.created_at,
          current: session.sessionId === r.id,
        }))}
        currentSessionId={session.sessionId ?? null}
      />
    </div>
  );
}
