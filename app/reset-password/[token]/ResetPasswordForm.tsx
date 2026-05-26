'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, AlertCircle } from 'lucide-react';

interface Props {
  token: string;
}

export default function ResetPasswordForm({ token }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirm = formData.get('confirm') as string;

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setError(data.error ?? 'Password reset failed');
          return;
        }
        router.push('/login?reset=ok');
        router.refresh();
      } catch {
        setError('Network error. Please try again.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="banner banner-red text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1.5">
          New password
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

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium mb-1.5">
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="input"
          placeholder="Repeat your password"
        />
      </div>

      <button type="submit" disabled={isPending} className="btn btn-primary w-full mt-2">
        {isPending ? (
          <>
            <span className="spinner" />
            Updating
          </>
        ) : (
          <>
            Update password
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-center text-sm pt-2">
        <Link href="/login" className="font-medium" style={{ color: 'var(--accent)' }}>
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
