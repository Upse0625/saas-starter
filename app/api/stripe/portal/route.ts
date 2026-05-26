import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.orgId))
    .get();

  if (!org?.stripe_customer_id) {
    return NextResponse.json({ error: 'No Stripe customer found for this organization' }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${appUrl}/settings/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
