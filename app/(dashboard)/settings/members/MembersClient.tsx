'use client';

import { useState, useTransition } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Trash2,
  MoreHorizontal,
  Users,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  X,
  Mail,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Member {
  id: number;
  role: string;
  created_at: string;
  user_id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
}

interface MembersClientProps {
  initialMembers: Member[];
  initialInvitations: Invitation[];
  currentUserId: string;
  canManage: boolean;
  orgPlan: string;
}

type TabKey = 'active' | 'pending' | 'roles';

const roleStyles: Record<string, { bg: string; fg: string; label: string }> = {
  owner: { bg: '#fef3c7', fg: '#92400e', label: 'Owner' },
  admin: { bg: 'var(--accent-soft)', fg: 'var(--accent-hover)', label: 'Admin' },
  member: { bg: 'var(--bg-muted)', fg: 'var(--muted-strong)', label: 'Member' },
};

const avatarGradients = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #10b981, #14b8a6)',
  'linear-gradient(135deg, #f472b6, #c084fc)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
];

function avatarBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return avatarGradients[Math.abs(h) % avatarGradients.length];
}

export default function MembersClient({
  initialMembers,
  initialInvitations,
  currentUserId,
  canManage,
}: MembersClientProps) {
  const [tab, setTab] = useState<TabKey>('active');
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [isPending, startTransition] = useTransition();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [removeError, setRemoveError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [inviteActionError, setInviteActionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteSuccess(null);
    setInviteError(null);

    startTransition(async () => {
      const res = await fetch('/api/org/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (res.ok) {
        const data = (await res.json()) as { inviteId: string; inviteUrl?: string };
        setInviteSuccess(`Invitation sent to ${inviteEmail}.`);
        // Optimistically add to the pending list. Recover the token from the
        // returned invite URL so "Copy link" works without a reload.
        const token = data.inviteUrl ? data.inviteUrl.split('/invite/')[1] ?? '' : '';
        const now = new Date();
        const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        setInvitations((prev) => [
          {
            id: data.inviteId,
            email: inviteEmail,
            role: inviteRole,
            token,
            expires_at: expires.toISOString(),
            created_at: now.toISOString(),
          },
          ...prev,
        ]);
        setInviteEmail('');
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setInviteError(data.error ?? 'Failed to send invitation');
      }
    });
  }

  async function handleRoleChange(memberId: number, newRole: 'admin' | 'member') {
    setRoleError(null);
    startTransition(async () => {
      const res = await fetch('/api/org/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memberId, role: newRole }),
      });
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
        );
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setRoleError(data.error ?? 'Failed to change role');
      }
    });
  }

  async function handleRemove(memberId: number, memberName: string) {
    if (!confirm(`Remove ${memberName} from the organization?`)) return;
    setRemoveError(null);

    startTransition(async () => {
      const res = await fetch(`/api/org/members?id=${memberId}`, { method: 'DELETE' });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setRemoveError(data.error ?? 'Failed to remove member');
      }
    });
  }

  async function handleRevoke(inviteId: string, email: string) {
    if (!confirm(`Cancel the invitation to ${email}?`)) return;
    setInviteActionError(null);

    startTransition(async () => {
      const res = await fetch(`/api/org/invitations/${inviteId}`, { method: 'DELETE' });
      if (res.ok) {
        setInvitations((prev) => prev.filter((inv) => inv.id !== inviteId));
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setInviteActionError(data.error ?? 'Failed to cancel invitation');
      }
    });
  }

  async function handleCopyLink(inv: Invitation) {
    if (!inv.token) {
      setInviteActionError('Invite link is unavailable for this invitation. Reload the page.');
      return;
    }
    const url = `${window.location.origin}/invite/${inv.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId((c) => (c === inv.id ? null : c)), 2000);
    } catch {
      setInviteActionError('Could not copy to clipboard.');
    }
  }

  const tabs: { key: TabKey; label: string; icon: typeof Users; count?: number }[] = [
    { key: 'active', label: 'Active', icon: Users, count: members.length },
    { key: 'pending', label: 'Pending', icon: Clock, count: invitations.length },
    { key: 'roles', label: 'Roles', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div
        className="inline-flex items-center gap-1 p-1 rounded-lg anim-fade-up delay-0"
        style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' }}
      >
        {tabs.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: active ? 'var(--bg)' : 'transparent',
                color: active ? 'var(--fg)' : 'var(--muted-strong)',
                boxShadow: active ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.85} />
              {t.label}
              {t.count !== undefined && (
                <span
                  className="chip"
                  style={{
                    fontSize: 10,
                    padding: '0px 6px',
                    backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                    color: active ? 'var(--accent-hover)' : 'var(--muted)',
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'active' && (
        <ActiveTab
          members={members}
          currentUserId={currentUserId}
          canManage={canManage}
          isPending={isPending}
          removeError={removeError}
          roleError={roleError}
          onRoleChange={handleRoleChange}
          onRemove={handleRemove}
        />
      )}

      {tab === 'pending' && (
        <PendingTab
          invitations={invitations}
          canManage={canManage}
          isPending={isPending}
          inviteEmail={inviteEmail}
          inviteRole={inviteRole}
          inviteSuccess={inviteSuccess}
          inviteError={inviteError}
          inviteActionError={inviteActionError}
          copiedId={copiedId}
          setInviteEmail={setInviteEmail}
          setInviteRole={setInviteRole}
          onInvite={handleInvite}
          onRevoke={handleRevoke}
          onCopyLink={handleCopyLink}
        />
      )}

      {tab === 'roles' && <RolesTab />}
    </div>
  );
}

/* ─── Active members ──────────────────────────────────────────────────────── */

function ActiveTab({
  members,
  currentUserId,
  canManage,
  isPending,
  removeError,
  roleError,
  onRoleChange,
  onRemove,
}: {
  members: Member[];
  currentUserId: string;
  canManage: boolean;
  isPending: boolean;
  removeError: string | null;
  roleError: string | null;
  onRoleChange: (id: number, role: 'admin' | 'member') => void;
  onRemove: (id: number, name: string) => void;
}) {
  return (
    <div className="card overflow-hidden anim-fade-up delay-1">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="font-semibold text-[15px]">Members</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          {members.length} {members.length === 1 ? 'person' : 'people'} in your organization
        </p>
      </div>

      {(removeError || roleError) && (
        <div className="px-6 pt-4">
          <div className="banner banner-red text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{removeError ?? roleError}</span>
          </div>
        </div>
      )}

      {members.length === 0 ? (
        <div className="px-6 py-16 text-center text-sm" style={{ color: 'var(--muted)' }}>
          No members yet.
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {members.map((member, i) => {
            const role = roleStyles[member.role] ?? roleStyles.member;
            const isSelf = member.user_id === currentUserId;
            const editable = canManage && member.role !== 'owner' && !isSelf;
            return (
              <div
                key={member.id}
                className="px-6 py-4 flex items-center justify-between gap-4 transition-colors"
                style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {member.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold"
                      style={{ background: avatarBg(member.email) }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      {isSelf && (
                        <span className="chip" style={{ fontSize: 10, padding: '1px 6px' }}>
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted)' }}>
                      {member.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {editable ? (
                    <select
                      value={member.role}
                      onChange={(e) => onRoleChange(member.id, e.target.value as 'admin' | 'member')}
                      disabled={isPending}
                      className="input"
                      style={{ width: 'auto', minWidth: 108, padding: '5px 28px 5px 10px', fontSize: 13 }}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span
                      className="chip"
                      style={{ backgroundColor: role.bg, color: role.fg, fontSize: 11 }}
                    >
                      {role.label}
                    </span>
                  )}
                  <span
                    className="text-xs hidden md:block"
                    style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    Joined {formatDate(member.created_at)}
                  </span>
                  {editable ? (
                    <button
                      onClick={() => onRemove(member.id, member.name)}
                      disabled={isPending}
                      className="btn btn-ghost btn-xs"
                      style={{ color: 'var(--muted)' }}
                      title="Remove member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span
                      className="w-8 h-8 inline-flex items-center justify-center"
                      style={{ color: 'var(--border-strong)' }}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </span>
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

/* ─── Pending invitations ─────────────────────────────────────────────────── */

function PendingTab({
  invitations,
  canManage,
  isPending,
  inviteEmail,
  inviteRole,
  inviteSuccess,
  inviteError,
  inviteActionError,
  copiedId,
  setInviteEmail,
  setInviteRole,
  onInvite,
  onRevoke,
  onCopyLink,
}: {
  invitations: Invitation[];
  canManage: boolean;
  isPending: boolean;
  inviteEmail: string;
  inviteRole: 'admin' | 'member';
  inviteSuccess: string | null;
  inviteError: string | null;
  inviteActionError: string | null;
  copiedId: string | null;
  setInviteEmail: (v: string) => void;
  setInviteRole: (v: 'admin' | 'member') => void;
  onInvite: (e: React.FormEvent) => void;
  onRevoke: (id: string, email: string) => void;
  onCopyLink: (inv: Invitation) => void;
}) {
  return (
    <div className="space-y-6">
      {canManage && (
        <div className="card p-6 anim-fade-up delay-1">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4" style={{ color: 'var(--accent)' }} strokeWidth={1.85} />
            <h2 className="font-semibold text-[15px]">Invite a member</h2>
          </div>
          <form onSubmit={onInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
              className="input flex-1"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
              className="input"
              style={{ width: 'auto', minWidth: 120 }}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" disabled={isPending} className="btn btn-primary whitespace-nowrap">
              {isPending ? (
                <>
                  <span className="spinner" />
                  Sending
                </>
              ) : (
                'Send invite'
              )}
            </button>
          </form>

          {inviteSuccess && (
            <div className="banner banner-green mt-4 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{inviteSuccess}</span>
            </div>
          )}
          {inviteError && (
            <div className="banner banner-red mt-4 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}
        </div>
      )}

      <div className="card overflow-hidden anim-fade-up delay-2">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold text-[15px]">Pending invitations</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {invitations.length} {invitations.length === 1 ? 'invitation' : 'invitations'} awaiting
            a response
          </p>
        </div>

        {inviteActionError && (
          <div className="px-6 pt-4">
            <div className="banner banner-red text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{inviteActionError}</span>
            </div>
          </div>
        )}

        {invitations.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div
              className="inline-flex items-center justify-center w-10 h-10 rounded-full mx-auto mb-3"
              style={{ backgroundColor: 'var(--bg-muted)' }}
            >
              <Mail className="w-5 h-5" style={{ color: 'var(--muted)' }} strokeWidth={1.85} />
            </div>
            <p className="text-sm font-medium">No pending invitations</p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
              Everyone you&apos;ve invited has responded.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {invitations.map((inv, i) => {
              const role = roleStyles[inv.role] ?? roleStyles.member;
              const copied = copiedId === inv.id;
              return (
                <div
                  key={inv.id}
                  className="px-6 py-4 flex items-center justify-between gap-4"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--muted)' }}
                    >
                      <Mail className="w-4 h-4" strokeWidth={1.85} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted)' }}>
                        Invited {formatDate(inv.created_at)} · Expires {formatDate(inv.expires_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="chip"
                      style={{ backgroundColor: role.bg, color: role.fg, fontSize: 11 }}
                    >
                      {role.label}
                    </span>
                    {canManage && (
                      <>
                        <button
                          onClick={() => onCopyLink(inv)}
                          disabled={isPending}
                          className="btn btn-ghost btn-xs"
                          style={{ color: 'var(--muted-strong)' }}
                          title="Copy invite link"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Link
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => onRevoke(inv.id, inv.email)}
                          disabled={isPending}
                          className="btn btn-ghost btn-xs"
                          style={{ color: 'var(--status-red)' }}
                          title="Cancel invitation"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </>
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

/* ─── Roles reference ─────────────────────────────────────────────────────── */

const PERMISSIONS: { label: string; owner: boolean; admin: boolean; member: boolean }[] = [
  { label: 'View organization & members', owner: true, admin: true, member: true },
  { label: 'Use API keys & access the dashboard', owner: true, admin: true, member: true },
  { label: 'Invite new members', owner: true, admin: true, member: false },
  { label: 'Change member roles', owner: true, admin: true, member: false },
  { label: 'Remove members', owner: true, admin: true, member: false },
  { label: 'Cancel pending invitations', owner: true, admin: true, member: false },
  { label: 'Rename org, change slug & logo', owner: true, admin: false, member: false },
  { label: 'Delete the organization', owner: true, admin: false, member: false },
];

function Cell({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <Check className="w-4 h-4 mx-auto" style={{ color: 'var(--status-green)' }} strokeWidth={2.2} />
  ) : (
    <X className="w-4 h-4 mx-auto" style={{ color: 'var(--border-strong)' }} strokeWidth={2.2} />
  );
}

function RolesTab() {
  return (
    <div className="card overflow-hidden anim-fade-up delay-1">
      <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="font-semibold text-[15px]">Roles & permissions</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          What each role can do in your organization.
        </p>
      </div>

      <div className="px-6 py-5 grid gap-4 sm:grid-cols-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <span className="chip" style={{ backgroundColor: roleStyles.owner.bg, color: roleStyles.owner.fg, fontSize: 11 }}>
            Owner
          </span>
          <p className="text-xs mt-2" style={{ color: 'var(--muted-strong)' }}>
            Full control, including destructive actions like deleting the organization.
          </p>
        </div>
        <div>
          <span className="chip" style={{ backgroundColor: roleStyles.admin.bg, color: roleStyles.admin.fg, fontSize: 11 }}>
            Admin
          </span>
          <p className="text-xs mt-2" style={{ color: 'var(--muted-strong)' }}>
            Manages members and invitations, but cannot change org settings or delete it.
          </p>
        </div>
        <div>
          <span className="chip" style={{ backgroundColor: roleStyles.member.bg, color: roleStyles.member.fg, fontSize: 11 }}>
            Member
          </span>
          <p className="text-xs mt-2" style={{ color: 'var(--muted-strong)' }}>
            Can use the product, but cannot manage the team or organization.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Permission</th>
              <th style={{ textAlign: 'center' }}>Owner</th>
              <th style={{ textAlign: 'center' }}>Admin</th>
              <th style={{ textAlign: 'center' }}>Member</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p.label}>
                <td>{p.label}</td>
                <td><Cell allowed={p.owner} /></td>
                <td><Cell allowed={p.admin} /></td>
                <td><Cell allowed={p.member} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
