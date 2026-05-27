'use client';

import { useState, useTransition } from 'react';
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  Trash2,
  UserRound,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

interface PersonalKeysClientProps {
  initialKeys: ApiKey[];
}

interface CreatedKey {
  id: string;
  name: string;
  key: string;
}

export default function PersonalKeysClient({ initialKeys }: PersonalKeysClientProps) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function resetCreateForm() {
    setShowCreate(false);
    setNewName('');
    setCreateError(null);
  }

  function dismissCreatedKey() {
    setCreatedKey(null);
    setCopied(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const trimmed = newName.trim();
    if (!trimmed) {
      setCreateError('Name is required');
      return;
    }

    startTransition(async () => {
      const res = await fetch('/api/keys/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      if (res.ok) {
        const data = (await res.json()) as CreatedKey;
        setCreatedKey(data);
        const listRes = await fetch('/api/keys/personal');
        if (listRes.ok) {
          const listData = (await listRes.json()) as { keys: ApiKey[] };
          setKeys(listData.keys);
        }
        resetCreateForm();
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setCreateError(data.error ?? 'Failed to create API key');
      }
    });
  }

  async function handleRevoke(keyId: string, name: string) {
    if (!confirm(`Revoke API key "${name}"? This cannot be undone.`)) return;
    setRevokeError(null);

    startTransition(async () => {
      const res = await fetch(`/api/keys/personal/${keyId}`, { method: 'DELETE' });
      if (res.ok) {
        const data = (await res.json()) as { revoked_at: string };
        setKeys((prev) =>
          prev.map((k) => (k.id === keyId ? { ...k, revoked_at: data.revoked_at } : k)),
        );
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setRevokeError(data.error ?? 'Failed to revoke key');
      }
    });
  }

  async function handleCopy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Explainer */}
      <div className="banner banner-accent text-sm anim-fade-up delay-0">
        <UserRound className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          Personal keys are owned by you alone and are revoked if you leave the organization.
          For keys shared across your team, use the{' '}
          <a href="/settings/api-keys" style={{ textDecoration: 'underline' }}>
            organization API keys
          </a>{' '}
          instead.
        </span>
      </div>

      {/* One-time created key */}
      {createdKey && (
        <div
          className="card-elev p-6 anim-fade-up delay-0"
          style={{ borderColor: '#fde68a', backgroundColor: 'var(--status-amber-soft)' }}
        >
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              style={{ color: '#b45309' }}
            />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
                New API key — {createdKey.name}
              </p>
              <p className="text-sm" style={{ color: '#92400e' }}>
                Save this key now. You won&apos;t be able to see it again.
              </p>
            </div>
          </div>
          <div className="flex items-stretch gap-2">
            <code
              className="flex-1 px-3 py-2.5 break-all rounded-md text-sm"
              style={{
                backgroundColor: '#ffffff',
                color: 'var(--fg)',
                fontFamily: 'var(--font-mono)',
                border: '1px solid #fde68a',
              }}
            >
              {createdKey.key}
            </code>
            <button
              type="button"
              onClick={() => handleCopy(createdKey.key)}
              className="btn btn-primary"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={dismissCreatedKey}
            className="btn btn-ghost btn-xs mt-4"
            style={{ color: '#92400e' }}
          >
            I&apos;ve saved it — dismiss
          </button>
        </div>
      )}

      {/* Create panel */}
      {!createdKey && (
        <div className="card p-6 anim-fade-up delay-1">
          {!showCreate ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex items-center justify-center w-9 h-9 rounded-md"
                  style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  <KeyRound className="w-4 h-4" strokeWidth={1.85} />
                </span>
                <div>
                  <p className="text-sm font-semibold">Create a personal API key</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted-strong)' }}>
                    Use it to authenticate requests to the{' '}
                    <code style={{ fontFamily: 'var(--font-mono)' }}>/v1</code> API as you.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4" />
                Create API key
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate}>
              <p className="text-sm font-semibold mb-3">Name your key</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. My laptop CLI"
                  required
                  maxLength={100}
                  autoFocus
                  className="input flex-1"
                />
                <button type="submit" disabled={isPending} className="btn btn-primary whitespace-nowrap">
                  {isPending ? (
                    <>
                      <span className="spinner" />
                      Creating
                    </>
                  ) : (
                    'Create'
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetCreateForm}
                  disabled={isPending}
                  className="btn btn-secondary whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
              {createError && (
                <div className="banner banner-red mt-3 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {/* Keys table */}
      <div className="card overflow-hidden anim-fade-up delay-2">
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2 className="font-semibold text-[15px]">Keys</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {keys.length} {keys.length === 1 ? 'key' : 'keys'} total
            </p>
          </div>
        </div>

        {revokeError && (
          <div className="px-6 pt-4">
            <div className="banner banner-red text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{revokeError}</span>
            </div>
          </div>
        )}

        {keys.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div
              className="inline-flex items-center justify-center w-10 h-10 rounded-full mx-auto mb-3"
              style={{ backgroundColor: 'var(--bg-muted)' }}
            >
              <KeyRound className="w-5 h-5" style={{ color: 'var(--muted)' }} strokeWidth={1.85} />
            </div>
            <p className="text-sm font-medium">No personal API keys yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
              Create your first key to start using the public API as yourself.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Prefix</th>
                  <th>Last used</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => {
                  const revoked = !!k.revoked_at;
                  return (
                    <tr key={k.id} style={{ opacity: revoked ? 0.55 : 1 }}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{k.name}</span>
                          {revoked && <span className="chip chip-red">Revoked</span>}
                        </div>
                      </td>
                      <td
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 13,
                          color: 'var(--muted-strong)',
                        }}
                      >
                        {k.key_prefix}…
                      </td>
                      <td style={{ color: 'var(--muted-strong)' }}>
                        {k.last_used_at ? formatDate(k.last_used_at) : (
                          <span style={{ color: 'var(--muted)' }}>Never</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--muted-strong)' }}>{formatDate(k.created_at)}</td>
                      <td className="text-right">
                        {!revoked && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(k.id, k.name)}
                            disabled={isPending}
                            className="btn btn-danger btn-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
