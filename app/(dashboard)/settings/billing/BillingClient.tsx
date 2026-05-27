'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Check,
  AlertCircle,
  ExternalLink,
  CreditCard,
  Receipt,
  Sparkles,
  Download,
} from 'lucide-react';
import type { PlanConfig } from '@/lib/stripe';
import type { Invoice } from '@/app/api/stripe/invoices/route';

interface BillingClientProps {
  currentPlan: string;
  plans: PlanConfig[];
  isStripeEnabled: boolean;
  hasSubscription: boolean;
}

interface InvoicesResponse {
  invoices: Invoice[];
  enabled: boolean;
  reason?: 'no_stripe' | 'no_customer' | 'error';
  error?: string;
}

function formatInvoiceDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    // Fall back if Stripe returns an unexpected currency code.
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function statusChipClass(status: string | null): string {
  switch (status) {
    case 'paid':
      return 'chip chip-green';
    case 'open':
      return 'chip chip-amber';
    default:
      // void, draft, uncollectible, null → neutral grey
      return 'chip';
  }
}

function statusLabel(status: string | null): string {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function BillingClient({
  currentPlan,
  plans,
  isStripeEnabled,
  hasSubscription,
}: BillingClientProps) {
  const [isPending, startTransition] = useTransition();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesReason, setInvoicesReason] = useState<InvoicesResponse['reason']>();
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/stripe/invoices');
        const data = (await res.json()) as InvoicesResponse;
        if (!active) return;
        setInvoices(data.invoices ?? []);
        setInvoicesReason(data.reason);
        setInvoicesError(data.reason === 'error' ? data.error ?? 'Failed to load invoices' : null);
      } catch {
        if (!active) return;
        setInvoicesError('Failed to load invoices');
      } finally {
        if (active) setInvoicesLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const current = plans.find((p) => p.id === currentPlan);
  const currentIndex = plans.findIndex((p) => p.id === currentPlan);

  async function handleUpgrade(planId: string) {
    setError(null);
    setLoadingPlan(planId);

    startTransition(async () => {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      if (res.ok) {
        const data = (await res.json()) as { url?: string };
        if (data.url) window.location.href = data.url;
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to start checkout');
      }
      setLoadingPlan(null);
    });
  }

  async function handlePortal() {
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });

      if (res.ok) {
        const data = (await res.json()) as { url?: string };
        if (data.url) window.location.href = data.url;
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to open billing portal');
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Current plan summary */}
      <div className="card-elev p-6 anim-fade-up delay-1">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-md flex-shrink-0"
              style={{
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent)',
              }}
            >
              <CreditCard className="w-5 h-5" strokeWidth={1.85} />
            </span>
            <div>
              <p
                className="text-xs font-medium uppercase tracking-wider mb-1"
                style={{ color: 'var(--muted)' }}
              >
                Current plan
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-semibold capitalize">{current?.name ?? currentPlan}</p>
                <span className="chip chip-green">Active</span>
              </div>
              <p className="text-sm mt-0.5" style={{ color: 'var(--muted-strong)' }}>
                {current?.price === 0
                  ? 'Free forever'
                  : `$${current?.price ?? 0}/month, billed monthly`}
              </p>
            </div>
          </div>
          {hasSubscription && isStripeEnabled && (
            <button
              onClick={handlePortal}
              disabled={isPending}
              className="btn btn-secondary"
            >
              {isPending ? (
                <>
                  <span className="spinner" />
                  Loading
                </>
              ) : (
                <>
                  Manage in Stripe
                  <ExternalLink className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="banner banner-red text-sm anim-fade-up delay-1">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--muted-strong)' }}>
          Change your plan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, i) => {
            const isCurrent = plan.id === currentPlan;
            const planIndex = plans.findIndex((p) => p.id === plan.id);
            const isDowngrade = planIndex < currentIndex;
            const canUpgrade = !isCurrent && !isDowngrade && plan.price > 0;
            const highlighted = plan.highlighted && !isCurrent;

            return (
              <div
                key={plan.id}
                className={`p-6 flex flex-col anim-fade-up delay-${i + 2} ${
                  highlighted ? 'card-gradient' : 'card'
                }`}
                style={{
                  position: 'relative',
                  ...(isCurrent
                    ? {
                        borderColor: 'var(--accent)',
                        boxShadow: '0 0 0 1px var(--accent)',
                      }
                    : {}),
                }}
              >
                {isCurrent && (
                  <span
                    className="chip chip-accent absolute -top-2 right-4"
                    style={{ fontSize: 10, padding: '3px 8px' }}
                  >
                    Current
                  </span>
                )}
                {highlighted && (
                  <span
                    className="chip chip-accent absolute -top-2 right-4"
                    style={{ fontSize: 10, padding: '3px 8px' }}
                  >
                    Popular
                  </span>
                )}

                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-3 mb-5">
                  <span
                    className="text-4xl font-semibold"
                    style={{
                      letterSpacing: '-0.025em',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    ${plan.price}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>
                    /mo
                  </span>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check
                        className="w-4 h-4 mt-0.5 flex-shrink-0"
                        style={{ color: 'var(--status-green)' }}
                        strokeWidth={2.5}
                      />
                      <span style={{ color: 'var(--muted-strong)' }}>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="btn btn-secondary w-full"
                    style={{ opacity: 0.7 }}
                  >
                    Current plan
                  </button>
                ) : plan.id === 'starter' ? (
                  <button
                    type="button"
                    disabled
                    className="btn btn-secondary w-full"
                    style={{ opacity: 0.6 }}
                  >
                    Free tier
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={!isStripeEnabled || !canUpgrade || isPending || !plan.priceId}
                    className={`btn ${canUpgrade && isStripeEnabled ? 'btn-primary' : 'btn-secondary'} w-full`}
                  >
                    {loadingPlan === plan.id ? (
                      <>
                        <span className="spinner" />
                        Redirecting
                      </>
                    ) : isDowngrade ? (
                      'Contact support'
                    ) : !isStripeEnabled ? (
                      'Stripe disabled'
                    ) : !plan.priceId ? (
                      'Price not set'
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing history */}
      <div className="card overflow-hidden anim-fade-up delay-5">
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4" style={{ color: 'var(--muted-strong)' }} strokeWidth={1.85} />
            <h2 className="font-semibold text-[15px]">Billing history</h2>
          </div>
          {hasSubscription && isStripeEnabled && (
            <button onClick={handlePortal} className="btn btn-ghost btn-xs">
              Open portal
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {invoicesLoading ? (
          <div className="px-6 py-12 flex items-center justify-center gap-2">
            <span className="spinner" />
            <span className="text-sm" style={{ color: 'var(--muted-strong)' }}>
              Loading invoices…
            </span>
          </div>
        ) : invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ color: 'var(--muted-strong)' }}>
                      {formatInvoiceDate(inv.created)}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(inv.amount_paid, inv.currency)}
                    </td>
                    <td>
                      <span className={statusChipClass(inv.status)}>
                        {statusLabel(inv.status)}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {inv.invoice_pdf && (
                          <a
                            href={inv.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-xs"
                          >
                            <Download className="w-3 h-3" />
                            PDF
                          </a>
                        )}
                        {inv.hosted_invoice_url && (
                          <a
                            href={inv.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-xs"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <div
              className="inline-flex items-center justify-center w-10 h-10 rounded-full mx-auto mb-3"
              style={{ backgroundColor: 'var(--bg-muted)' }}
            >
              <Receipt className="w-5 h-5" style={{ color: 'var(--muted)' }} strokeWidth={1.85} />
            </div>
            {invoicesError ? (
              <>
                <p className="text-sm font-medium">Couldn&apos;t load billing history</p>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
                  {invoicesError}
                </p>
              </>
            ) : invoicesReason === 'no_stripe' ? (
              <>
                <p className="text-sm font-medium">Billing history appears here once Stripe is connected.</p>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  Connect Stripe to start tracking invoices and payments.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">No invoices yet</p>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
                  They&apos;ll show up here after your first payment.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* FAQ */}
      <div className="card p-6 anim-fade-up delay-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} strokeWidth={1.85} />
          <h2 className="font-semibold text-[15px]">Billing FAQ</h2>
        </div>
        <div className="space-y-4">
          {[
            {
              q: 'When am I billed?',
              a: 'Subscriptions are billed monthly on the date you first subscribed.',
            },
            {
              q: 'Can I cancel anytime?',
              a: "Yes. You can cancel your subscription anytime through the billing portal. You'll keep access until the end of your billing period.",
            },
            {
              q: 'How do upgrades and downgrades work?',
              a: 'Upgrades take effect immediately and are pro-rated. To downgrade, please contact support.',
            },
          ].map(({ q, a }) => (
            <div
              key={q}
              className="pt-4"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <p className="text-sm font-semibold">{q}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
                {a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
