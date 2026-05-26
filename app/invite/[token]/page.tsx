import { getSession } from '@/lib/auth';
import InviteClient from './InviteClient';

export const dynamic = 'force-dynamic';

/**
 * /invite/[token]
 *
 * Server component: resolves auth state (cheaply, server-side) and hands it to
 * the client, which fetches the invite details from GET /api/invitations/[token]
 * and drives the accept / decline actions.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getSession();

  return (
    <InviteClient
      token={token}
      isLoggedIn={!!session}
      currentEmail={session?.email ?? null}
    />
  );
}
