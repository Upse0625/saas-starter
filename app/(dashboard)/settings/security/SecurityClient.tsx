'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  ShieldOff,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Smartphone,
  Laptop,
  Monitor,
  Globe,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface SessionItem {
  id: string;
  ip: string | null;
  user_agent: string | null;
  last_active_at: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  current: boolean;
}

interface SecurityClientProps {
  twoFactorEnabled: boolean;
  sessions: SessionItem[];
  currentSessionId: string | null;
}

interface SetupPayload {
  qrCodeDataUrl: string;
  otpauthUrl: string;
  secret: string;
  recoveryCodes: string[];
}

function deviceInfo(ua: string | null): { name: string; Icon: typeof Smartphone } {
  if (!ua) return { name: 'Unknown device', Icon: Globe };
  if (/iPhone/i.test(ua)) return { name: 'iPhone', Icon: Smartphone };
  if (/iPad/i.test(ua)) return { name: 'iPad', Icon: Smartphone };
  if (/Android/i.test(ua)) return { name: 'Android', Icon: Smartphone };
  if (/Mac OS X/i.test(ua)) {
    return {
      name: /Safari/i.test(ua) && !/Chrome/i.test(ua) ? 'Mac · Safari' : 'Mac · Chrome',
      Icon: Laptop,
    };
  }
  if (/Windows/i.test(ua)) return { name: 'Windows', Icon: Monitor };
  if (/Linux/i.test(ua)) return { name: 'Linux', Icon: Monitor };
  return { name: ua.slice(0, 40), Icon: Globe };
}

export default function SecurityClient({
  twoFactorEnabled: initialEnabled,
  sessions: initialSessions,
}: SecurityClientProps) {
  const router = useRouter();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialEnabled);
  const [sessions, setSessions] = useState<SessionItem[]>(initialSessions);

  const [setupData, setSetupData] = useState<SetupPayload | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState<string | null>(null);
  const [codesCopied, setCodesCopied] = useState(false);

  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableError, setDisableError] = useState<string | null>(null);

  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function startSetup() {
    setSetupError(null);
    setSetupSuccess(null);
    startTransition(async () => {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as SetupPayload;
        setSetupData(data);
        setSetupCode('');
        setCodesCopied(false);
      } else {
        const data = (await res.json()) as { error?: string };
        setSetupError(data.error ?? 'Failed to start 2FA setup');
      }
    });
  }

  async function verifyAndEnable(e: React.FormEvent) {
    e.preventDefault();
    setSetupError(null);
    if (setupCode.replace(/\s/g, '').length !== 6) {
      setSetupError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    startTransition(async () => {
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: setupCode.replace(/\s/g, '') }),
      });
      if (res.ok) {
        setTwoFactorEnabled(true);
        setSetupData(null);
        setSetupCode('');
        setSetupSuccess('Two-factor authentication is now enabled.');
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        setSetupError(data.error ?? 'Failed to enable 2FA');
      }
    });
  }

  function cancelSetup() {
    setSetupData(null);
    setSetupCode('');
    setSetupError(null);
  }

  async function copyCodes() {
    if (!setupData) return;
    try {
      await navigator.clipboard.writeText(setupData.recoveryCodes.join('\n'));
      setCodesCopied(true);
      setTimeout(() => setCodesCopied(false), 2000);
    } catch {
      setCodesCopied(false);
    }
  }

  async function submitDisable(e: React.FormEvent) {
    e.preventDefault();
    setDisableError(null);
    startTransition(async () => {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      });
      if (res.ok) {
        setTwoFactorEnabled(false);
        setShowDisable(false);
        setDisablePassword('');
        setSetupSuccess('Two-factor authentication disabled.');
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        setDisableError(data.error ?? 'Failed to disable 2FA');
      }
    });
  }

  async function revokeSession(id: string) {
    if (!confirm('Revoke this session? The user will be signed out on that device.')) return;
    setSessionsError(null);
    startTransition(async () => {
      const res = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, revoked_at: new Date().toISOString() } : s)),
        );
      } else {
        const data = (await res.json()) as { error?: string };
        setSessionsError(data.error ?? 'Failed to revoke session');
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* 2FA section */}
      <div className="card overflow-hidden anim-fade-up delay-1">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            {twoFactorEnabled ? (
              <ShieldCheck
                className="w-4 h-4"
                style={{ color: 'var(--status-green)' }}
                strokeWidth={1.85}
              />
            ) : (
              <ShieldOff
                className="w-4 h-4"
                style={{ color: 'var(--muted)' }}
                strokeWidth={1.85}
              />
            )}
            <h2 className="font-semibold text-[15px]">Two-factor authentication</h2>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
            Require a verification code from your authenticator app on every sign in.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {setupSuccess && (
            <div className="banner banner-green text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{setupSuccess}</span>
            </div>
          )}

          {/* Enabled state */}
          {twoFactorEnabled && !showDisable && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-md inline-flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--status-green-soft)' }}
                >
                  <ShieldCheck
                    className="w-5 h-5"
                    style={{ color: 'var(--status-green)' }}
                    strokeWidth={1.85}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">2FA is enabled</p>
                    <span className="chip chip-green">Active</span>
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--muted-strong)' }}>
                    You will be asked for a 6-digit code when signing in.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDisable(true);
                  setDisableError(null);
                  setSetupSuccess(null);
                }}
                className="btn btn-secondary"
              >
                Disable
              </button>
            </div>
          )}

          {/* Disable confirm */}
          {twoFactorEnabled && showDisable && (
            <form onSubmit={submitDisable} className="space-y-4">
              <p className="text-sm">Enter your password to disable two-factor authentication.</p>
              <div>
                <label htmlFor="disable-password" className="block text-sm font-medium mb-1.5">
                  Password
                </label>
                <input
                  id="disable-password"
                  type="password"
                  autoComplete="current-password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  required
                  className="input"
                />
              </div>
              {disableError && (
                <div className="banner banner-red text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{disableError}</span>
                </div>
              )}
              <div className="flex gap-2">
                <button type="submit" disabled={isPending} className="btn btn-primary">
                  {isPending ? (
                    <>
                      <span className="spinner" />
                      Disabling
                    </>
                  ) : (
                    'Confirm disable'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDisable(false);
                    setDisablePassword('');
                    setDisableError(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Disabled state */}
          {!twoFactorEnabled && !setupData && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-md inline-flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--bg-muted)' }}
                >
                  <ShieldOff
                    className="w-5 h-5"
                    style={{ color: 'var(--muted)' }}
                    strokeWidth={1.85}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold">2FA is disabled</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--muted-strong)' }}>
                    Add an extra layer of protection to your account.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={startSetup}
                disabled={isPending}
                className="btn btn-primary"
              >
                {isPending ? (
                  <>
                    <span className="spinner" />
                    Loading
                  </>
                ) : (
                  <>
                    Enable 2FA
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {setupError && !setupData && (
            <div className="banner banner-red text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{setupError}</span>
            </div>
          )}

          {/* Setup wizard */}
          {!twoFactorEnabled && setupData && (
            <div className="space-y-6">
              {/* Step 1: scan */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    1
                  </span>
                  <p className="text-sm font-semibold">Scan the QR code</p>
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--muted-strong)' }}>
                  Open your authenticator app (1Password, Authy, Google Authenticator) and scan the
                  code below.
                </p>
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <div
                    className="p-3 rounded-md"
                    style={{ border: '1px solid var(--border)', backgroundColor: '#ffffff' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={setupData.qrCodeDataUrl}
                      alt="2FA QR code"
                      width={180}
                      height={180}
                      style={{ display: 'block' }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
                      Can&apos;t scan? Use this secret instead:
                    </p>
                    <code
                      className="block px-3 py-2 rounded-md text-xs"
                      style={{
                        backgroundColor: 'var(--bg-muted)',
                        color: 'var(--fg)',
                        fontFamily: 'var(--font-mono)',
                        border: '1px solid var(--border)',
                        wordBreak: 'break-all',
                      }}
                    >
                      {setupData.secret}
                    </code>
                  </div>
                </div>
              </div>

              {/* Step 2: recovery codes */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    2
                  </span>
                  <p className="text-sm font-semibold">Save your recovery codes</p>
                </div>
                <p className="text-sm mb-3" style={{ color: 'var(--muted-strong)' }}>
                  Each code can be used once if you lose access to your authenticator. They will not
                  be shown again.
                </p>
                <div
                  className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-md"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--fg)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    border: '1px solid var(--border)',
                  }}
                >
                  {setupData.recoveryCodes.map((c) => (
                    <div key={c}>{c}</div>
                  ))}
                </div>
                <div className="banner banner-amber mt-3 text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Save these codes now. They will never be shown again.</span>
                </div>
                <button type="button" onClick={copyCodes} className="btn btn-secondary btn-sm mt-3">
                  {codesCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy codes
                    </>
                  )}
                </button>
              </div>

              {/* Step 3: verify */}
              <form onSubmit={verifyAndEnable} className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    3
                  </span>
                  <p className="text-sm font-semibold">Verify and enable</p>
                </div>
                <label htmlFor="setup-code" className="block text-sm" style={{ color: 'var(--muted-strong)' }}>
                  Enter the 6-digit code from your authenticator
                </label>
                <input
                  id="setup-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                  required
                  className="input"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.4em',
                    textAlign: 'center',
                    fontSize: 20,
                    maxWidth: 240,
                  }}
                  placeholder="000000"
                />
                {setupError && (
                  <div className="banner banner-red text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{setupError}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={isPending} className="btn btn-primary">
                    {isPending ? (
                      <>
                        <span className="spinner" />
                        Verifying
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        Verify &amp; enable
                      </>
                    )}
                  </button>
                  <button type="button" onClick={cancelSetup} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Sessions */}
      <div className="card overflow-hidden anim-fade-up delay-2">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold text-[15px]">Active sessions</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
            Devices currently signed in to your account.
          </p>
        </div>

        {sessionsError && (
          <div className="px-6 pt-4">
            <div className="banner banner-red text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{sessionsError}</span>
            </div>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm" style={{ color: 'var(--muted)' }}>
            No sessions on record yet.
          </div>
        ) : (
          <div>
            {sessions.map((s, i) => {
              const isRevoked = !!s.revoked_at;
              const isExpired = new Date(s.expires_at).getTime() < Date.now();
              const inactive = isRevoked || isExpired;
              const { name, Icon } = deviceInfo(s.user_agent);
              return (
                <div
                  key={s.id}
                  className="px-6 py-4 flex items-start justify-between gap-4"
                  style={{
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                    opacity: inactive ? 0.55 : 1,
                  }}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className="w-9 h-9 rounded-md inline-flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--bg-muted)' }}
                    >
                      <Icon
                        className="w-4 h-4"
                        style={{ color: 'var(--muted-strong)' }}
                        strokeWidth={1.85}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{name}</p>
                        {s.current && <span className="chip chip-accent">Current</span>}
                        {isRevoked && <span className="chip chip-red">Revoked</span>}
                        {!isRevoked && isExpired && <span className="chip">Expired</span>}
                      </div>
                      <div
                        className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 mt-1.5 text-xs"
                        style={{ color: 'var(--muted)' }}
                      >
                        <span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>IP </span>
                          {s.ip ?? '—'}
                        </span>
                        <span>Created {formatDate(s.created_at)}</span>
                        <span>Active {formatDate(s.last_active_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {!s.current && !inactive && (
                      <button
                        type="button"
                        onClick={() => revokeSession(s.id)}
                        disabled={isPending}
                        className="btn btn-secondary btn-sm"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
