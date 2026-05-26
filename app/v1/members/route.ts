import { sqlite } from '@/lib/db';
import { withApiKey } from '../_helpers';

export const dynamic = 'force-dynamic';

interface MemberRow {
  id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
}

export async function GET(req: Request) {
  return withApiKey(req, ({ orgId }) => {
    const rows = sqlite.prepare(`
      SELECT u.id AS id,
             u.name AS name,
             u.email AS email,
             m.role AS role,
             m.created_at AS joined_at
      FROM org_members m
      INNER JOIN users u ON u.id = m.user_id
      WHERE m.org_id = ?
      ORDER BY m.created_at ASC
    `).all(orgId) as MemberRow[];

    return Response.json({ members: rows });
  });
}
