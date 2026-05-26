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
} from 'lucide-react';
import { PLANS } from '@/lib/stripe';

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
            <a
              href="https://github.com"
              className="hover:text-[color:var(--fg)] transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              Docs
            </a>
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
