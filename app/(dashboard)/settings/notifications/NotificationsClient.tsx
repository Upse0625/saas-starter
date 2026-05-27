'use client';

import { useState, useTransition } from 'react';
import { AlertCircle, CheckCircle2, Megaphone, ShieldCheck, Users, Receipt } from 'lucide-react';

interface Prefs {
  product_updates: boolean;
  security_alerts: boolean;
  team_activity: boolean;
  billing: boolean;
}

type PrefKey = keyof Prefs;

interface NotificationsClientProps {
  prefs: Prefs;
}

const ITEMS: { key: PrefKey; label: string; description: string; Icon: typeof Megaphone }[] = [
  {
    key: 'product_updates',
    label: 'Product updates',
    description: 'New features, improvements, and occasional announcements.',
    Icon: Megaphone,
  },
  {
    key: 'security_alerts',
    label: 'Security alerts',
    description: 'Sign-ins from new devices, password changes, and 2FA events.',
    Icon: ShieldCheck,
  },
  {
    key: 'team_activity',
    label: 'Team activity',
    description: 'Invitations, new members, and role changes in your organization.',
    Icon: Users,
  },
  {
    key: 'billing',
    label: 'Billing & receipts',
    description: 'Invoices, receipts, and changes to your subscription.',
    Icon: Receipt,
  },
];

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className="relative inline-flex flex-shrink-0 rounded-full transition-colors"
      style={{
        width: 40,
        height: 22,
        backgroundColor: checked ? 'var(--accent)' : 'var(--border)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        className="absolute rounded-full transition-transform"
        style={{
          top: 2,
          left: 2,
          width: 18,
          height: 18,
          backgroundColor: '#ffffff',
          transform: checked ? 'translateX(18px)' : 'translateX(0)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

export default function NotificationsClient({ prefs: initialPrefs }: NotificationsClientProps) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(key: PrefKey) {
    const next: Prefs = { ...prefs, [key]: !prefs[key] };
    const previous = prefs;
    setPrefs(next);
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        setSuccess('Preferences saved.');
      } else {
        // Roll back on failure.
        setPrefs(previous);
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to save preferences');
      }
    });
  }

  return (
    <div className="card overflow-hidden max-w-2xl anim-fade-up delay-1">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="font-semibold text-[15px]">Email preferences</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
          Toggle the categories of email you would like to receive.
        </p>
      </div>

      {(success || error) && (
        <div className="px-6 pt-4">
          {success && (
            <div className="banner banner-green text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div className="banner banner-red text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      <div>
        {ITEMS.map((item, i) => {
          const { Icon } = item;
          return (
            <div
              key={item.key}
              className="px-6 py-4 flex items-center justify-between gap-4"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-md inline-flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--bg-muted)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: 'var(--muted-strong)' }} strokeWidth={1.85} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--muted-strong)' }}>
                    {item.description}
                  </p>
                </div>
              </div>
              <Toggle
                checked={prefs[item.key]}
                disabled={isPending}
                onChange={() => toggle(item.key)}
                label={item.label}
              />
            </div>
          );
        })}
      </div>

      <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          These preferences are the source of truth — the app reads them before sending each
          category of email, and gating is enforced wherever those emails are sent.
        </p>
      </div>
    </div>
  );
}
