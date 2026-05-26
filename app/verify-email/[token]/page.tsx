import Link from 'next/link';
import { headers } from 'next/headers';
import { ArrowRight, CheckCircle2, XCircle, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface VerifyResult {
  ok: boolean;
  error?: string;
}

async function verify(token: string): Promise<VerifyResult> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? (host ? `${proto}://${host}` : 'http://localhost:3000');

  try {
    const res = await fetch(`${base}/api/auth/verify-email/${encodeURIComponent(token)}`, {
      method: 'POST',
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as VerifyResult;
    if (!res.ok) {
      return { ok: false, error: data.error ?? 'Verification failed' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[verify-email page]', err);
    return { ok: false, error: 'Could not reach verification service' };
  }
}

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await verify(token);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
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

        <div className="card-elev p-8 text-center anim-fade-up delay-1">
          {result.ok ? (
            <>
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto mb-5"
                style={{ backgroundColor: 'var(--status-green-soft)' }}
              >
                <CheckCircle2 className="w-7 h-7" style={{ color: 'var(--status-green)' }} />
              </div>
              <h1 className="text-2xl font-semibold mb-2" style={{ letterSpacing: '-0.02em' }}>
                Email verified
              </h1>
              <p className="text-sm mb-6" style={{ color: 'var(--muted-strong)' }}>
                Your email address has been confirmed. You now have full access to your account.
              </p>
              <Link href="/dashboard" className="btn btn-primary w-full">
                Continue to dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <>
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto mb-5"
                style={{ backgroundColor: 'var(--status-red-soft)' }}
              >
                <XCircle className="w-7 h-7" style={{ color: 'var(--status-red)' }} />
              </div>
              <h1 className="text-2xl font-semibold mb-2" style={{ letterSpacing: '-0.02em' }}>
                Verification failed
              </h1>
              <p className="text-sm mb-2" style={{ color: 'var(--muted-strong)' }}>
                {result.error ?? 'We could not verify your email with this link.'}
              </p>
              <p className="text-sm mb-6" style={{ color: 'var(--muted-strong)' }}>
                The link may have expired or already been used. Sign in and request a new
                verification email from your dashboard.
              </p>
              <Link href="/login" className="btn btn-primary w-full">
                Go to sign in
                <ArrowRight className="w-4 h-4" />
              </Link>
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
