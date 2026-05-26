import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import ResetPasswordForm from './ResetPasswordForm';

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

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
          <h1 className="text-2xl font-semibold mb-2" style={{ letterSpacing: '-0.02em' }}>
            Set a new password
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--muted-strong)' }}>
            Choose a new password for your account. The reset link expires one hour after it was
            requested.
          </p>
          <ResetPasswordForm token={token} />
        </div>

        <p className="text-center mt-6 text-xs anim-fade-up delay-2" style={{ color: 'var(--muted)' }}>
          &copy; {new Date().getFullYear()} Saasly
        </p>
      </div>
    </div>
  );
}
