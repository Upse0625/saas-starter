import Stripe from 'stripe';

export type PlanId = 'starter' | 'pro' | 'enterprise';

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number; // monthly, USD
  priceId: string | null; // Stripe price ID
  features: string[];
  memberLimit: number;
  highlighted?: boolean;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 0,
    priceId: null,
    memberLimit: 3,
    features: [
      'Up to 3 team members',
      'Basic analytics',
      '5 GB storage',
      'Email support',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
    memberLimit: 25,
    highlighted: true,
    features: [
      'Up to 25 team members',
      'Advanced analytics',
      '50 GB storage',
      'Priority email & chat support',
      'Custom integrations',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? null,
    memberLimit: Infinity,
    features: [
      'Unlimited team members',
      'Full analytics suite',
      '500 GB storage',
      '24/7 dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'SSO / SAML',
    ],
  },
};

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-04-22.dahlia',
    });
  }
  return _stripe;
}

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
