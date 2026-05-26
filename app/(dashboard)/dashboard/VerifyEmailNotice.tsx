'use client';

import { useState, useTransition } from 'react';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export default function VerifyEmailNotice() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  function handleResend() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          alreadyVerified?: boolean;
        };
        if (!res.ok || !data.ok) {
          setStatus('error');
          setMessage(data.error ?? 'Could not resend verification email.');
          return;
        }
        if (data.alreadyVerified) {
          setStatus('sent');
          setMessage('Email already verified.');
          return;
        }
        setStatus('sent');
        setMessage('Verification email sent. Check your inbox.');
      } catch {
        setStatus('error');
        setMessage('Network error. Please try again.');
      }
    });
  }

  const Icon = status === 'sent' ? CheckCircle2 : status === 'error' ? AlertCircle : Mail;

  return (
    <div className="banner banner-amber mb-6 flex-col sm:flex-row sm:items-center sm:justify-between gap-3 anim-fade-up delay-0">
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold mb-0.5">Verify your email</p>
          <p className="text-sm" style={{ color: '#92400e' }}>
            {status === 'idle' && 'Check your inbox for a verification link to unlock your account.'}
            {(status === 'sent' || status === 'error') && message}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleResend}
        disabled={isPending}
        className="btn btn-sm self-start sm:self-auto"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #fde68a',
          color: '#92400e',
        }}
      >
        {isPending ? (
          <>
            <span className="spinner" />
            Sending
          </>
        ) : (
          'Resend email'
        )}
      </button>
    </div>
  );
}
