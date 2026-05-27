'use client';

import { useState } from 'react';
import {
  Webhook,
  Plus,
  Trash2,
  Send,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface Endpoint {
  id: string;
  url: string;
  description: string | null;
  events: string;
  enabled: number;
  created_at: string;
}

interface Delivery {
  id: string;
  endpoint_id: string;
  event_type: string;
  status: 'pending' | 'success' | 'failed';
  status_code: number | null;
  attempts: number;
  created_at: string;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  error: string | null;
  payload: string;
  response_body: string | null;
}

interface Props {
  initialEndpoints: Endpoint[];
  initialDeliveries: Delivery[];
  availableEvents: string[];
  canManage: boolean;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function statusChip(status: Delivery['status']): { cls: string; label: string } {
  if (status === 'success') return { cls: 'chip-green', label: 'Delivered' };
  if (status === 'failed') return { cls: 'chip-amber', label: 'Failed' };
  return { cls: 'chip', label: 'Pending' };
}

export default function WebhooksClient({ initialEndpoints, initialDeliveries, availableEvents, canManage }: Props) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>(initialEndpoints);
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries);

  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [allEvents, setAllEvents] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [newSecret, setNewSecret] = useState<{ url: string; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; code: number | null } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);

  function toggleEvent(ev: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ev)) next.delete(ev);
      else next.add(ev);
      return next;
    });
  }

  async function refreshDeliveries() {
    const r = await fetch('/api/webhooks/deliveries?limit=100');
    if (r.ok) {
      const d = (await r.json()) as { deliveries: Delivery[] };
      setDeliveries(d.deliveries);
    }
  }

  async function createEndpoint(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    const events = allEvents ? ['*'] : [...selected];
    const res = await fetch('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, description: description || undefined, events }),
    });
    if (res.ok) {
      const ep = (await res.json()) as Endpoint & { secret: string };
      setEndpoints((prev) => [{ ...ep }, ...prev]);
      setNewSecret({ url: ep.url, secret: ep.secret });
      setShowForm(false);
      setUrl('');
      setDescription('');
      setAllEvents(true);
      setSelected(new Set());
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? 'Could not create endpoint.');
    }
    setCreating(false);
  }

  async function toggleEnabled(ep: Endpoint) {
    setBusyId(ep.id);
    const res = await fetch(`/api/webhooks/${ep.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: ep.enabled === 1 ? false : true }),
    });
    if (res.ok) {
      setEndpoints((prev) => prev.map((x) => (x.id === ep.id ? { ...x, enabled: x.enabled === 1 ? 0 : 1 } : x)));
    }
    setBusyId(null);
  }

  async function deleteEndpoint(id: string) {
    if (!confirm('Delete this endpoint? Future events will no longer be delivered to it.')) return;
    setBusyId(id);
    const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
    if (res.ok) setEndpoints((prev) => prev.filter((x) => x.id !== id));
    setBusyId(null);
  }

  async function sendTest(id: string) {
    setBusyId(id);
    setTestResult(null);
    const res = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' });
    if (res.ok) {
      const d = (await res.json()) as { delivery: Delivery };
      setTestResult({ id, ok: d.delivery.status === 'success', code: d.delivery.status_code });
      await refreshDeliveries();
    } else {
      setTestResult({ id, ok: false, code: null });
    }
    setBusyId(null);
  }

  async function retry(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/webhooks/deliveries/${id}/retry`, { method: 'POST' });
    if (res.ok) {
      const d = (await res.json()) as { delivery: Delivery };
      setDeliveries((prev) => prev.map((x) => (x.id === id ? d.delivery : x)));
    }
    setBusyId(null);
  }

  function copySecret() {
    if (!newSecret) return;
    navigator.clipboard.writeText(newSecret.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      {/* One-time secret reveal */}
      {newSecret && (
        <div className="card p-5 anim-fade-up" style={{ borderColor: 'var(--accent)' }}>
          <p className="text-sm font-medium mb-1">Signing secret for {newSecret.url}</p>
          <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
            Store this now — it won&apos;t be shown again. Use it to verify the{' '}
            <code>X-Webhook-Signature</code> header on incoming requests.
          </p>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 px-3 py-2 rounded-md text-xs font-mono overflow-x-auto"
              style={{ background: 'var(--bg-muted)' }}
            >
              {newSecret.secret}
            </code>
            <button className="btn btn-secondary" onClick={copySecret}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button className="btn btn-ghost mt-3 text-sm" onClick={() => setNewSecret(null)}>
            Done
          </button>
        </div>
      )}

      {/* Endpoints */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Webhook className="w-4 h-4" style={{ color: 'var(--muted-strong)' }} />
            <h2 className="text-sm font-semibold">Endpoints</h2>
          </div>
          {canManage && !showForm && (
            <button className="btn btn-primary text-sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" /> Add endpoint
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={createEndpoint} className="mb-5 p-4 rounded-md space-y-3" style={{ background: 'var(--bg-subtle)' }}>
            {error && <div className="banner banner-red text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium mb-1.5">Endpoint URL</label>
              <input
                className="input"
                placeholder="https://api.yourapp.com/webhooks/saasly"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
              <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Production listener" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Events</label>
              <label className="flex items-center gap-2 text-sm mb-2 cursor-pointer">
                <input type="checkbox" checked={allEvents} onChange={(e) => setAllEvents(e.target.checked)} />
                All events (<code>*</code>) — receive everything, including future event types
              </label>
              {!allEvents && (
                <div className="grid grid-cols-2 gap-1.5 pl-1">
                  {availableEvents.map((ev) => (
                    <label key={ev} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={selected.has(ev)} onChange={() => toggleEvent(ev)} />
                      <code>{ev}</code>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary text-sm" disabled={creating}>
                {creating ? 'Creating…' : 'Create endpoint'}
              </button>
              <button type="button" className="btn btn-secondary text-sm" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {endpoints.length === 0 ? (
          <div className="text-center py-10">
            <Webhook className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--muted)' }} strokeWidth={1.5} />
            <p className="text-sm font-medium">No webhook endpoints yet</p>
            <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: 'var(--muted)' }}>
              Add an endpoint to receive signed HTTP POSTs when events happen in your organization —
              like <code>member.invited</code> or <code>billing.subscription_updated</code>.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {endpoints.map((ep) => (
              <div key={ep.id} className="flex items-center gap-3 p-3 rounded-md" style={{ border: '1px solid var(--border)' }}>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: ep.enabled === 1 ? 'var(--status-green, #16a34a)' : 'var(--muted)' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono truncate">{ep.url}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {ep.events === '*' ? (
                      <span className="chip text-[10px]">all events</span>
                    ) : (
                      ep.events.split(',').slice(0, 4).map((e) => (
                        <span key={e} className="chip text-[10px]">{e}</span>
                      ))
                    )}
                    {ep.description && <span className="text-xs" style={{ color: 'var(--muted)' }}>· {ep.description}</span>}
                  </div>
                  {testResult && testResult.id === ep.id && (
                    <p className="text-xs mt-1" style={{ color: testResult.ok ? 'var(--status-green, #16a34a)' : '#ef4444' }}>
                      Test {testResult.ok ? 'delivered' : 'failed'}{testResult.code ? ` · HTTP ${testResult.code}` : ''}
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button className="btn btn-ghost text-xs" disabled={busyId === ep.id} onClick={() => sendTest(ep.id)} title="Send test event">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button className="btn btn-ghost text-xs" disabled={busyId === ep.id} onClick={() => toggleEnabled(ep)}>
                      {ep.enabled === 1 ? 'Disable' : 'Enable'}
                    </button>
                    <button className="btn btn-ghost text-xs" disabled={busyId === ep.id} onClick={() => deleteEndpoint(ep.id)} title="Delete">
                      <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Signature docs */}
        <button className="flex items-center gap-1.5 text-xs mt-4" style={{ color: 'var(--muted-strong)' }} onClick={() => setShowDocs((s) => !s)}>
          {showDocs ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          Verifying signatures
        </button>
        {showDocs && (
          <pre className="mt-2 p-3 rounded-md text-[11px] overflow-x-auto" style={{ background: 'var(--bg-muted)' }}>
{`// Each request carries: X-Webhook-Signature: t=<unix>,v1=<hex>
// Recompute and compare in constant time:
import { createHmac, timingSafeEqual } from 'crypto';

function verify(secret, header, rawBody) {
  const p = Object.fromEntries(header.split(',').map(s => s.split('=')));
  if (Math.abs(Date.now()/1000 - Number(p.t)) > 300) return false; // replay window
  const expected = createHmac('sha256', secret)
    .update(\`\${p.t}.\${rawBody}\`).digest('hex');
  const a = Buffer.from(p.v1), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}`}
          </pre>
        )}
      </div>

      {/* Deliveries */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Recent deliveries</h2>
          <button className="btn btn-ghost text-xs" onClick={refreshDeliveries}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        {deliveries.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
            No deliveries yet. Add an endpoint and send a test event, or trigger an action like inviting a member.
          </p>
        ) : (
          <div className="space-y-1">
            {deliveries.map((d) => {
              const chip = statusChip(d.status);
              const open = expanded === d.id;
              return (
                <div key={d.id} style={{ borderBottom: '1px solid var(--border-subtle, var(--border))' }}>
                  <button
                    className="w-full flex items-center gap-3 py-2.5 text-left"
                    onClick={() => setExpanded(open ? null : d.id)}
                  >
                    {open ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
                    <code className="text-xs flex-shrink-0">{d.event_type}</code>
                    <span className={`chip ${chip.cls} text-[10px]`}>{chip.label}</span>
                    {d.status_code != null && <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{d.status_code}</span>}
                    <span className="text-xs ml-auto" style={{ color: 'var(--muted)' }}>
                      {d.attempts > 1 ? `${d.attempts} attempts · ` : ''}{relTime(d.created_at)}
                    </span>
                  </button>
                  {open && (
                    <div className="pb-3 pl-7 space-y-2">
                      {d.error && (
                        <p className="text-xs" style={{ color: '#ef4444' }}>Error: {d.error}</p>
                      )}
                      <div>
                        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Payload</p>
                        <pre className="p-2 rounded text-[11px] overflow-x-auto" style={{ background: 'var(--bg-muted)' }}>
                          {(() => { try { return JSON.stringify(JSON.parse(d.payload), null, 2); } catch { return d.payload; } })()}
                        </pre>
                      </div>
                      {d.response_body && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Response</p>
                          <pre className="p-2 rounded text-[11px] overflow-x-auto" style={{ background: 'var(--bg-muted)' }}>{d.response_body}</pre>
                        </div>
                      )}
                      {canManage && d.status === 'failed' && (
                        <button className="btn btn-secondary text-xs" disabled={busyId === d.id} onClick={() => retry(d.id)}>
                          <RefreshCw className="w-3.5 h-3.5" /> Retry now
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
