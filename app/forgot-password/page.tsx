'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, AlertCircle, MailCheck, Sparkles } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? 'Could not process request. Please try again.');
          return;
        }
        setSubmitted(true);
      } catch {
        setError('Network error. Please try again.');
      }
    });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12 relative"
      style={{ background: 'linear-gradient(180deg, #fafaf9 0%, #f4f4f5 100%)' }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-6 anim-fade-up delay-0">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-white"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <Sparkles className="w-4 h-4" strokeWidth={2.25} />
            </span>
            <span className="text-base font-semibold tracking-tight">Saasly</span>
          </Link>
        </div>

        <div className="card-elev p-8 anim-fade-up delay-1">
          {submitted ? (
            <div className="text-center space-y-4">
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-full mx-auto"
                style={{ backgroundColor: 'var(--status-green-soft)' }}
              >
                <MailCheck className="w-6 h-6" style={{ color: 'var(--status-green)' }} />
              </div>
              <div>
                <h1 className="text-xl font-semibold mb-2" style={{ letterSpacing: '-0.02em' }}>
                  Check your inbox
                </h1>
                <p className="text-sm" style={{ color: 'var(--muted-strong)' }}>
                  If an account exists for that email, a reset link has been sent. Follow the link
                  to choose a new password.
                </p>
              </div>
              <Link href="/login" className="btn btn-primary w-full">
                Back to sign in
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium mb-5"
                style={{ color: 'var(--muted)' }}
              >
                <ArrowLeft className="w-3 h-3" /> Back to sign in
              </Link>
              <h1 className="text-2xl font-semibold mb-2" style={{ letterSpacing: '-0.02em' }}>
                Reset your password
              </h1>
              <p className="text-sm mb-6" style={{ color: 'var(--muted-strong)' }}>
                Enter your email and we&apos;ll send you a link to set a new password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
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

                <button type="submit" disabled={isPending} className="btn btn-primary w-full">
                  {isPending ? (
                    <>
                      <span className="spinner" />
                      Sending
                    </>
                  ) : (
                    <>
                      Send reset link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center mt-6 text-xs anim-fade-up delay-2" style={{ color: 'var(--muted)' }}>
          &copy; {new Date().getFullYear()} Saasly
        </p>
      </div>
    </div>
  );
}
