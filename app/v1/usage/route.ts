import { sqlite } from '@/lib/db';
import { withApiKey } from '../_helpers';

export const dynamic = 'force-dynamic';

interface BreakdownRow {
  action: string;
  count: number;
}

export async function GET(req: Request) {
  return withApiKey(req, ({ orgId }) => {
    const rows = sqlite.prepare(`
      SELECT action, COUNT(*) AS count
      FROM audit_logs
      WHERE org_id = ?
        AND created_at > datetime('now', '-30 days')
      GROUP BY action
      ORDER BY count DESC
    `).all(orgId) as BreakdownRow[];

    const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
    const byAction: Record<string, number> = {};
    for (const r of rows) {
      byAction[r.action] = Number(r.count);
    }

    return Response.json({
      window: '30d',
      total_events: total,
      by_action: byAction,
    });
  });
}
