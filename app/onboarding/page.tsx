import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { organizations, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PLANS } from '@/lib/stripe';
import OnboardingClient from './OnboardingClient';

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .get();

  if (!user) {
    redirect('/login');
  }

  // Already onboarded — don't re-run the wizard.
  if (user.onboarded_at) {
    redirect('/dashboard');
  }

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.orgId))
    .get();

  if (!org) {
    redirect('/login');
  }

  return (
    <OnboardingClient
      orgName={org.name}
      currentPlan={org.plan}
      name={user.name}
      avatar={user.avatar}
      plans={Object.values(PLANS)}
    />
  );
}
