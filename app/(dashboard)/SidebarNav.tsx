'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Settings as SettingsIcon,
  Users,
  CreditCard,
  KeyRound,
  Activity,
  Shield,
  Search,
  LogOut,
  ChevronsUpDown,
  Sparkles,
} from 'lucide-react';

interface SidebarNavProps {
  orgName: string;
  orgSlug: string;
  plan: string;
  userName: string;
  userEmail: string;
  userRole: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const primaryNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const settingsNav: NavItem[] = [
  { href: '/settings', label: 'General', icon: SettingsIcon },
  { href: '/settings/members', label: 'Members', icon: Users },
  { href: '/settings/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings/api-keys', label: 'API Keys', icon: KeyRound },
  { href: '/settings/security', label: 'Security', icon: Shield },
  { href: '/settings/activity', label: 'Activity', icon: Activity },
];

export default function SidebarNav({
  orgName,
  plan,
  userName,
  userEmail,
  userRole,
}: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const allItems = [...primaryNav, ...settingsNav];
  const filtered = query.trim()
    ? allItems.filter((it) => it.label.toLowerCase().includes(query.trim().toLowerCase()))
    : null;

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/settings') return pathname === '/settings';
    return pathname.startsWith(href);
  }

  function renderLink(link: NavItem) {
    const active = isActive(link.href);
    const Icon = link.icon;
    return (
      <Link
        key={link.href}
        href={link.href}
        className="relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all"
        style={{
          color: active ? 'var(--fg)' : 'var(--muted-strong)',
          backgroundColor: active ? 'var(--bg-muted)' : 'transparent',
          fontWeight: active ? 500 : 400,
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {active && (
          <span
            aria-hidden="true"
            className="absolute left-0 top-1/2 -translate-y-1/2 anim-slide-in"
            style={{
              width: 3,
              height: 16,
              borderRadius: 999,
              backgroundColor: 'var(--accent)',
              transform: 'translateX(-9px) translateY(-50%)',
            }}
          />
        )}
        <Icon className="w-4 h-4" strokeWidth={active ? 2 : 1.75} />
        <span>{link.label}</span>
      </Link>
    );
  }

  const userInitial = userName.charAt(0).toUpperCase();
  const orgInitial = orgName.charAt(0).toUpperCase();

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col h-full"
      style={{
        backgroundColor: '#ffffff',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Org switcher */}
      <div className="px-3 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          type="button"
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors"
          style={{ color: 'var(--fg)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-white text-xs font-semibold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            {orgInitial}
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-sm font-semibold truncate">{orgName}</span>
            <span className="block text-[11px] capitalize" style={{ color: 'var(--muted)' }}>
              {plan} plan
            </span>
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--muted)' }} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search
            className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--muted)' }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="input"
            style={{
              padding: '7px 10px 7px 32px',
              fontSize: '13px',
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'transparent',
            }}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-2 pb-3 space-y-5 overflow-y-auto">
        {filtered ? (
          <div className="space-y-0.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs" style={{ color: 'var(--muted)' }}>
                No matches.
              </p>
            ) : (
              filtered.map(renderLink)
            )}
          </div>
        ) : (
          <>
            <div className="space-y-0.5">{primaryNav.map(renderLink)}</div>
            <div>
              <p
                className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--muted)' }}
              >
                Settings
              </p>
              <div className="space-y-0.5">{settingsNav.map(renderLink)}</div>
            </div>
          </>
        )}
      </nav>

      {/* Upgrade card (only on starter) */}
      {plan === 'starter' && (
        <div className="px-3 pb-3">
          <Link
            href="/settings/billing"
            className="block p-3 rounded-md transition-all anim-fade-in"
            style={{
              background: 'linear-gradient(135deg, #eef2ff 0%, #fdf4ff 100%)',
              border: '1px solid #c7d2fe',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--accent-hover)' }}>
                Upgrade to Pro
              </p>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--muted-strong)' }}>
              Unlock advanced analytics &amp; more team seats.
            </p>
          </Link>
        </div>
      )}

      {/* User menu */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-semibold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #f472b6, #c084fc)' }}
          >
            {userInitial}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>
              {userName}
            </p>
            <p className="text-[11px] truncate" style={{ color: 'var(--muted)' }}>
              {userEmail}
            </p>
          </div>
          <span
            className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--bg-muted)',
              color: 'var(--muted-strong)',
              letterSpacing: '0.04em',
            }}
          >
            {userRole}
          </span>
        </div>
        <button
          onClick={handleLogout}
          disabled={signingOut}
          className="w-full mt-1 flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors"
          style={{ color: 'var(--muted-strong)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
            e.currentTarget.style.color = 'var(--fg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--muted-strong)';
          }}
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
