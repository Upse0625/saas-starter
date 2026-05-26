'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Props {
  token: string;
  state: 'valid' | 'notfound' | 'expired' | 'accepted';
  orgName: string;
  role: 'admin' | 'member';
  inviteEmail: string;
  isLoggedIn: boolean;
  currentEmail: string | null;
}

const wrap: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg)',
  padding: '2rem',
};

const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 440,
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '2.25rem',
  boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)',
};

const btnPrimary: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 1rem',
  background: 'var(--accent)',
  color: 'var(--accent-fg)',
  border: 'none',
  borderRadius: 6,
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'center',
  padding: '0.7rem 1rem',
  background: 'transparent',
  color: 'var(--fg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  fontWeight: 500,
  fontSize: '0.9rem',
  textDecoration: 'none',
};

const label: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
};

export default function InviteClient(props: Props) {
  const { token, state, orgName, role, inviteEmail, isLoggedIn, currentEmail } = props;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function accept() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/org/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? 'Could not accept the invitation.');
      setLoading(false);
    }
  }

  // Error states
  if (state !== 'valid') {
    const messages: Record<string, { title: string; body: string }> = {
      notfound: { title: 'Invitation not found', body: 'This invite link is invalid. Ask the person who invited you to send a new one.' },
      expired: { title: 'Invitation expired', body: 'This invite has passed its 7-day window. Ask for a fresh invitation.' },
      accepted: { title: 'Already accepted', body: 'This invitation has already been used.' },
    };
    const m = messages[state];
    return (
      <div style={wrap}>
        <div style={card}>
          <p style={label}>Invitation</p>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600, margin: '0.75rem 0 0.5rem' }}>{m.title}</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.55, marginBottom: '1.5rem' }}>{m.body}</p>
          <Link href="/" style={btnSecondary}>Back to home</Link>
        </div>
      </div>
    );
  }

  const next = `/invite/${token}`;

  return (
    <div style={wrap}>
      <div style={card}>
        <p style={label}>You&apos;re invited</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0.75rem 0 0.5rem', letterSpacing: '-0.02em' }}>
          Join {orgName}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.55, marginBottom: '1.5rem' }}>
          You&apos;ve been invited to <strong style={{ color: 'var(--fg)' }}>{orgName}</strong> as{' '}
          <strong style={{ color: 'var(--fg)' }}>{role}</strong>
          {inviteEmail ? <> · sent to <span style={{ fontFamily: 'var(--font-mono)' }}>{inviteEmail}</span></> : null}.
        </p>

        {isLoggedIn ? (
          <>
            {currentEmail && inviteEmail && currentEmail.toLowerCase() !== inviteEmail.toLowerCase() && (
              <div
                style={{
                  background: 'var(--code-bg, rgba(0,0,0,0.04))',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '0.7rem 0.85rem',
                  fontSize: '0.82rem',
                  color: 'var(--muted)',
                  marginBottom: '1rem',
                }}
              >
                You&apos;re signed in as <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{currentEmail}</span>, but this invite was sent to {inviteEmail}. Accepting will join your current account.
              </div>
            )}
            {error && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', marginBottom: '0.9rem' }}>
                {error}
              </p>
            )}
            <button onClick={accept} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Joining…' : `Accept & join ${orgName}`}
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <Link
              href={`/signup?next=${encodeURIComponent(next)}&email=${encodeURIComponent(inviteEmail)}`}
              style={{ ...btnPrimary, textAlign: 'center', textDecoration: 'none' }}
            >
              Create account &amp; join
            </Link>
            <Link href={`/login?next=${encodeURIComponent(next)}`} style={btnSecondary}>
              I already have an account
            </Link>
            <p style={{ color: 'var(--muted)', fontSize: '0.78rem', textAlign: 'center', marginTop: '0.4rem' }}>
              Sign in, then you&apos;ll land back here to accept.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
