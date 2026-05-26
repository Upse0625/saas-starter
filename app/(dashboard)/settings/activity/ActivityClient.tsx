'use client';

import { useMemo, useState, useTransition } from 'react';
import { Activity as ActivityIcon, AlertCircle } from 'lucide-react';
import {
  relativeTime,
  formatAction,
  formatAbsoluteTime,
  formatDayHeader,
  dayKey,
} from '@/lib/format';

interface AuditEntry {
  id: number;
  org_id: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

interface ActivityClientProps {
  initialEntries: AuditEntry[];
  pageSize: number;
}

const avatarGradients = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #10b981, #14b8a6)',
  'linear-gradient(135deg, #f472b6, #c084fc)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
];

function avatarBg(seed: string): string {
  if (!seed || seed === 'System') return 'linear-gradient(135deg, #71717a, #52525b)';
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return avatarGradients[Math.abs(h) % avatarGradients.length];
}

export default function ActivityClient({ initialEntries, pageSize }: ActivityClientProps) {
  const [entries, setEntries] = useState<AuditEntry[]>(initialEntries);
  const [hasMore, setHasMore] = useState(initialEntries.length >= pageSize);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const grouped = useMemo(() => groupByDay(entries), [entries]);

  function loadMore() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/audit?limit=${pageSize}&offset=${entries.length}`);
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? `Failed to load more (HTTP ${res.status})`);
          return;
        }
        const data = (await res.json()) as { entries: AuditEntry[] };
        const next = data.entries ?? [];
        setEntries((prev) => [...prev, ...next]);
        setHasMore(next.length >= pageSize);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load more');
      }
    });
  }

  if (entries.length === 0) {
    return (
      <div className="card p-16 text-center anim-fade-up delay-1">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-3"
          style={{ backgroundColor: 'var(--bg-muted)' }}
        >
          <ActivityIcon
            className="w-6 h-6"
            style={{ color: 'var(--muted)' }}
            strokeWidth={1.85}
          />
        </div>
        <p className="text-sm font-medium">No activity yet</p>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
          Events will appear here as your team uses the product.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 anim-fade-up delay-1">
      <div className="card overflow-hidden">
        {grouped.map((group) => (
          <div key={group.key}>
            <div
              className="px-6 py-2 flex items-center"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--muted)' }}
              >
                {formatDayHeader(group.entries[0].created_at)}
              </p>
            </div>
            {group.entries.map((entry) => (
              <Row key={entry.id} entry={entry} />
            ))}
          </div>
        ))}
      </div>

      {error && (
        <div className="banner banner-red text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={isPending}
            className="btn btn-secondary"
          >
            {isPending ? (
              <>
                <span className="spinner" />
                Loading
              </>
            ) : (
              'Load more'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ entry }: { entry: AuditEntry }) {
  const actorName = entry.actor_name ?? (entry.actor_user_id ? 'Unknown user' : 'System');
  const actorEmail = entry.actor_email;
  const initial = actorName.charAt(0).toUpperCase();

  return (
    <div
      className="px-6 py-3.5 flex items-start gap-3 transition-colors"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold"
        style={{ background: avatarBg(actorEmail ?? actorName) }}
      >
        {initial}
      </div>

      <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-12 md:gap-4 md:items-center">
        <div className="md:col-span-5 min-w-0">
          <p className="text-sm leading-snug">
            <span className="font-medium">{actorName}</span>{' '}
            <span style={{ color: 'var(--muted-strong)' }}>
              {formatAction(entry.action).toLowerCase()}
            </span>
          </p>
          {actorEmail && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
              {actorEmail}
            </p>
          )}
        </div>

        <div className="md:col-span-4 min-w-0 mt-1 md:mt-0">
          {entry.target_id ? (
            <div className="flex items-center gap-2 min-w-0">
              {entry.target_type && (
                <span
                  className="chip"
                  style={{ fontSize: 10, padding: '2px 6px', flexShrink: 0 }}
                >
                  {entry.target_type}
                </span>
              )}
              <code
                className="truncate text-xs"
                style={{
                  color: 'var(--muted-strong)',
                  fontFamily: 'var(--font-mono)',
                }}
                title={entry.target_id}
              >
                {entry.target_id}
              </code>
            </div>
          ) : (
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              —
            </span>
          )}
          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
            <p
              className="truncate text-xs mt-0.5"
              style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
              title={JSON.stringify(entry.metadata)}
            >
              {summarizeMetadata(entry.metadata)}
            </p>
          )}
        </div>

        <div
          className="md:col-span-2 text-xs mt-1 md:mt-0"
          style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
        >
          {entry.ip ?? '—'}
        </div>

        <div
          className="md:col-span-1 text-xs md:text-right whitespace-nowrap"
          style={{ color: 'var(--muted)' }}
          title={formatAbsoluteTime(entry.created_at)}
        >
          {relativeTime(entry.created_at)}
        </div>
      </div>
    </div>
  );
}

function summarizeMetadata(metadata: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(metadata)) {
    if (v == null) continue;
    const value = typeof v === 'object' ? JSON.stringify(v) : String(v);
    parts.push(`${k}=${value}`);
    if (parts.join(' ').length > 80) break;
  }
  return parts.join(' ');
}

interface DayGroup {
  key: string;
  entries: AuditEntry[];
}

function groupByDay(entries: AuditEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  let current: DayGroup | null = null;
  for (const entry of entries) {
    const key = dayKey(entry.created_at);
    if (!current || current.key !== key) {
      current = { key, entries: [] };
      groups.push(current);
    }
    current.entries.push(entry);
  }
  return groups;
}
