import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { audit } from '@/lib/audit';
import { eq } from 'drizzle-orm';
import type { PlanId } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const checkoutSession = event.data.object;
      const orgId = checkoutSession.metadata?.orgId;
      const planId = checkoutSession.metadata?.planId as PlanId | undefined;
      const customerId = checkoutSession.customer as string;
      const subscriptionId = checkoutSession.subscription as string;

      if (orgId && planId) {
        await db
          .update(organizations)
          .set({
            plan: planId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .where(eq(organizations.id, orgId));
        console.log(`[webhook] Org ${orgId} upgraded to ${planId}`);

        audit({
          action: 'billing.subscription_updated',
          orgId,
          actorUserId: null,
          targetType: 'stripe_subscription',
          targetId: subscriptionId,
          metadata: {
            event_type: event.type,
            plan: planId,
            status: 'active',
          },
        }).catch((err) => {
          console.error('[webhook] audit failed', err);
        });
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;
      const status = subscription.status;
      const metadataOrgId = (subscription.metadata && subscription.metadata.orgId) || null;

      let orgId = metadataOrgId;
      if (!orgId) {
        const org = await db
          .select()
          .from(organizations)
          .where(eq(organizations.stripe_customer_id, customerId))
          .get();
        orgId = org?.id ?? null;
      }

      // Best-effort: derive plan id from the first line item's price id
      let plan: PlanId | null = null;
      const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
      if (priceId) {
        if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'pro';
        else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) plan = 'enterprise';
      }

      console.log(`[webhook] Subscription ${event.type} for customer ${customerId} (status=${status})`);

      audit({
        action: 'billing.subscription_updated',
        orgId,
        actorUserId: null,
        targetType: 'stripe_subscription',
        targetId: subscription.id,
        metadata: {
          event_type: event.type,
          plan,
          status,
        },
      }).catch((err) => {
        console.error('[webhook] audit failed', err);
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;
      const status = subscription.status;

      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.stripe_customer_id, customerId))
        .get();

      if (org) {
        await db
          .update(organizations)
          .set({ plan: 'starter', stripe_subscription_id: null })
          .where(eq(organizations.id, org.id));
        console.log(`[webhook] Org ${org.id} downgraded to starter`);
      }

      const orgId = org?.id ?? (subscription.metadata?.orgId as string | undefined) ?? null;

      audit({
        action: 'billing.subscription_updated',
        orgId,
        actorUserId: null,
        targetType: 'stripe_subscription',
        targetId: subscription.id,
        metadata: {
          event_type: event.type,
          plan: 'starter',
          status,
        },
      }).catch((err) => {
        console.error('[webhook] audit failed', err);
      });
      break;
    }

    default:
      console.log(`[webhook] Unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
