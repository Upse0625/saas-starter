import { redirect } from 'next/navigation';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PLANS, stripeEnabled } from '@/lib/stripe';
import BillingClient from './BillingClient';

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  if (!session) redirect('/login');

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.orgId))
    .get();

  if (!org) redirect('/login');

  const isStripeEnabled = stripeEnabled();
  const hasSubscription = Boolean(org.stripe_customer_id && org.stripe_subscription_id);

  return (
    <div>
      <div className="mb-8 anim-fade-up delay-0">
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
          Settings · Billing
        </p>
        <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
          Billing &amp; plans
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
          Manage your subscription, invoices, and payment details.
        </p>
      </div>

      {params.success && (
        <div className="banner banner-green mb-5 anim-fade-up delay-1">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">Plan updated</p>
            <p className="text-sm">Your subscription has been updated successfully.</p>
          </div>
        </div>
      )}
      {params.canceled && (
        <div className="banner mb-5 anim-fade-up delay-1">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--muted-strong)' }} />
          <div>
            <p className="text-sm font-semibold">Checkout canceled</p>
            <p className="text-sm" style={{ color: 'var(--muted-strong)' }}>
              Your plan was not changed.
            </p>
          </div>
        </div>
      )}

      {!isStripeEnabled && (
        <div className="banner banner-amber mb-5 anim-fade-up delay-1">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">Demo mode</p>
            <p className="text-sm" style={{ color: '#92400e' }}>
              Stripe is not configured. Add{' '}
              <code
                style={{
                  fontFamily: 'var(--font-mono)',
                  backgroundColor: 'rgba(180, 83, 9, 0.12)',
                  padding: '1px 4px',
                  borderRadius: 4,
                }}
              >
                STRIPE_SECRET_KEY
              </code>{' '}
              to your{' '}
              <code
                style={{
                  fontFamily: 'var(--font-mono)',
                  backgroundColor: 'rgba(180, 83, 9, 0.12)',
                  padding: '1px 4px',
                  borderRadius: 4,
                }}
              >
                .env.local
              </code>{' '}
              to enable live billing.
            </p>
          </div>
        </div>
      )}

      <BillingClient
        currentPlan={org.plan}
        plans={Object.values(PLANS)}
        isStripeEnabled={isStripeEnabled}
        hasSubscription={hasSubscription}
      />
    </div>
  );
}
