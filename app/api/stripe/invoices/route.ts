import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getSession } from '@/lib/auth';
import { getStripe, stripeEnabled } from '@/lib/stripe';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface Invoice {
  id: string;
  number: string | null;
  created: number;
  amount_paid: number;
  currency: string;
  status: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

type Reason = 'no_stripe' | 'no_customer' | 'error';

interface InvoicesResponse {
  invoices: Invoice[];
  enabled: boolean;
  reason?: Reason;
  error?: string;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const enabled = stripeEnabled();
  const stripe = getStripe();

  if (!enabled || !stripe) {
    const body: InvoicesResponse = { invoices: [], enabled: false, reason: 'no_stripe' };
    return NextResponse.json(body);
  }

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.orgId))
    .get();

  if (!org?.stripe_customer_id) {
    const body: InvoicesResponse = { invoices: [], enabled: true, reason: 'no_customer' };
    return NextResponse.json(body);
  }

  try {
    const list = await stripe.invoices.list({
      customer: org.stripe_customer_id,
      limit: 24,
    });

    const invoices: Invoice[] = list.data.map((inv) => ({
      id: inv.id ?? '',
      number: inv.number ?? null,
      created: inv.created,
      amount_paid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status ?? null,
      hosted_invoice_url: inv.hosted_invoice_url ?? null,
      invoice_pdf: inv.invoice_pdf ?? null,
    }));

    const body: InvoicesResponse = { invoices, enabled: true };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load invoices';
    const body: InvoicesResponse = { invoices: [], enabled: true, reason: 'error', error: message };
    return NextResponse.json(body);
  }
}
