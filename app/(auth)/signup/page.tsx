'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, AlertCircle, Sparkles, Check } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const orgName = formData.get('orgName') as string;
    const password = formData.get('password') as string;

    startTransition(async () => {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, orgName, password }),
      });

      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Sign up failed');
      }
    });
  }

  const benefits = [
    'Auth, sessions, and 2FA out of the box',
    'Stripe billing with three plans pre-wired',
    'Multi-tenant orgs with role-based access',
    'Audit log for every meaningful event',
  ];

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Left side: branding */}
      <aside
        className="hidden lg:flex flex-col justify-between p-12 w-[44%] xl:w-[40%] relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
          color: '#ffffff',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(60% 50% at 70% 20%, rgba(99, 102, 241, 0.35) 0%, transparent 70%), radial-gradient(40% 40% at 20% 80%, rgba(236, 72, 153, 0.25) 0%, transparent 70%)',
          }}
        />
        <Link href="/" className="relative flex items-center gap-2.5 anim-fade-up delay-0">
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            <Sparkles className="w-4 h-4" strokeWidth={2.25} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Saasly</span>
        </Link>

        <div className="relative max-w-md anim-fade-up delay-2">
          <h2 className="text-3xl font-semibold mb-6 leading-tight" style={{ letterSpacing: '-0.02em' }}>
            Skip eight months of plumbing.
          </h2>
          <ul className="space-y-3">
            {benefits.map((b, i) => (
              <li
                key={b}
                className={`flex items-start gap-3 text-[15px] anim-fade-up delay-${i + 2}`}
                style={{ color: 'rgba(226, 232, 240, 0.92)' }}
              >
                <Check className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#a5b4fc' }} strokeWidth={2.25} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs anim-fade-up delay-6" style={{ color: 'rgba(226, 232, 240, 0.6)' }}>
          &copy; {new Date().getFullYear()} Saasly · Multi-tenant SaaS, fully wired.
        </p>
      </aside>

      {/* Right side: form */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm anim-fade-up delay-0"
            style={{ color: 'var(--muted)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </Link>

          <div className="mt-8 mb-8 anim-fade-up delay-1">
            <h1 className="text-3xl font-semibold mb-2" style={{ letterSpacing: '-0.025em' }}>
              Create your account
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-strong)' }}>
              Free forever on Starter — no credit card required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 anim-fade-up delay-2">
            {error && (
              <div className="banner banner-red text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1.5">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="input"
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="jane@company.com"
              />
            </div>

            <div>
              <label htmlFor="orgName" className="block text-sm font-medium mb-1.5">
                Organization name
              </label>
              <input
                id="orgName"
                name="orgName"
                type="text"
                required
                className="input"
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="input"
                placeholder="At least 8 characters"
              />
            </div>

            <button type="submit" disabled={isPending} className="btn btn-primary w-full mt-2">
              {isPending ? (
                <>
                  <span className="spinner" />
                  Creating account
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
              By creating an account you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>

          <p className="text-center mt-8 text-sm anim-fade-up delay-3" style={{ color: 'var(--muted-strong)' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-medium" style={{ color: 'var(--accent)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
