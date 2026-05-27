import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { sqlite } from '@/lib/db';
import PersonalKeysClient from './PersonalKeysClient';

export const dynamic = 'force-dynamic';

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export default async function PersonalKeysPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const keys = sqlite
    .prepare(
      `SELECT id, name, key_prefix, last_used_at, created_at, revoked_at
       FROM api_keys
       WHERE created_by_user_id = ? AND scope = 'personal'
       ORDER BY created_at DESC`,
    )
    .all(session.userId) as ApiKeyRow[];

  return (
    <div>
      <div className="mb-8 anim-fade-up delay-0">
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
          Settings · Personal API Keys
        </p>
        <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
          Personal API keys
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
          Keys tied to your own account, separate from the shared organization keys.
        </p>
      </div>

      <PersonalKeysClient initialKeys={keys} />
    </div>
  );
}
