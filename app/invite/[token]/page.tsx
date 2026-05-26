import { db } from '@/lib/db';
import { invitations, organizations } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import InviteClient from './InviteClient';

export const dynamic = 'force-dynamic';

type State = 'valid' | 'notfound' | 'expired' | 'accepted';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await db.select().from(invitations).where(eq(invitations.token, token)).get();

  let state: State = 'valid';
  let orgName = '';
  let role: 'admin' | 'member' = 'member';
  let inviteEmail = '';

  if (!invite) {
    state = 'notfound';
  } else if (invite.accepted_at) {
    state = 'accepted';
  } else if (new Date(invite.expires_at).getTime() < Date.now()) {
    state = 'expired';
  } else {
    const org = await db.select().from(organizations).where(eq(organizations.id, invite.org_id)).get();
    orgName = org?.name ?? 'an organization';
    role = invite.role as 'admin' | 'member';
    inviteEmail = invite.email;
  }

  const session = await getSession();

  return (
    <InviteClient
      token={token}
      state={state}
      orgName={orgName}
      role={role}
      inviteEmail={inviteEmail}
      isLoggedIn={!!session}
      currentEmail={session?.email ?? null}
    />
  );
}
