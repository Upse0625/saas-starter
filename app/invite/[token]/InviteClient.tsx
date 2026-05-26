'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Props {
  token: string;
  isLoggedIn: boolean;
  currentEmail: string | null;
}

interface InviteDetails {
  valid: true;
  orgName: string;
  role: 'owner' | 'admin' | 'member';
  email: string;
  expiresAt: string;
}

interface InviteError {
  valid: false;
  reason: 'not_found' | 'expired' | 'accepted' | 'declined' | 'error';
  error: string;
}

type FetchState =
  | { status: 'loading' }
  | { status: 'ok'; details: InviteDetails }
  | { status: 'error'; reason: InviteError['reason']; message: string };

// ─── styles (inline so this is self-contained and matches the dark/light vars) ──
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
const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
};
const h1: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 600,
  margin: '0.75rem 0 0.5rem',
  letterSpacing: '-0.02em',
};
const body: React.CSSProperties = {
  color: 'var(--muted)',
  fontSize: '0.92rem',
  lineHeight: 1.55,
  marginBottom: '1.5rem',
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
  cursor: 'pointer',
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={wrap}>
      <div style={card}>{children}</div>
    </div>
  );
}

export default function InviteClient({ token, isLoggedIn, currentEmail }: Props) {
  const router = useRouter();
  const [state, setState] = useState<FetchState>({ status: 'loading' });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/invitations/${token}`)
      .then(async (r) => {
        const data = (await r.json()) as InviteDetails | InviteError;
        if (!alive) return;
        if (data.valid) setState({ status: 'ok', details: data });
        else setState({ status: 'error', reason: data.reason, message: data.error });
      })
      .catch(() => {
        if (alive) setState({ status: 'error', reason: 'error', message: 'Could not load this invitation.' });
      });
    return () => {
      alive = false;
    };
  }, [token]);

  async function accept() {
    setBusy(true);
    setActionError('');
    const res = await fetch(`/api/invitations/${token}/accept`, { method: 'POST' });
    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setActionError(d.error ?? 'Could not accept the invitation.');
      setBusy(false);
    }
  }

  async function decline() {
    setBusy(true);
    setActionError('');
    const res = await fetch(`/api/invitations/${token}/decline`, { method: 'POST' });
    if (res.ok) {
      setDone('declined');
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setActionError(d.error ?? 'Could not decline the invitation.');
    }
    setBusy(false);
  }

  // ── loading ──
  if (state.status === 'loading') {
    return (
      <Shell>
        <p style={eyebrow}>Invitation</p>
        <p style={{ ...body, marginTop: '0.75rem', marginBottom: 0 }}>Loading…</p>
      </Shell>
    );
  }

  // ── declined just now ──
  if (done === 'declined') {
    return (
      <Shell>
        <p style={eyebrow}>Invitation</p>
        <h1 style={h1}>Invitation declined</h1>
        <p style={body}>No problem — this invitation has been declined and the link is now inactive.</p>
        <Link href="/" style={btnSecondary}>Back to home</Link>
      </Shell>
    );
  }

  // ── invalid / expired / accepted / declined ──
  if (state.status === 'error') {
    const titles: Record<InviteError['reason'], string> = {
      not_found: 'Invitation not found',
      expired: 'Invitation expired',
      accepted: 'Already accepted',
      declined: 'Invitation declined',
      error: 'Something went wrong',
    };
    return (
      <Shell>
        <p style={eyebrow}>Invitation</p>
        <h1 style={h1}>{titles[state.reason]}</h1>
        <p style={body}>{state.message}</p>
        <Link href="/" style={btnSecondary}>Back to home</Link>
      </Shell>
    );
  }

  // ── valid invite ──
  const { orgName, role, email } = state.details;
  const next = `/invite/${token}`;
  const emailMismatch =
    isLoggedIn && currentEmail !== null && currentEmail.toLowerCase() !== email.toLowerCase();

  return (
    <Shell>
      <p style={eyebrow}>You&apos;re invited</p>
      <h1 style={h1}>Join {orgName}</h1>
      <p style={body}>
        You&apos;ve been invited to <strong style={{ color: 'var(--fg)' }}>{orgName}</strong> as{' '}
        <strong style={{ color: 'var(--fg)' }}>{role}</strong> · sent to{' '}
        <span style={{ fontFamily: 'var(--font-mono)' }}>{email}</span>.
      </p>

      {isLoggedIn ? (
        <>
          {emailMismatch && (
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
              You&apos;re signed in as{' '}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{currentEmail}</span>, but this
              invite was sent to {email}. Sign in with that address to accept.
            </div>
          )}
          {actionError && (
            <p style={{ color: '#ef4444', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', marginBottom: '0.9rem' }}>
              {actionError}
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button
              onClick={accept}
              disabled={busy || emailMismatch}
              style={{ ...btnPrimary, opacity: busy || emailMismatch ? 0.55 : 1, cursor: busy || emailMismatch ? 'not-allowed' : 'pointer' }}
            >
              {busy ? 'Joining…' : `Accept & join ${orgName}`}
            </button>
            <button onClick={decline} disabled={busy} style={btnSecondary}>
              Decline
            </button>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <Link
            href={`/signup?invite=${encodeURIComponent(token)}`}
            style={{ ...btnPrimary, textAlign: 'center', textDecoration: 'none' }}
          >
            Sign up to join {orgName}
          </Link>
          <Link href={`/login?next=${encodeURIComponent(next)}`} style={btnSecondary}>
            I already have an account
          </Link>
          <button onClick={decline} disabled={busy} style={{ ...btnSecondary, marginTop: '0.2rem' }}>
            Decline invitation
          </button>
        </div>
      )}
    </Shell>
  );
}
