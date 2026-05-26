import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getStripe, PLANS } from '@/lib/stripe';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { audit } from '@/lib/audit';
import { rateLimitByIp } from '@/lib/rate-limit';
import { eq } from 'drizzle-orm';
import type { PlanId } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const limit = await rateLimitByIp('checkout', 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please try again shortly.' },
      {
        status: 429,
        headers: { 'Retry-After': Math.ceil(limit.resetIn / 1000).toString() },
      },
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  const body = await request.json() as { planId: PlanId };
  const { planId } = body;
  const plan = PLANS[planId];

  if (!plan || !plan.priceId) {
    return NextResponse.json({ error: 'Invalid plan or price not configured' }, { status: 400 });
  }

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.orgId))
    .get();

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${appUrl}/settings/billing?success=1`,
    cancel_url: `${appUrl}/settings/billing?canceled=1`,
    metadata: { orgId: session.orgId, planId },
    ...(org.stripe_customer_id ? { customer: org.stripe_customer_id } : { customer_email: session.email }),
  });

  audit({
    action: 'billing.checkout_started',
    orgId: session.orgId,
    actorUserId: session.userId,
    targetType: 'stripe_checkout_session',
    targetId: checkoutSession.id,
    metadata: { plan: planId, sessionId: checkoutSession.id },
  }).catch((err) => {
    console.error('[checkout] audit failed', err);
  });

  return NextResponse.json({ url: checkoutSession.url });
}
