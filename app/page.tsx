import Link from 'next/link';
import {
  ArrowRight,
  Check,
  KeyRound,
  ShieldCheck,
  Users,
  CreditCard,
  Activity,
  Zap,
  Mail,
  Database,
  Sparkles,
  Webhook,
  Plus,
  Quote,
} from 'lucide-react';
import { PLANS } from '@/lib/stripe';

const testimonials = [
  {
    quote:
      'Shipped my MVP in a weekend instead of a month. Auth, billing, and teams were already wired together — I just built my actual product on top.',
    name: 'Alex Rivera',
    role: 'Indie founder',
    company: 'solo',
  },
  {
    quote:
      'The multi-tenancy and audit log saved us weeks. It is the boring infrastructure we always end up rebuilding, done properly out of the box.',
    name: 'Priya Nair',
    role: 'CTO',
    company: 'seed-stage startup',
  },
  {
    quote:
      'Clean code, sensible defaults, real TypeScript types everywhere. The Stripe webhooks just worked. Easily paid for itself on day one.',
    name: 'Marcus Lee',
    role: 'Lead engineer',
    company: 'B2B SaaS',
  },
];

const faqs = [
  {
    q: "What's included?",
    a: 'Everything you need to launch a SaaS: email/password auth with JWT sessions, two-factor auth (TOTP), email verification and password reset, organizations with member roles and email invites, Stripe subscription billing, hashed API keys with a public /v1 REST API, an audit log, and transactional email via Resend — all pre-wired in Next.js 16 with Drizzle ORM and TypeScript.',
  },
  {
    q: 'Can I use it commercially?',
    a: 'Yes. The license lets you build and ship your own projects and products — including commercial ones — and modify the code freely. The only restriction is that you cannot repackage and resell it as a competing starter template or boilerplate.',
  },
  {
    q: 'SQLite or Postgres?',
    a: 'The starter ships on SQLite (WAL mode, with indexed hot paths) so you can run it locally with zero setup. Because data access goes through Drizzle ORM, the schema and queries port cleanly to Postgres or another supported database when you are ready to scale.',
  },
  {
    q: 'Does it support Stripe?',
    a: 'Yes. Subscription Checkout, the Customer Portal, and webhook-driven plan updates are all wired up across three tiers (Starter, Pro, Enterprise). Drop in your Stripe secret key and price IDs and billing works end to end.',
  },
  {
    q: 'Is there a license restriction?',
    a: 'It is MIT with a single non-compete clause: you may use, modify, and ship it in your own apps and commercial products, but you may not resell or redistribute it — in whole or substantial part — as a competing starter template, boilerplate, or scaffold.',
  },
  {
    q: 'Do I get updates?',
    a: 'Yes. Buyers receive updates as the starter evolves — bug fixes, dependency bumps, and new building blocks. You keep using whatever version you have shipped; pull in updates on your own schedule.',
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: 'Auth & sessions',
    description:
      'JWT cookies, email verification, password reset, and active session management with per-device revoke.',
  },
  {
    icon: KeyRound,
    title: 'Two-factor auth',
    description:
      'TOTP via authenticator apps with QR setup and one-time recovery codes. Optional per user.',
  },
  {
    icon: Users,
    title: 'Multi-tenancy',
    description:
      'Organizations, member roles, and invite-by-email with token-based acceptance — the boring stuff, done right.',
  },
  {
    icon: Zap,
    title: 'API keys & /v1',
    description:
      'Hashed API keys with prefixes, per-key rate limits, and a public REST API authenticated by Bearer token.',
  },
  {
    icon: CreditCard,
    title: 'Stripe billing',
    description:
      'Subscription Checkout, Customer Portal, and webhook-driven plan updates — three tiers wired up.',
  },
  {
    icon: Activity,
    title: 'Audit log',
    description:
      'Every meaningful action recorded with actor, IP, and timestamp. Indexed and paginated by default.',
  },
  {
    icon: Mail,
    title: 'Transactional email',
    description:
      'Resend integration for verification, password resets, and team invitations — with sane retries.',
  },
  {
    icon: Database,
    title: 'Production-ready',
    description:
      'SQLite WAL mode, indexed hot paths, and observability via the audit feed. Ship the boring parts on day one.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* ───────── Nav ───────── */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
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
              Saasly
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm" style={{ color: 'var(--muted-strong)' }}>
            <a href="#features" className="hover:text-[color:var(--fg)] transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-[color:var(--fg)] transition-colors">
              Pricing
            </a>
            <Link href="/docs" className="hover:text-[color:var(--fg)] transition-colors">
              Docs
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm">
              Get started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ───────── Hero ───────── */}
      <section className="relative hero-surface hero-grid">
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-32 md:pt-32 md:pb-40 flex flex-col items-center text-center">
          <div
            className="anim-fade-up delay-0 inline-flex items-center gap-2 mb-7 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid var(--border)',
              color: 'var(--muted-strong)',
              boxShadow: 'var(--shadow-xs)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full anim-pulse-dot"
              style={{ backgroundColor: 'var(--status-green)' }}
            />
            New — Two-factor auth & audit log shipped
          </div>

          <h1
            className="anim-fade-up delay-1 text-5xl md:text-7xl font-semibold leading-[1.02] mb-6 max-w-4xl"
            style={{ letterSpacing: '-0.035em', color: 'var(--fg)' }}
          >
            The SaaS foundation
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              you don&apos;t have to rebuild.
            </span>
          </h1>

          <p
            className="anim-fade-up delay-2 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed"
            style={{ color: 'var(--muted-strong)' }}
          >
            Auth, billing, team management, multi-tenancy, audit logs — pre-wired and production-ready.
            Skip the plumbing, build your product.
          </p>

          <div className="anim-fade-up delay-3 flex flex-col sm:flex-row gap-3">
            <Link href="/signup" className="btn btn-primary" style={{ padding: '14px 22px', fontSize: '15px' }}>
              Start building free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="btn btn-secondary" style={{ padding: '14px 22px', fontSize: '15px' }}>
              Sign in
            </Link>
          </div>

          {/* Tech stack */}
          <div
            className="anim-fade-up delay-4 mt-14 pt-8 w-full max-w-3xl flex flex-wrap justify-center gap-x-8 gap-y-3"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <p className="text-xs font-medium uppercase tracking-widest w-full mb-1" style={{ color: 'var(--muted)' }}>
              Built with
            </p>
            {['Next.js 16', 'Drizzle ORM', 'SQLite', 'Stripe', 'JWT Auth', 'TypeScript'].map((tech) => (
              <span key={tech} className="text-sm font-medium" style={{ color: 'var(--muted-strong)' }}>
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Features ───────── */}
      <section
        id="features"
        className="py-24 md:py-32 px-6"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-16">
            <span className="chip chip-accent mb-4">FEATURES</span>
            <h2
              className="text-3xl md:text-5xl font-semibold mt-4 mb-5"
              style={{ letterSpacing: '-0.025em' }}
            >
              Everything a SaaS needs, on day one.
            </h2>
            <p className="text-lg" style={{ color: 'var(--muted-strong)', lineHeight: 1.6 }}>
              Eight months of plumbing distilled into one tightly-integrated starter. Each piece is
              wired together — not glued.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`card p-6 anim-fade-up delay-${Math.min(i, 7)} group`}
                style={{ transition: 'border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease' }}
              >
                <span
                  className="inline-flex items-center justify-center w-10 h-10 rounded-md mb-4 transition-colors"
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    color: 'var(--accent)',
                  }}
                >
                  <feature.icon className="w-5 h-5" strokeWidth={1.75} />
                </span>
                <h3 className="font-semibold mb-2 text-[15px]">{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-strong)' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Features deep-dive ───────── */}
      <section
        className="py-24 md:py-32 px-6"
        style={{ backgroundColor: 'var(--bg-subtle)', borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-20">
            <span className="chip chip-accent mb-4">UNDER THE HOOD</span>
            <h2 className="text-3xl md:text-5xl font-semibold mt-4 mb-5" style={{ letterSpacing: '-0.025em' }}>
              Not a demo. The real plumbing.
            </h2>
            <p className="text-lg" style={{ color: 'var(--muted-strong)', lineHeight: 1.6 }}>
              Each system is built the way you would build it for production — typed end to end, indexed,
              and integrated with the rest of the stack.
            </p>
          </div>

          <div className="flex flex-col gap-20 md:gap-28">
            {/* Row 1 — Auth & 2FA */}
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              <div>
                <span
                  className="inline-flex items-center justify-center w-10 h-10 rounded-md mb-5"
                  style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
                </span>
                <h3 className="text-2xl md:text-3xl font-semibold mb-3" style={{ letterSpacing: '-0.02em' }}>
                  Authentication &amp; 2FA, handled.
                </h3>
                <p className="text-base mb-5" style={{ color: 'var(--muted-strong)', lineHeight: 1.65 }}>
                  Email and password sign-in backed by JWT cookies, verification emails, and password resets.
                  Add a second factor with TOTP authenticator apps and one-time recovery codes — opt-in per user.
                </p>
                <ul className="space-y-2.5">
                  {[
                    'JWT cookie sessions with per-device revoke',
                    'TOTP 2FA with QR setup & recovery codes',
                    'Email verification and password reset flows',
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--status-green)' }} strokeWidth={2.5} />
                      <span style={{ color: 'var(--muted-strong)' }}>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-elev p-6 md:p-7">
                <div className="flex items-center gap-2 mb-5">
                  <KeyRound className="w-4 h-4" style={{ color: 'var(--accent)' }} strokeWidth={2} />
                  <span className="text-sm font-semibold">Two-factor authentication</span>
                  <span className="chip chip-green ml-auto">Enabled</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div
                    className="aspect-square rounded-md"
                    style={{
                      backgroundColor: 'var(--bg-muted)',
                      backgroundImage:
                        'repeating-conic-gradient(var(--fg) 0% 25%, transparent 0% 50%)',
                      backgroundSize: '14px 14px',
                      opacity: 0.85,
                    }}
                    aria-hidden="true"
                  />
                  <div className="flex flex-col justify-center gap-2">
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>Recovery codes</p>
                    {['7f2a-9c1d', 'b4e8-03af', 'd91c-5e7b'].map((code) => (
                      <code
                        key={code}
                        className="font-mono text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: 'var(--code-bg)', color: 'var(--fg)' }}
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
                <div
                  className="flex items-center justify-between text-sm rounded-md px-3 py-2.5"
                  style={{ backgroundColor: 'var(--status-green-soft)', color: '#047857' }}
                >
                  <span className="font-medium">Verified · 6-digit code</span>
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Row 2 — Multi-tenancy (visual left) */}
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              <div className="md:order-2">
                <span
                  className="inline-flex items-center justify-center w-10 h-10 rounded-md mb-5"
                  style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  <Users className="w-5 h-5" strokeWidth={1.75} />
                </span>
                <h3 className="text-2xl md:text-3xl font-semibold mb-3" style={{ letterSpacing: '-0.02em' }}>
                  Multi-tenancy &amp; roles built in.
                </h3>
                <p className="text-base mb-5" style={{ color: 'var(--muted-strong)', lineHeight: 1.65 }}>
                  Organizations are first-class. Invite teammates by email with token-based acceptance,
                  assign roles, and scope every query to the active tenant — no bolt-on workarounds.
                </p>
                <ul className="space-y-2.5">
                  {[
                    'Organizations with owner / admin / member roles',
                    'Email invites with secure token acceptance',
                    'Tenant-scoped data access throughout',
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--status-green)' }} strokeWidth={2.5} />
                      <span style={{ color: 'var(--muted-strong)' }}>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-elev p-6 md:p-7 md:order-1">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold">Acme Inc · Members</span>
                  <span className="chip">4 / 25</span>
                </div>
                <div className="flex flex-col">
                  {[
                    { initials: 'JS', name: 'Jordan Sims', role: 'Owner', tone: 'chip-accent' },
                    { initials: 'PN', name: 'Priya Nair', role: 'Admin', tone: 'chip' },
                    { initials: 'MK', name: 'Mei Kim', role: 'Member', tone: 'chip' },
                    { initials: 'TR', name: 'Tom Reyes', role: 'Invited', tone: 'chip-amber' },
                  ].map((m, idx) => (
                    <div
                      key={m.name}
                      className="flex items-center gap-3 py-2.5"
                      style={{ borderTop: idx === 0 ? undefined : '1px solid var(--border-subtle)' }}
                    >
                      <span
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold text-white"
                        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                      >
                        {m.initials}
                      </span>
                      <span className="text-sm font-medium">{m.name}</span>
                      <span className={`chip ${m.tone} ml-auto`}>{m.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3 — Stripe billing */}
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              <div>
                <span
                  className="inline-flex items-center justify-center w-10 h-10 rounded-md mb-5"
                  style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  <CreditCard className="w-5 h-5" strokeWidth={1.75} />
                </span>
                <h3 className="text-2xl md:text-3xl font-semibold mb-3" style={{ letterSpacing: '-0.02em' }}>
                  Billing with Stripe, end to end.
                </h3>
                <p className="text-base mb-5" style={{ color: 'var(--muted-strong)', lineHeight: 1.65 }}>
                  Subscription Checkout, the Customer Portal, and webhook-driven plan changes are wired across
                  three tiers. Plan limits sync to your tenant automatically — add your keys and ship.
                </p>
                <ul className="space-y-2.5">
                  {[
                    'Checkout & Customer Portal sessions',
                    'Webhook-synced subscription state',
                    'Per-plan member & feature limits',
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--status-green)' }} strokeWidth={2.5} />
                      <span style={{ color: 'var(--muted-strong)' }}>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-elev p-6 md:p-7">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-sm font-semibold">Subscription</span>
                  <span className="chip chip-accent">Pro</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-4xl font-semibold font-mono" style={{ letterSpacing: '-0.03em' }}>
                    $29
                  </span>
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>/month</span>
                </div>
                <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>Renews on the 1st · via Stripe</p>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2.5 text-sm rounded-md px-3 py-2.5" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                    <CreditCard className="w-4 h-4" style={{ color: 'var(--muted)' }} strokeWidth={2} />
                    <span style={{ color: 'var(--muted-strong)' }}>Visa ending 4242</span>
                    <span className="chip chip-green ml-auto">Active</span>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm w-full" disabled>
                    Manage in Customer Portal
                  </button>
                </div>
              </div>
            </div>

            {/* Row 4 — Webhooks & API (visual left) */}
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              <div className="md:order-2">
                <span
                  className="inline-flex items-center justify-center w-10 h-10 rounded-md mb-5"
                  style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  <Webhook className="w-5 h-5" strokeWidth={1.75} />
                </span>
                <h3 className="text-2xl md:text-3xl font-semibold mb-3" style={{ letterSpacing: '-0.02em' }}>
                  Webhooks &amp; a public API.
                </h3>
                <p className="text-base mb-5" style={{ color: 'var(--muted-strong)', lineHeight: 1.65 }}>
                  Issue hashed API keys with prefixes and per-key rate limits, then let customers hit a
                  versioned <code className="font-mono text-sm px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--code-bg)' }}>/v1</code> REST API
                  authenticated by Bearer token. Stripe webhooks are verified and idempotent.
                </p>
                <ul className="space-y-2.5">
                  {[
                    'Hashed, prefixed API keys with rate limits',
                    'Bearer-authenticated public /v1 endpoints',
                    'Signature-verified, idempotent webhooks',
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--status-green)' }} strokeWidth={2.5} />
                      <span style={{ color: 'var(--muted-strong)' }}>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:order-1 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div
                  className="flex items-center gap-1.5 px-4 py-2.5"
                  style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f87171' }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#fbbf24' }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#34d399' }} />
                  <span className="ml-2 text-xs font-mono" style={{ color: 'var(--muted)' }}>terminal</span>
                </div>
                <pre
                  className="font-mono text-xs md:text-[13px] p-4 md:p-5 overflow-x-auto leading-relaxed"
                  style={{ backgroundColor: '#0f172a', color: '#e2e8f0' }}
                >
<span style={{ color: '#94a3b8' }}>$</span> curl https://api.saasly.dev/v1/members{'\n'}
{'  '}<span style={{ color: '#a5b4fc' }}>-H</span> <span style={{ color: '#86efac' }}>&quot;Authorization: Bearer sk_live_••••&quot;</span>{'\n'}
{'\n'}
<span style={{ color: '#64748b' }}>{'{'}</span>{'\n'}
{'  '}<span style={{ color: '#7dd3fc' }}>&quot;data&quot;</span>: [{'\n'}
{'    '}{'{'} <span style={{ color: '#7dd3fc' }}>&quot;id&quot;</span>: <span style={{ color: '#86efac' }}>&quot;mem_4f2a&quot;</span>, <span style={{ color: '#7dd3fc' }}>&quot;role&quot;</span>: <span style={{ color: '#86efac' }}>&quot;admin&quot;</span> {'}'},{'\n'}
{'    '}{'{'} <span style={{ color: '#7dd3fc' }}>&quot;id&quot;</span>: <span style={{ color: '#86efac' }}>&quot;mem_9c1d&quot;</span>, <span style={{ color: '#7dd3fc' }}>&quot;role&quot;</span>: <span style={{ color: '#86efac' }}>&quot;member&quot;</span> {'}'}{'\n'}
{'  '}],{'\n'}
{'  '}<span style={{ color: '#7dd3fc' }}>&quot;has_more&quot;</span>: <span style={{ color: '#fca5a5' }}>false</span>{'\n'}
<span style={{ color: '#64748b' }}>{'}'}</span>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Testimonials ───────── */}
      {/* Replace with real testimonials */}
      <section className="py-24 md:py-32 px-6" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="chip chip-accent mb-4">TESTIMONIALS</span>
            <h2 className="text-3xl md:text-5xl font-semibold mt-4 mb-4" style={{ letterSpacing: '-0.025em' }}>
              Loved by builders who ship.
            </h2>
            <p className="text-lg" style={{ color: 'var(--muted-strong)' }}>
              Founders and engineers who skipped the plumbing and got straight to their product.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <figure key={t.name} className={`card p-7 flex flex-col anim-fade-up delay-${i + 1}`}>
                <Quote className="w-7 h-7 mb-4" style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
                <blockquote className="text-[15px] leading-relaxed mb-6 flex-1" style={{ color: 'var(--fg)' }}>
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="flex items-center gap-3 pt-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <span
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                  >
                    {t.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{t.name}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {t.role} · {t.company}
                    </p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Pricing ───────── */}
      <section
        id="pricing"
        className="py-24 md:py-32 px-6"
        style={{ backgroundColor: 'var(--bg-subtle)', borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="chip chip-accent mb-4">PRICING</span>
            <h2
              className="text-3xl md:text-5xl font-semibold mt-4 mb-4"
              style={{ letterSpacing: '-0.025em' }}
            >
              Simple, transparent pricing.
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--muted-strong)' }}>
              Start free. Upgrade when you outgrow it. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {Object.values(PLANS).map((plan, i) => {
              const isHighlighted = plan.highlighted;
              return (
                <div
                  key={plan.id}
                  className={`anim-fade-up delay-${i + 1} p-7 flex flex-col ${
                    isHighlighted ? 'card-gradient' : 'card-elev'
                  }`}
                  style={{
                    transform: isHighlighted ? 'translateY(-8px)' : undefined,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    {isHighlighted && <span className="chip chip-accent">Most popular</span>}
                  </div>
                  <p className="text-sm mb-5" style={{ color: 'var(--muted-strong)' }}>
                    {plan.id === 'starter' && 'For solo builders kicking the tires.'}
                    {plan.id === 'pro' && 'For growing teams shipping fast.'}
                    {plan.id === 'enterprise' && 'For organizations that need more.'}
                  </p>

                  <div className="flex items-baseline gap-1.5 mb-6">
                    <span
                      className="text-5xl font-semibold"
                      style={{ letterSpacing: '-0.03em', fontFamily: 'var(--font-mono)' }}
                    >
                      ${plan.price}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>
                      /month
                    </span>
                  </div>

                  <Link
                    href="/signup"
                    className={`btn ${isHighlighted ? 'btn-primary' : 'btn-secondary'} w-full mb-6`}
                  >
                    {plan.price === 0 ? 'Start free' : `Get ${plan.name}`}
                  </Link>

                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check
                          className="w-4 h-4 mt-0.5 flex-shrink-0"
                          style={{ color: 'var(--status-green)' }}
                          strokeWidth={2.5}
                        />
                        <span style={{ color: 'var(--muted-strong)' }}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="py-24 md:py-32 px-6" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <span className="chip chip-accent mb-4">FAQ</span>
            <h2 className="text-3xl md:text-5xl font-semibold mt-4 mb-4" style={{ letterSpacing: '-0.025em' }}>
              Questions, answered.
            </h2>
            <p className="text-lg" style={{ color: 'var(--muted-strong)' }}>
              Everything you need to know before you buy.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {faqs.map((faq) => (
              <details key={faq.q} className="card group p-0 overflow-hidden">
                <summary
                  className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 select-none"
                  style={{ color: 'var(--fg)' }}
                >
                  <span className="text-[15px] font-semibold">{faq.q}</span>
                  <Plus
                    className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-open:rotate-45"
                    style={{ color: 'var(--muted)' }}
                    strokeWidth={2}
                  />
                </summary>
                <div className="px-5 pb-5 -mt-1">
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-strong)' }}>
                    {faq.a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="py-24 px-6" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-4xl mx-auto">
          <div
            className="relative overflow-hidden rounded-2xl p-10 md:p-16 text-center"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(60% 60% at 50% 0%, rgba(99, 102, 241, 0.45) 0%, transparent 70%)',
              }}
            />
            <div className="relative">
              <h2
                className="text-3xl md:text-4xl font-semibold mb-4 text-white"
                style={{ letterSpacing: '-0.025em' }}
              >
                Stop reinventing the foundation.
              </h2>
              <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: 'rgba(226, 232, 240, 0.85)' }}>
                Sign up in 30 seconds and start shipping the parts that actually matter.
              </p>
              <Link
                href="/signup"
                className="btn btn-primary"
                style={{
                  padding: '14px 22px',
                  fontSize: '15px',
                  background: '#ffffff',
                  color: '#0f172a',
                }}
              >
                Create your account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Footer ───────── */}
      <footer
        className="py-10 px-6 mt-auto"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.25} />
            </span>
            <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
              Saasly
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            &copy; {new Date().getFullYear()} Saasly — Built with Next.js 16, Drizzle, and Stripe
          </p>
        </div>
      </footer>
    </div>
  );
}
