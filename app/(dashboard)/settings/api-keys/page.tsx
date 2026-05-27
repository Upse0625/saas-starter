import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { sqlite } from '@/lib/db';
import ApiKeysClient from './ApiKeysClient';

export const dynamic = 'force-dynamic';

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export default async function ApiKeysPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const keys = sqlite
    .prepare(
      `SELECT id, name, key_prefix, last_used_at, created_at, revoked_at
       FROM api_keys
       WHERE org_id = ? AND (scope = 'org' OR scope IS NULL)
       ORDER BY created_at DESC`,
    )
    .all(session.orgId) as ApiKeyRow[];

  return (
    <div>
      <div className="mb-8 anim-fade-up delay-0">
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
          Settings · API Keys
        </p>
        <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
          API keys
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
          Manage tokens used to authenticate with the public{' '}
          <code
            style={{
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'var(--bg-muted)',
              padding: '1px 6px',
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            /v1
          </code>{' '}
          API.
        </p>
      </div>

      <ApiKeysClient initialKeys={keys} />
    </div>
  );
}
