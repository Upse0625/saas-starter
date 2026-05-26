import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { organizations, org_members, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import SidebarNav from './SidebarNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.orgId))
    .get();

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .get();

  const membership = await db
    .select()
    .from(org_members)
    .where(and(eq(org_members.org_id, session.orgId), eq(org_members.user_id, session.userId)))
    .get();

  if (!org || !user || !membership) {
    redirect('/login');
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--bg-subtle)' }}
    >
      <SidebarNav
        orgName={org.name}
        orgSlug={org.slug}
        plan={org.plan}
        userName={user.name}
        userEmail={user.email}
        userRole={membership.role}
      />
      <main
        className="flex-1 overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-subtle)' }}
      >
        <div className="max-w-6xl mx-auto px-8 py-10 anim-fade-in">{children}</div>
      </main>
    </div>
  );
}
