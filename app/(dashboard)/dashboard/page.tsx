import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Users,
  Mail,
  CreditCard,
  HardDrive,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { getSession } from '@/lib/auth';
import { db, sqlite } from '@/lib/db';
import { organizations, org_members, invitations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PLANS } from '@/lib/stripe';
import { listAuditLogs } from '@/lib/audit';
import { relativeTime, formatAction, formatAbsoluteTime } from '@/lib/format';
import VerifyEmailNotice from './VerifyEmailNotice';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, session.orgId))
    .get();

  if (!org) redirect('/login');

  const userRow = sqlite
    .prepare(`SELECT email_verified_at FROM users WHERE id = ?`)
    .get(session.userId) as { email_verified_at: string | null } | undefined;
  const emailVerifiedAt = userRow?.email_verified_at ?? null;

  const members = await db
    .select()
    .from(org_members)
    .where(eq(org_members.org_id, session.orgId))
    .all();

  const pendingInvites = await db
    .select()
    .from(invitations)
    .where(eq(invitations.org_id, session.orgId))
    .all();

  const recentActivity = listAuditLogs(session.orgId, 6, 0);

  const plan = PLANS[org.plan];
  const memberLimit = plan.memberLimit === Infinity ? 'Unlimited' : plan.memberLimit.toString();
  const isPro = org.plan === 'pro';
  const isEnterprise = org.plan === 'enterprise';
  const isPaid = isPro || isEnterprise;

  const stats = [
    {
      label: 'Team members',
      value: members.length.toString(),
      sub: `of ${memberLimit} max`,
      Icon: Users,
      tint: { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
    },
    {
      label: 'Pending invites',
      value: pendingInvites.filter((i) => !i.accepted_at).length.toString(),
      sub: 'awaiting acceptance',
      Icon: Mail,
      tint: { bg: '#fff7ed', fg: '#ea580c' },
    },
    {
      label: 'Current plan',
      value: plan.name,
      sub: plan.price === 0 ? 'Free forever' : `$${plan.price}/mo`,
      Icon: CreditCard,
      tint: { bg: 'var(--status-green-soft)', fg: 'var(--status-green)' },
    },
    {
      label: 'Storage used',
      value: isPaid ? (isEnterprise ? '12.4 GB' : '2.1 GB') : '340 MB',
      sub: `of ${isEnterprise ? '500 GB' : isPro ? '50 GB' : '5 GB'}`,
      Icon: HardDrive,
      tint: { bg: '#faf5ff', fg: '#9333ea' },
    },
  ];

  return (
    <div>
      {!emailVerifiedAt && <VerifyEmailNotice />}

      {/* Header */}
      <div className="flex items-end justify-between mb-8 anim-fade-up delay-0">
        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
            Welcome back
          </p>
          <h1
            className="text-3xl font-semibold"
            style={{ letterSpacing: '-0.02em', color: 'var(--fg)' }}
          >
            {org.name}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
            Here&apos;s what&apos;s happening in your workspace.
          </p>
        </div>
        <span
          className="chip"
          style={{
            backgroundColor: isPaid ? 'var(--accent-soft)' : 'var(--bg-muted)',
            color: isPaid ? 'var(--accent-hover)' : 'var(--muted-strong)',
            padding: '5px 10px',
            fontSize: 12,
          }}
        >
          {plan.name} plan
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`card p-5 anim-fade-up delay-${i + 1}`}
            style={{ transition: 'box-shadow 200ms ease, border-color 200ms ease' }}
          >
            <div className="flex items-start justify-between mb-4">
              <span
                className="inline-flex items-center justify-center w-9 h-9 rounded-md"
                style={{ backgroundColor: stat.tint.bg, color: stat.tint.fg }}
              >
                <stat.Icon className="w-4 h-4" strokeWidth={1.85} />
              </span>
              <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                {stat.label}
              </p>
            </div>
            <p
              className="text-2xl font-semibold"
              style={{ letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}
            >
              {stat.value}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Two-up: Analytics + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Analytics card */}
        <div className="card p-6 anim-fade-up delay-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <span
                className="inline-flex items-center justify-center w-8 h-8 rounded-md"
                style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                <TrendingUp className="w-4 h-4" strokeWidth={1.85} />
              </span>
              <h2 className="font-semibold text-[15px]">Analytics</h2>
            </div>
            {!isPaid && <span className="chip chip-accent">Pro+</span>}
          </div>

          {isPaid ? (
            <div className="space-y-3">
              {[
                { label: 'Page views', value: '12,482', change: '+14%' },
                { label: 'Unique visitors', value: '3,291', change: '+8%' },
                { label: 'Conversion rate', value: '4.2%', change: '+1.2%' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center justify-between py-2 text-sm"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <span style={{ color: 'var(--muted-strong)' }}>{stat.label}</span>
                  <div className="flex items-center gap-3">
                    <span
                      className="font-semibold"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {stat.value}
                    </span>
                    <span
                      className="text-xs font-medium px-1.5 py-0.5 rounded"
                      style={{
                        color: '#047857',
                        backgroundColor: 'var(--status-green-soft)',
                      }}
                    >
                      {stat.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-full mx-auto mb-3"
                style={{ backgroundColor: 'var(--accent-soft)' }}
              >
                <Sparkles className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              </div>
              <p className="text-sm font-medium mb-1">Advanced analytics</p>
              <p className="text-sm mb-4" style={{ color: 'var(--muted-strong)' }}>
                Available on the Pro plan.
              </p>
              <Link
                href="/settings/billing"
                className="btn btn-secondary btn-sm inline-flex"
              >
                Upgrade to Pro
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card p-6 anim-fade-up delay-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-[15px]">Recent activity</h2>
            <Link
              href="/settings/activity"
              className="text-xs font-medium inline-flex items-center gap-1"
              style={{ color: 'var(--accent)' }}
            >
              View all
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: 'var(--muted)' }}>
                No activity yet.
              </p>
            ) : (
              recentActivity.map((entry) => {
                const actorName =
                  entry.actor_name ?? (entry.actor_user_id ? 'Unknown user' : 'System');
                const initial = actorName.charAt(0).toUpperCase();
                return (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white"
                      style={{
                        background:
                          actorName === 'System'
                            ? 'linear-gradient(135deg, #71717a, #52525b)'
                            : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      }}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">
                        <span className="font-medium">{actorName}</span>{' '}
                        <span style={{ color: 'var(--muted-strong)' }}>
                          {formatAction(entry.action).toLowerCase()}
                        </span>
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: 'var(--muted)' }}
                        title={formatAbsoluteTime(entry.created_at)}
                      >
                        {relativeTime(entry.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Enterprise integrations */}
      {isEnterprise && (
        <div className="card p-6 mb-6 anim-fade-up delay-7">
          <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--muted)' }}>
            Enterprise integrations
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--muted-strong)' }}>
            Your Enterprise plan includes SSO, custom integrations, and dedicated support.
          </p>
          <div className="flex gap-2 flex-wrap">
            {['Slack', 'Salesforce', 'Jira', 'GitHub'].map((app) => (
              <span key={app} className="chip">
                {app}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      {!isPaid && (
        <div
          className="rounded-lg p-6 anim-fade-up delay-7 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #eef2ff 0%, #fdf4ff 100%)',
            border: '1px solid #c7d2fe',
          }}
        >
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent-hover)' }}>
                  Upgrade
                </p>
              </div>
              <h2 className="text-xl font-semibold mb-1" style={{ letterSpacing: '-0.02em' }}>
                Unlock more with Pro
              </h2>
              <p className="text-sm" style={{ color: 'var(--muted-strong)' }}>
                Advanced analytics, up to 25 team members, and 50 GB of storage — for $29/mo.
              </p>
            </div>
            <Link href="/settings/billing" className="btn btn-primary">
              View plans
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
