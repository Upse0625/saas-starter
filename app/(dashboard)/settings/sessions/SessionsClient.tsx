'use client';

import { useState, useTransition } from 'react';
import {
  AlertCircle,
  Smartphone,
  Laptop,
  Monitor,
  Globe,
  LogOut,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { relativeTime } from '@/lib/format';

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

interface SessionsClientProps {
  sessions: SessionItem[];
}

type DeviceIcon = typeof Smartphone;

/** Parse a user-agent string into a friendly "Browser on OS" label and an icon. */
function parseUserAgent(ua: string | null): { label: string; Icon: DeviceIcon } {
  if (!ua) return { label: 'Unknown device', Icon: Globe };

  // Operating system
  let os: string | null = null;
  let mobile = false;
  if (/iPhone/i.test(ua)) {
    os = 'iPhone';
    mobile = true;
  } else if (/iPad/i.test(ua)) {
    os = 'iPad';
    mobile = true;
  } else if (/Android/i.test(ua)) {
    os = 'Android';
    mobile = true;
  } else if (/Mac OS X|Macintosh/i.test(ua)) {
    os = 'macOS';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
  } else if (/CrOS/i.test(ua)) {
    os = 'ChromeOS';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  // Browser (order matters — Edge/Chrome both contain "Safari")
  let browser: string | null = null;
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

  let label: string;
  if (browser && os) label = `${browser} on ${os}`;
  else if (browser) label = browser;
  else if (os) label = os;
  else label = ua.slice(0, 40);

  let Icon: DeviceIcon;
  if (mobile) Icon = Smartphone;
  else if (os === 'macOS' || os === 'ChromeOS') Icon = Laptop;
  else if (os) Icon = Monitor;
  else Icon = Globe;

  return { label, Icon };
}

export default function SessionsClient({ sessions: initialSessions }: SessionsClientProps) {
  const [sessions, setSessions] = useState<SessionItem[]>(initialSessions);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Snapshot the clock once on mount so expiry checks stay stable across renders.
  const [now] = useState(() => Date.now());

  const otherActive = sessions.filter(
    (s) => !s.current && !s.revoked_at && new Date(s.expires_at).getTime() >= now,
  );

  async function revokeSession(id: string) {
    if (!confirm('Revoke this session? The device will be signed out.')) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/auth/sessions?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, revoked_at: new Date().toISOString() } : s)),
        );
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Failed to revoke session');
      }
    });
  }

  async function revokeAllOthers() {
    if (otherActive.length === 0) return;
    if (
      !confirm(
        `Revoke ${otherActive.length} other ${otherActive.length === 1 ? 'session' : 'sessions'}? Those devices will be signed out.`,
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const results = await Promise.all(
        otherActive.map((s) =>
          fetch(`/api/auth/sessions?id=${encodeURIComponent(s.id)}`, { method: 'DELETE' }).then(
            (res) => ({ id: s.id, ok: res.ok }),
          ),
        ),
      );
      const revokedIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
      const now = new Date().toISOString();
      setSessions((prev) =>
        prev.map((s) => (revokedIds.has(s.id) ? { ...s, revoked_at: now } : s)),
      );
      if (results.some((r) => !r.ok)) {
        setError('Some sessions could not be revoked. Please try again.');
      }
    });
  }

  return (
    <div className="card overflow-hidden anim-fade-up delay-1">
      <div
        className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h2 className="font-semibold text-[15px]">Active sessions</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} on record.
          </p>
        </div>
        {otherActive.length > 0 && (
          <button
            type="button"
            onClick={revokeAllOthers}
            disabled={isPending}
            className="btn btn-secondary btn-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            Revoke all other sessions
          </button>
        )}
      </div>

      {error && (
        <div className="px-6 pt-4">
          <div className="banner banner-red text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
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
            const isExpired = new Date(s.expires_at).getTime() < now;
            const inactive = isRevoked || isExpired;
            const { label, Icon } = parseUserAgent(s.user_agent);
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
                      <p className="text-sm font-medium">{label}</p>
                      {s.current && <span className="chip chip-accent">Current session</span>}
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
                      <span title={formatDate(s.last_active_at)}>
                        Last active {relativeTime(s.last_active_at)}
                      </span>
                      <span>Created {formatDate(s.created_at)}</span>
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
  );
}
