import { sqlite } from '@/lib/db';
import { withApiKey } from '../_helpers';

export const dynamic = 'force-dynamic';

interface UserRow {
  id: string;
  email: string;
  name: string;
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export async function GET(req: Request) {
  return withApiKey(req, ({ orgId, userId }) => {
    const user = sqlite.prepare(`
      SELECT id, email, name FROM users WHERE id = ?
    `).get(userId) as UserRow | undefined;

    const org = sqlite.prepare(`
      SELECT id, name, slug, plan FROM organizations WHERE id = ?
    `).get(orgId) as OrgRow | undefined;

    if (!user || !org) {
      return new Response(JSON.stringify({ error: 'User or organization not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return Response.json({
      id: user.id,
      email: user.email,
      name: user.name,
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
      },
    });
  });
}
