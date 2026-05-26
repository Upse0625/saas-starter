'use client';

import { Suspense, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Sparkles,
} from 'lucide-react';

interface LoginResponse {
  requires2fa?: boolean;
  token?: string;
  error?: string;
}

interface ChallengeResponse {
  error?: string;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetOk = searchParams.get('reset') === 'ok';
  const nextParam = searchParams.get('next');
  const dest = nextParam && nextParam.startsWith('/') ? nextParam : '/dashboard';
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 2FA challenge state
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    startTransition(async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as LoginResponse;

      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }

      if (data.requires2fa && data.token) {
        setChallengeToken(data.token);
        setCode('');
        setUseRecovery(false);
        return;
      }

      router.push(dest);
      router.refresh();
    });
  }

  async function handleChallenge(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!challengeToken) return;

    startTransition(async () => {
      const res = await fetch('/api/auth/2fa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: challengeToken, code: code.trim() }),
      });

      if (res.ok) {
        router.push(dest);
        router.refresh();
        return;
      }

      const data = (await res.json()) as ChallengeResponse;
      setError(data.error ?? 'Verification failed');
    });
  }

  function cancelChallenge() {
    setChallengeToken(null);
    setCode('');
    setError(null);
    setUseRecovery(false);
  }

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
              'radial-gradient(60% 50% at 30% 20%, rgba(99, 102, 241, 0.35) 0%, transparent 70%), radial-gradient(40% 40% at 80% 80%, rgba(236, 72, 153, 0.25) 0%, transparent 70%)',
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

        <blockquote className="relative max-w-md anim-fade-up delay-2">
          <p className="text-2xl font-medium leading-relaxed" style={{ letterSpacing: '-0.015em' }}>
            &ldquo;We replaced six months of plumbing in a weekend. Sessions, billing, and audit logs
            all worked the way I&apos;d build them — just done.&rdquo;
          </p>
          <footer className="mt-6 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #f472b6, #c084fc)' }}
            >
              A
            </div>
            <div>
              <p className="text-sm font-semibold">Alex Rivera</p>
              <p className="text-xs" style={{ color: 'rgba(226, 232, 240, 0.7)' }}>
                Co-founder, Lattice
              </p>
            </div>
          </footer>
        </blockquote>

        <p className="relative text-xs anim-fade-up delay-3" style={{ color: 'rgba(226, 232, 240, 0.6)' }}>
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
              {challengeToken ? 'Verify it’s you' : 'Welcome back'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-strong)' }}>
              {challengeToken
                ? useRecovery
                  ? 'Enter one of your saved recovery codes.'
                  : 'Enter the 6-digit code from your authenticator app.'
                : 'Sign in to continue to your dashboard.'}
            </p>
          </div>

          {resetOk && !challengeToken && (
            <div className="banner banner-green mb-5 text-sm anim-fade-up delay-1">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Password updated. Sign in with your new password.</span>
            </div>
          )}

          <div className="anim-fade-up delay-2">
            {!challengeToken && (
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="banner banner-red text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input"
                    placeholder="you@company.com"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium"
                      style={{ color: 'var(--accent)' }}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="input"
                    placeholder="Enter your password"
                  />
                </div>

                <button type="submit" disabled={isPending} className="btn btn-primary w-full mt-2">
                  {isPending ? (
                    <>
                      <span className="spinner" />
                      Signing in
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {challengeToken && (
              <form onSubmit={handleChallenge} className="space-y-4">
                <div className="card p-5 flex items-start gap-3" style={{ backgroundColor: 'var(--accent-soft)', borderColor: '#c7d2fe' }}>
                  <KeyRound className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-hover)' }} />
                  <p className="text-sm" style={{ color: 'var(--accent-hover)' }}>
                    Two-factor authentication is enabled on this account.
                  </p>
                </div>

                {error && (
                  <div className="banner banner-red text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="code" className="block text-sm font-medium mb-1.5">
                    {useRecovery ? 'Recovery code' : 'Authentication code'}
                  </label>
                  <input
                    id="code"
                    name="code"
                    type="text"
                    inputMode={useRecovery ? 'text' : 'numeric'}
                    pattern={useRecovery ? undefined : '[0-9]*'}
                    autoComplete="one-time-code"
                    maxLength={useRecovery ? 32 : 6}
                    value={code}
                    onChange={(e) =>
                      setCode(useRecovery ? e.target.value : e.target.value.replace(/\D/g, ''))
                    }
                    required
                    autoFocus
                    className="input"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: useRecovery ? 'normal' : '0.4em',
                      textAlign: useRecovery ? 'left' : 'center',
                      fontSize: useRecovery ? '14px' : '20px',
                    }}
                    placeholder={useRecovery ? 'a1b2c3d4e5' : '000000'}
                  />
                </div>

                <button type="submit" disabled={isPending} className="btn btn-primary w-full">
                  {isPending ? (
                    <>
                      <span className="spinner" />
                      Verifying
                    </>
                  ) : (
                    <>
                      Verify and continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setUseRecovery(!useRecovery);
                      setCode('');
                      setError(null);
                    }}
                    className="font-medium"
                    style={{ color: 'var(--accent)' }}
                  >
                    {useRecovery ? '← Use authenticator' : 'Use recovery code instead'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelChallenge}
                    style={{ color: 'var(--muted)' }}
                    className="font-medium hover:text-[color:var(--fg)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {!challengeToken && (
            <p className="text-center mt-8 text-sm anim-fade-up delay-3" style={{ color: 'var(--muted-strong)' }}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-medium" style={{ color: 'var(--accent)' }}>
                Sign up
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
