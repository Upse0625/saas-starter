import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { sqlite } from '@/lib/db';
import SessionsClient from './SessionsClient';

export const dynamic = 'force-dynamic';

interface SessionRow {
  id: string;
  ip: string | null;
  user_agent: string | null;
  last_active_at: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export default async function SessionsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

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
          Settings · Sessions
        </p>
        <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
          Active sessions
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
          Devices currently signed in to your account. Revoke any you don&apos;t recognize.
        </p>
      </div>

      <SessionsClient
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
      />
    </div>
  );
}
