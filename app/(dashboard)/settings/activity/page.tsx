import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { listAuditLogs } from '@/lib/audit';
import ActivityClient from './ActivityClient';

const PAGE_SIZE = 100;

export default async function ActivityPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const entries = listAuditLogs(session.orgId, PAGE_SIZE, 0);

  return (
    <div>
      <div className="mb-8 anim-fade-up delay-0">
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
          Settings · Activity
        </p>
        <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
          Audit log
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
          A record of every notable event in your organization.
        </p>
      </div>

      <ActivityClient initialEntries={entries} pageSize={PAGE_SIZE} />
    </div>
  );
}
