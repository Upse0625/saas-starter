import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  Users,
  Zap,
  CreditCard,
  Webhook,
  Rocket,
  BookOpen,
  Settings2,
  Info,
} from 'lucide-react';
import { PLANS } from '@/lib/stripe';
import { WEBHOOK_EVENTS } from '@/lib/webhooks';

export const metadata: Metadata = {
  title: 'Documentation — SaaS Starter',
  description:
    'Developer documentation for the SaaS Starter template: auth, organizations, REST API, webhooks, and billing.',
};

const PRODUCT_NAME = 'Saasly';

// ─── Table of contents ────────────────────────────────────────────────────────
const SECTIONS: { id: string; label: string; icon: typeof BookOpen }[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'getting-started', label: 'Getting started', icon: Rocket },
  { id: 'authentication', label: 'Authentication', icon: ShieldCheck },
  { id: 'organizations', label: 'Organizations & roles', icon: Users },
  { id: 'rest-api', label: 'REST API (/v1)', icon: Zap },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'customizing', label: 'Customizing', icon: Settings2 },
];

// ─── Small presentational helpers (server-rendered, no client JS) ───────────────

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <div
      className="my-4 overflow-hidden rounded-lg"
      style={{ border: '1px solid var(--border)', backgroundColor: '#0a0a0a' }}
    >
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span
          className="font-mono text-[11px] uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          {language}
        </span>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5">
        <code
          className="font-mono text-[13px] leading-relaxed"
          style={{ color: '#e4e4e7', whiteSpace: 'pre' }}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code
      className="font-mono text-[0.85em]"
      style={{
        backgroundColor: 'var(--code-bg)',
        color: 'var(--accent-hover)',
        padding: '1.5px 6px',
        borderRadius: '4px',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {children}
    </code>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: typeof BookOpen;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-10" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-3 mb-5">
        <span
          className="inline-flex items-center justify-center w-9 h-9 rounded-md"
          style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </span>
        <h2 className="text-2xl md:text-3xl font-semibold" style={{ letterSpacing: '-0.025em' }}>
          <a href={`#${id}`} className="hover:opacity-70 transition-opacity">
            {title}
          </a>
        </h2>
      </div>
      <div className="docs-prose">{children}</div>
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--muted-strong)' }}>
      {children}
    </p>
  );
}

function H3({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h3 id={id} className="text-lg font-semibold mt-8 mb-3 scroll-mt-24" style={{ color: 'var(--fg)' }}>
      {children}
    </h3>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2 mb-4">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[15px] leading-relaxed" style={{ color: 'var(--muted-strong)' }}>
          <span
            aria-hidden="true"
            className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: 'var(--accent)' }}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const apiBase = 'https://api.example.com'; // buyer replaces with their domain

  const meResponse = `{
  "id": "usr_8Kx2mZq",
  "email": "ada@acme.dev",
  "name": "Ada Lovelace",
  "org": {
    "id": "org_4Tn9wb",
    "name": "Acme Inc",
    "slug": "acme",
    "plan": "pro"
  }
}`;

  const membersResponse = `{
  "members": [
    {
      "id": "usr_8Kx2mZq",
      "name": "Ada Lovelace",
      "email": "ada@acme.dev",
      "role": "owner",
      "joined_at": "2026-01-04T09:31:22.000Z"
    },
    {
      "id": "usr_b3Pl0Rd",
      "name": "Alan Turing",
      "email": "alan@acme.dev",
      "role": "member",
      "joined_at": "2026-02-18T14:08:51.000Z"
    }
  ]
}`;

  const usageResponse = `{
  "window": "30d",
  "total_events": 412,
  "by_action": {
    "api_key.used": 240,
    "member.invited": 12,
    "org.updated": 4
  }
}`;

  const verifySnippet = `import { createHmac, timingSafeEqual } from 'crypto';

// Verify an incoming webhook. Pass the RAW request body (not re-serialized
// JSON), the X-Webhook-Signature header, and your endpoint signing secret.
export function verifySignature(
  secret: string,
  header: string,
  rawBody: string,
  toleranceSec = 300,
): boolean {
  // header looks like:  t=1717000000,v1=<hex hmac>
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=')));
  const t = Number(parts['t']);
  const v1 = parts['v1'];
  if (!t || !v1) return false;

  // Reject stale timestamps to prevent replay attacks.
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;

  const expected = createHmac('sha256', secret)
    .update(\`\${t}.\${rawBody}\`)
    .digest('hex');

  const a = Buffer.from(v1);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}`;

  const webhookHeaders = `POST /your-endpoint HTTP/1.1
Content-Type: application/json
User-Agent: Saasly-Webhooks/1.0
X-Webhook-Id: whd_8Kx2mZq...
X-Webhook-Event: member.invited
X-Webhook-Timestamp: 1717000000
X-Webhook-Signature: t=1717000000,v1=8f3a...c91b

{
  "id": "evt_8Kx2mZq...",
  "type": "member.invited",
  "created_at": "2026-05-27T10:00:00.000Z",
  "data": { "...": "event-specific payload" }
}`;

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* ───────── Top bar ───────── */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-white"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <Sparkles className="w-4 h-4" strokeWidth={2.25} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
              {PRODUCT_NAME}
            </span>
            <span
              className="ml-1 hidden sm:inline-flex chip"
              style={{ fontSize: '11px' }}
            >
              Docs
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="btn btn-secondary btn-sm">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to app
            </Link>
          </div>
        </div>
      </header>

      {/* ───────── Template banner ───────── */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-7xl mx-auto px-6 py-2.5">
          <div className="banner banner-accent" style={{ padding: '10px 14px' }}>
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <p className="text-[13px] leading-relaxed">
              These docs ship with the template — edit <InlineCode>app/docs/page.tsx</InlineCode> to make
              them yours.
            </p>
          </div>
        </div>
      </div>

      {/* ───────── Body: sidebar + content ───────── */}
      <div className="max-w-7xl mx-auto w-full px-6 flex-1 flex flex-col md:flex-row gap-10 py-10">
        {/* Sidebar TOC */}
        <aside className="md:w-56 md:flex-shrink-0">
          <nav
            className="md:sticky md:top-24 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0"
            aria-label="Documentation sections"
          >
            <p
              className="hidden md:block text-[11px] font-semibold uppercase tracking-widest mb-2 px-3"
              style={{ color: 'var(--muted)' }}
            >
              On this page
            </p>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors hover:bg-[color:var(--bg-subtle)]"
                style={{ color: 'var(--muted-strong)' }}
              >
                <s.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 max-w-3xl">
          {/* Intro */}
          <div className="pb-2">
            <span className="chip chip-accent mb-4">DOCUMENTATION</span>
            <h1 className="text-4xl md:text-5xl font-semibold mt-4 mb-4" style={{ letterSpacing: '-0.03em' }}>
              {PRODUCT_NAME} developer docs
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--muted-strong)' }}>
              Everything you need to run, integrate with, and customize this SaaS foundation — auth,
              multi-tenancy, the public REST API, webhooks, and billing.
            </p>
          </div>

          {/* 1. Overview */}
          <Section id="overview" icon={BookOpen} title="Overview">
            <P>
              This starter is a multi-tenant SaaS foundation built on Next.js 16, Drizzle ORM over
              SQLite, and Stripe. The plumbing every product needs is already wired together so you
              can focus on your actual features.
            </P>
            <Bullets
              items={[
                <>
                  <strong>Authentication</strong> — JWT sessions in httpOnly cookies, email
                  verification, and password reset.
                </>,
                <>
                  <strong>Two-factor auth</strong> — TOTP via authenticator apps with QR setup and
                  one-time recovery codes.
                </>,
                <>
                  <strong>Multi-tenancy</strong> — organizations with <InlineCode>owner</InlineCode>,{' '}
                  <InlineCode>admin</InlineCode>, and <InlineCode>member</InlineCode> roles, plus
                  invite-by-email.
                </>,
                <>
                  <strong>Billing</strong> — Stripe Checkout, Customer Portal, and webhook-driven plan
                  updates across three tiers.
                </>,
                <>
                  <strong>Public REST API</strong> — Bearer API keys under <InlineCode>/v1</InlineCode>{' '}
                  with a per-key rate limit.
                </>,
                <>
                  <strong>Outgoing webhooks</strong> — signed, retried event delivery to customer
                  endpoints.
                </>,
                <>
                  <strong>Audit log</strong> — every meaningful action recorded with actor, IP, and
                  timestamp.
                </>,
              ]}
            />
          </Section>

          {/* 2. Getting started */}
          <Section id="getting-started" icon={Rocket} title="Getting started">
            <P>
              The app runs out of the box with just <InlineCode>JWT_SECRET</InlineCode> set. Email
              (Resend) and Stripe are optional — without their keys, billing buttons are disabled and
              emails are printed to the server console.
            </P>
            <H3>1. Install and configure</H3>
            <CodeBlock
              language="bash"
              code={`# Clone and enter the project
git clone <your-repo-url> ${PRODUCT_NAME.toLowerCase()}
cd ${PRODUCT_NAME.toLowerCase()}

# Copy the example environment file
cp .env.example .env

# Generate a strong JWT signing secret and paste it into .env as JWT_SECRET
openssl rand -base64 32

# Install dependencies
npm install`}
            />
            <H3>2. Migrate and run</H3>
            <CodeBlock
              language="bash"
              code={`# Create the SQLite schema (also runs automatically on first boot)
npm run db:migrate

# Start the dev server on http://localhost:3000
npm run dev`}
            />
            <P>
              Open <InlineCode>http://localhost:3000</InlineCode> and create your first account — the
              first user of an organization becomes its <InlineCode>owner</InlineCode>.
            </P>
            <H3>Environment variables</H3>
            <Bullets
              items={[
                <>
                  <InlineCode>JWT_SECRET</InlineCode> — <strong>required</strong>. Signs session JWTs;
                  the app refuses to start in production without it.
                </>,
                <>
                  <InlineCode>DB_PATH</InlineCode> — SQLite file path (defaults to{' '}
                  <InlineCode>./local.db</InlineCode>).
                </>,
                <>
                  <InlineCode>NEXT_PUBLIC_APP_URL</InlineCode> and <InlineCode>APP_NAME</InlineCode> —
                  used in email links and UI copy.
                </>,
                <>
                  <InlineCode>RESEND_API_KEY</InlineCode> / <InlineCode>EMAIL_FROM</InlineCode> —
                  optional, for transactional email.
                </>,
                <>
                  <InlineCode>STRIPE_SECRET_KEY</InlineCode>,{' '}
                  <InlineCode>STRIPE_WEBHOOK_SECRET</InlineCode>,{' '}
                  <InlineCode>STRIPE_PRO_PRICE_ID</InlineCode>,{' '}
                  <InlineCode>STRIPE_ENTERPRISE_PRICE_ID</InlineCode> — optional, for billing.
                </>,
              ]}
            />
          </Section>

          {/* 3. Authentication */}
          <Section id="authentication" icon={ShieldCheck} title="Authentication">
            <P>
              Sessions are stateless JWTs (signed with <InlineCode>HS256</InlineCode> via{' '}
              <InlineCode>jose</InlineCode>) stored in an httpOnly, <InlineCode>SameSite=Lax</InlineCode>{' '}
              cookie named <InlineCode>session</InlineCode>. Tokens expire after 7 days and are marked{' '}
              <InlineCode>Secure</InlineCode> in production.
            </P>
            <H3>Revocable sessions</H3>
            <P>
              Each login also writes a row to the <InlineCode>sessions</InlineCode> table with the
              device IP and user agent. The token embeds that <InlineCode>sessionId</InlineCode>, so a
              session can be revoked server-side at any time — revoked or expired sessions are rejected
              on the next request, and <InlineCode>last_active_at</InlineCode> is touched on every
              check.
            </P>
            <H3>Two-factor authentication</H3>
            <P>
              2FA is optional per user and uses TOTP (RFC 6238) compatible with any authenticator app.
              Setup shows a QR code; on enrollment the user receives one-time recovery codes to store
              safely.
            </P>
            <H3>Email verification & password reset</H3>
            <P>
              Verification and reset flows issue single-use, expiring tokens delivered by email. With
              no <InlineCode>RESEND_API_KEY</InlineCode> set, those emails are printed to the server
              console so you can copy the link during local development.
            </P>
          </Section>

          {/* 4. Organizations & roles */}
          <Section id="organizations" icon={Users} title="Organizations & roles">
            <P>
              Every user belongs to one or more organizations, and all data is scoped by{' '}
              <InlineCode>org_id</InlineCode>. There are three roles:
            </P>
            <Bullets
              items={[
                <>
                  <InlineCode>owner</InlineCode> — full control, including billing and deleting the
                  organization. The creator of an org is its first owner.
                </>,
                <>
                  <InlineCode>admin</InlineCode> — manage members, invitations, API keys, and webhooks.
                </>,
                <>
                  <InlineCode>member</InlineCode> — standard access to the product.
                </>,
              ]}
            />
            <H3>Invitations</H3>
            <P>
              Owners and admins invite teammates by email. Each invite generates a token-based
              acceptance link; the recipient joins the org on acceptance, subject to the plan&apos;s
              member limit. Invite, join, removal, and role-change events are all recorded in the audit
              log and emitted as webhooks.
            </P>
          </Section>

          {/* 5. REST API */}
          <Section id="rest-api" icon={Zap} title="REST API (/v1)">
            <P>
              The public API lives under <InlineCode>/v1</InlineCode> and is authenticated with an API
              key passed as a Bearer token. Generate keys from the dashboard; only a hashed copy is
              stored, so the full key is shown once at creation.
            </P>
            <CodeBlock
              language="bash"
              code={`curl ${apiBase}/v1/me \\
  -H "Authorization: Bearer sk_live_your_api_key"`}
            />
            <P>
              Keys are scoped to the organization that created them. Requests are limited to{' '}
              <strong>60 requests per minute per key</strong>; over the limit returns{' '}
              <InlineCode>429</InlineCode> with <InlineCode>Retry-After</InlineCode> and{' '}
              <InlineCode>X-RateLimit-*</InlineCode> headers. Missing or invalid keys return{' '}
              <InlineCode>401</InlineCode>.
            </P>

            <H3 id="rest-api-me">GET /v1/me</H3>
            <P>Returns the authenticated user and their organization.</P>
            <CodeBlock
              language="bash"
              code={`curl ${apiBase}/v1/me \\
  -H "Authorization: Bearer sk_live_your_api_key"`}
            />
            <CodeBlock language="json" code={meResponse} />

            <H3 id="rest-api-members">GET /v1/members</H3>
            <P>Lists every member of the organization, oldest first.</P>
            <CodeBlock
              language="bash"
              code={`curl ${apiBase}/v1/members \\
  -H "Authorization: Bearer sk_live_your_api_key"`}
            />
            <CodeBlock language="json" code={membersResponse} />

            <H3 id="rest-api-usage">GET /v1/usage</H3>
            <P>
              Returns a 30-day breakdown of audit-log activity for the organization, grouped by action.
            </P>
            <CodeBlock
              language="bash"
              code={`curl ${apiBase}/v1/usage \\
  -H "Authorization: Bearer sk_live_your_api_key"`}
            />
            <CodeBlock language="json" code={usageResponse} />
          </Section>

          {/* 6. Webhooks */}
          <Section id="webhooks" icon={Webhook} title="Webhooks">
            <P>
              Register endpoints in the dashboard to receive events as they happen. Each delivery is a{' '}
              <InlineCode>POST</InlineCode> with a JSON envelope and is retried with exponential backoff
              (~1m, 5m, 30m, 2h, 6h) for up to 5 attempts.
            </P>

            <H3>Event catalog</H3>
            <P>The following events are emitted. Subscribe to specific events or to all with <InlineCode>*</InlineCode>.</P>
            <div className="flex flex-wrap gap-2 mb-4">
              {WEBHOOK_EVENTS.map((event) => (
                <span
                  key={event}
                  className="font-mono text-[12px]"
                  style={{
                    backgroundColor: 'var(--code-bg)',
                    color: 'var(--fg)',
                    padding: '4px 9px',
                    borderRadius: '5px',
                    border: '1px solid var(--border)',
                  }}
                >
                  {event}
                </span>
              ))}
            </div>

            <H3>Request format</H3>
            <P>
              Each request carries identifying headers and an HMAC signature. The body is the raw JSON
              envelope — verify against exactly the bytes you receive.
            </P>
            <CodeBlock language="http" code={webhookHeaders} />

            <H3>Signature scheme</H3>
            <P>
              The <InlineCode>X-Webhook-Signature</InlineCode> header is Stripe/Svix-style. The signed
              payload is <InlineCode>{`${'${timestamp}'}.${'${rawBody}'}`}</InlineCode>, and the header
              is <InlineCode>{`t=${'${timestamp}'},v1=${'${hmac_sha256_hex}'}`}</InlineCode> where the
              HMAC is keyed by your endpoint signing secret (a value starting with{' '}
              <InlineCode>whsec_</InlineCode>). Recompute the HMAC, compare in constant time, and reject
              timestamps outside a tolerance window (300s by default) to prevent replay.
            </P>

            <H3>Verifying in Node</H3>
            <CodeBlock language="ts" code={verifySnippet} />
          </Section>

          {/* 7. Billing */}
          <Section id="billing" icon={CreditCard} title="Billing">
            <P>
              Billing is powered by Stripe: subscription Checkout for upgrades, the Customer Portal for
              self-serve plan and payment-method changes, and a webhook at{' '}
              <InlineCode>/api/stripe/webhook</InlineCode> that keeps each organization&apos;s plan in
              sync. Without <InlineCode>STRIPE_SECRET_KEY</InlineCode>, the billing UI renders but
              checkout is disabled.
            </P>
            <H3>Plans</H3>
            <div className="overflow-hidden rounded-lg my-4" style={{ border: '1px solid var(--border)' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Price / mo</th>
                    <th>Member limit</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(PLANS).map((plan) => (
                    <tr key={plan.id}>
                      <td className="font-medium">{plan.name}</td>
                      <td className="font-mono">${plan.price}</td>
                      <td>{plan.memberLimit === Infinity ? 'Unlimited' : plan.memberLimit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <P>
              The <InlineCode>Starter</InlineCode> plan is free and needs no Stripe configuration. For{' '}
              <InlineCode>Pro</InlineCode> and <InlineCode>Enterprise</InlineCode>, create recurring
              prices in Stripe and set <InlineCode>STRIPE_PRO_PRICE_ID</InlineCode> and{' '}
              <InlineCode>STRIPE_ENTERPRISE_PRICE_ID</InlineCode>. For local testing, forward events
              with <InlineCode>stripe listen --forward-to localhost:3000/api/stripe/webhook</InlineCode>.
            </P>
          </Section>

          {/* 8. Customizing */}
          <Section id="customizing" icon={Settings2} title="Customizing">
            <P>
              This is your starting point — most products only need to swap branding, adjust the plans,
              and tweak copy. Here&apos;s where the knobs live:
            </P>
            <Bullets
              items={[
                <>
                  <strong>Branding</strong> — the product name and gradient logo live in{' '}
                  <InlineCode>app/page.tsx</InlineCode> and the shared layout; colors and typography are
                  design tokens in <InlineCode>app/globals.css</InlineCode>.
                </>,
                <>
                  <strong>Plans & pricing</strong> — edit the <InlineCode>PLANS</InlineCode> object in{' '}
                  <InlineCode>lib/stripe.ts</InlineCode> (names, prices, member limits, features), then
                  wire the matching Stripe price IDs.
                </>,
                <>
                  <strong>Email templates</strong> — change subject lines and HTML in{' '}
                  <InlineCode>lib/email.ts</InlineCode>.
                </>,
                <>
                  <strong>These docs</strong> — edit <InlineCode>app/docs/page.tsx</InlineCode> to match
                  your product.
                </>,
              ]}
            />
            <H3>Swapping SQLite → Postgres</H3>
            <P>
              The app ships with SQLite (WAL mode) via Drizzle for a zero-config start. To move to
              Postgres, switch the Drizzle driver in <InlineCode>lib/db.ts</InlineCode> from{' '}
              <InlineCode>better-sqlite3</InlineCode> to a Postgres driver (e.g.{' '}
              <InlineCode>postgres</InlineCode> with <InlineCode>drizzle-orm/postgres-js</InlineCode>),
              point <InlineCode>DB_PATH</InlineCode>/your connection string at the new database, and
              re-run the migrations. Note that a couple of raw queries (such as the{' '}
              <InlineCode>/v1/usage</InlineCode> 30-day window using{' '}
              <InlineCode>datetime(&apos;now&apos;, &apos;-30 days&apos;)</InlineCode>) use SQLite
              syntax and need a Postgres equivalent.
            </P>
          </Section>

          {/* Footer */}
          <footer className="pt-10 mt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
              Built with the {PRODUCT_NAME} SaaS Starter — Next.js 16, Drizzle, and Stripe.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
