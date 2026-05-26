import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { AlertTriangle } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { organizations, org_members } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { slugify } from '@/lib/utils';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.orgId))
    .get();

  const membership = await db
    .select()
    .from(org_members)
    .where(and(eq(org_members.org_id, session.orgId), eq(org_members.user_id, session.userId)))
    .get();

  if (!org || !membership) redirect('/login');

  const canEdit = membership.role === 'owner' || membership.role === 'admin';

  async function updateOrgName(formData: FormData) {
    'use server';
    const innerSession = await getSession();
    if (!innerSession) return;

    const name = formData.get('name') as string;
    if (!name || name.trim().length < 2) return;

    const newSlug = slugify(name.trim());

    await db
      .update(organizations)
      .set({ name: name.trim(), slug: newSlug })
      .where(eq(organizations.id, innerSession.orgId));

    revalidatePath('/settings');
  }

  return (
    <div>
      <div className="mb-8 anim-fade-up delay-0">
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
          Settings
        </p>
        <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
          General
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
          Manage your organization details.
        </p>
      </div>

      <div className="card max-w-2xl anim-fade-up delay-1">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold text-[15px]">Organization</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Public details for {org.name}.
          </p>
        </div>
        <div className="p-6">
          <form action={updateOrgName} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1.5">
                Organization name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={org.name}
                disabled={!canEdit}
                required
                minLength={2}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">URL slug</label>
              <div
                className="flex items-stretch overflow-hidden rounded-md"
                style={{ border: '1px solid var(--border)' }}
              >
                <span
                  className="px-3 flex items-center text-sm"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--muted)',
                    borderRight: '1px solid var(--border)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  saasly.io/
                </span>
                <input
                  type="text"
                  value={org.slug}
                  readOnly
                  className="flex-1 px-3 py-2.5 text-sm"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--muted-strong)',
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'not-allowed',
                  }}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
                Slug is auto-generated from organization name.
              </p>
            </div>

            {canEdit ? (
              <div className="flex justify-end pt-1">
                <button type="submit" className="btn btn-primary">
                  Save changes
                </button>
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Only owners and admins can edit organization settings.
              </p>
            )}
          </form>
        </div>
      </div>

      {membership.role === 'owner' && (
        <div
          className="card max-w-2xl mt-6 anim-fade-up delay-2"
          style={{ borderColor: '#fecaca' }}
        >
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ borderBottom: '1px solid #fecaca', backgroundColor: 'var(--status-red-soft)' }}
          >
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--status-red)' }} />
            <h2 className="font-semibold text-[15px]" style={{ color: '#991b1b' }}>
              Danger zone
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold">Delete organization</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted-strong)' }}>
                  Permanently delete your organization and all associated data.
                </p>
              </div>
              <button
                type="button"
                disabled
                className="btn btn-danger btn-sm"
                title="Feature not implemented in demo"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

