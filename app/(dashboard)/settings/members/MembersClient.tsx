'use client';

import { useState, useTransition } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Member {
  id: number;
  role: string;
  created_at: string;
  user_id: string;
  name: string;
  email: string;
}

interface MembersClientProps {
  initialMembers: Member[];
  currentUserId: string;
  canManage: boolean;
  orgPlan: string;
}

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
  currentUserId,
  canManage,
}: MembersClientProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [isPending, startTransition] = useTransition();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

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
        setInviteSuccess(`Invitation sent to ${inviteEmail} (check the server console for the URL).`);
        setInviteEmail('');
      } else {
        const data = (await res.json()) as { error?: string };
        setInviteError(data.error ?? 'Failed to send invitation');
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
        const data = (await res.json()) as { error?: string };
        setRemoveError(data.error ?? 'Failed to remove member');
      }
    });
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="card p-6 anim-fade-up delay-1">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4" style={{ color: 'var(--accent)' }} strokeWidth={1.85} />
            <h2 className="font-semibold text-[15px]">Invite a member</h2>
          </div>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
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
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2 className="font-semibold text-[15px]">Members</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {members.length} {members.length === 1 ? 'person' : 'people'} in your organization
            </p>
          </div>
        </div>

        {removeError && (
          <div className="px-6 pt-4">
            <div className="banner banner-red text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{removeError}</span>
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
              return (
                <div
                  key={member.id}
                  className={`px-6 py-4 flex items-center justify-between gap-4 transition-colors anim-fade-up delay-${Math.min(i + 1, 7)}`}
                  style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold"
                      style={{ background: avatarBg(member.email) }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        {member.user_id === currentUserId && (
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
                    <span
                      className="chip"
                      style={{ backgroundColor: role.bg, color: role.fg, fontSize: 11 }}
                    >
                      {role.label}
                    </span>
                    <span
                      className="text-xs hidden md:block"
                      style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
                    >
                      Joined {formatDate(member.created_at)}
                    </span>
                    {canManage && member.role !== 'owner' && member.user_id !== currentUserId ? (
                      <button
                        onClick={() => handleRemove(member.id, member.name)}
                        disabled={isPending}
                        className="btn btn-ghost btn-xs"
                        style={{ color: 'var(--muted)' }}
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="w-8 h-8 inline-flex items-center justify-center" style={{ color: 'var(--border-strong)' }}>
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
    </div>
  );
}
