import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organizations, org_members } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { slugify } from '@/lib/utils';
import { eq, and, ne } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// Max logo size when decoded (512 KB). base64 inflates by ~4/3, so we also
// guard the encoded string length generously.
const MAX_LOGO_BYTES = 512 * 1024;

interface PatchBody {
  name?: string;
  slug?: string;
  logo?: string | null;
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only the owner may edit organization name / slug / logo.
  const callerMembership = await db
    .select()
    .from(org_members)
    .where(and(eq(org_members.org_id, session.orgId), eq(org_members.user_id, session.userId)))
    .get();

  if (!callerMembership || callerMembership.role !== 'owner') {
    return NextResponse.json({ error: 'Only the organization owner can do this.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as PatchBody;

  const updates: { name?: string; slug?: string; logo?: string | null } = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (name.length < 2) {
      return NextResponse.json({ error: 'Organization name must be at least 2 characters.' }, { status: 400 });
    }
    updates.name = name;
  }

  if (body.slug !== undefined) {
    const slug = slugify(body.slug);
    if (!slug) {
      return NextResponse.json({ error: 'Slug cannot be empty.' }, { status: 400 });
    }
    // Reject if another org already owns this slug.
    const clash = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(eq(organizations.slug, slug), ne(organizations.id, session.orgId)))
      .get();
    if (clash) {
      return NextResponse.json({ error: 'That slug is already taken.' }, { status: 409 });
    }
    updates.slug = slug;
  }

  if (body.logo !== undefined) {
    if (body.logo === null || body.logo === '') {
      updates.logo = null;
    } else {
      if (!body.logo.startsWith('data:image/')) {
        return NextResponse.json({ error: 'Logo must be an image data URL.' }, { status: 400 });
      }
      // Estimate decoded size from the base64 payload.
      const commaIdx = body.logo.indexOf(',');
      const b64 = commaIdx >= 0 ? body.logo.slice(commaIdx + 1) : '';
      const approxBytes = Math.floor((b64.length * 3) / 4);
      if (approxBytes > MAX_LOGO_BYTES) {
        return NextResponse.json({ error: 'Logo must be under 512 KB.' }, { status: 400 });
      }
      updates.logo = body.logo;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  await db.update(organizations).set(updates).where(eq(organizations.id, session.orgId));

  audit({
    action: 'org.updated',
    orgId: session.orgId,
    actorUserId: session.userId,
    targetType: 'organization',
    targetId: session.orgId,
    metadata: { fields: Object.keys(updates) },
  }).catch((err) => {
    console.error('[org:patch] audit failed', err);
  });

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.orgId))
    .get();

  return NextResponse.json({ ok: true, organization: org });
}
