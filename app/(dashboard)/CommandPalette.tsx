'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Settings as SettingsIcon,
  Users,
  CreditCard,
  KeyRound,
  Key,
  Activity,
  Shield,
  User,
  Bell,
  Laptop,
  LogOut,
  Search,
  CornerDownLeft,
} from 'lucide-react';

interface Command {
  label: string;
  group: string;
  href?: string;
  action?: 'logout';
  keywords?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
}

const COMMANDS: Command[] = [
  { label: 'Dashboard', group: 'Go to', href: '/dashboard', icon: LayoutDashboard, keywords: 'home overview' },
  { label: 'Profile', group: 'Account', href: '/settings/profile', icon: User, keywords: 'name avatar email password' },
  { label: 'Notifications', group: 'Account', href: '/settings/notifications', icon: Bell, keywords: 'email preferences' },
  { label: 'Security & 2FA', group: 'Account', href: '/settings/security', icon: Shield, keywords: 'two factor totp authenticator' },
  { label: 'Personal API keys', group: 'Account', href: '/settings/personal-keys', icon: Key, keywords: 'token personal' },
  { label: 'Active sessions', group: 'Account', href: '/settings/sessions', icon: Laptop, keywords: 'devices revoke logout' },
  { label: 'General settings', group: 'Workspace', href: '/settings', icon: SettingsIcon, keywords: 'org name slug logo delete' },
  { label: 'Members', group: 'Workspace', href: '/settings/members', icon: Users, keywords: 'team invite roles pending' },
  { label: 'Billing', group: 'Workspace', href: '/settings/billing', icon: CreditCard, keywords: 'plan subscription invoices' },
  { label: 'Organization API keys', group: 'Workspace', href: '/settings/api-keys', icon: KeyRound, keywords: 'token v1 api' },
  { label: 'Activity log', group: 'Workspace', href: '/settings/activity', icon: Activity, keywords: 'audit history' },
  { label: 'Sign out', group: 'Account', action: 'logout', icon: LogOut, keywords: 'logout leave' },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global ⌘K / Ctrl+K toggle, and a custom event so the sidebar button can open it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    function onOpen() { setOpen(true); }
    window.addEventListener('keydown', onKey);
    window.addEventListener('command-palette:open', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('command-palette:open', onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // focus after paint
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.keywords ?? '').includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (active >= results.length) setActive(0);
  }, [results, active]);

  async function run(cmd: Command | undefined) {
    if (!cmd) return;
    setOpen(false);
    if (cmd.action === 'logout') {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
      return;
    }
    if (cmd.href) {
      router.push(cmd.href);
    }
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(results[active]);
    }
  }

  if (!open) return null;

  let lastGroup = '';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center"
      style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)', paddingTop: '12vh' }}
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg mx-4 anim-fade-up"
        style={{
          background: 'var(--card, #fff)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4" style={{ borderBottom: '1px solid var(--border-subtle, var(--border))' }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search pages and actions…"
            className="flex-1 bg-transparent outline-none text-sm py-3.5"
            style={{ color: 'var(--fg)' }}
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{ background: 'var(--bg-muted, rgba(0,0,0,0.05))', color: 'var(--muted)' }}
          >
            ESC
          </kbd>
        </div>

        <div className="max-h-[340px] overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center" style={{ color: 'var(--muted)' }}>
              No results for “{query}”.
            </p>
          ) : (
            results.map((cmd, i) => {
              const Icon = cmd.icon;
              const showGroup = cmd.group !== lastGroup;
              lastGroup = cmd.group;
              const isActive = i === active;
              return (
                <div key={cmd.label}>
                  {showGroup && (
                    <p
                      className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--muted)' }}
                    >
                      {cmd.group}
                    </p>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => run(cmd)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left"
                    style={{
                      color: 'var(--fg)',
                      background: isActive ? 'var(--bg-muted, rgba(99,102,241,0.08))' : 'transparent',
                    }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} style={{ color: 'var(--muted-strong, var(--muted))' }} />
                    <span className="flex-1">{cmd.label}</span>
                    {isActive && (
                      <CornerDownLeft className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
