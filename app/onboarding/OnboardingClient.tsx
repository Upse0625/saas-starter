'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  Check,
  Plus,
  X,
} from 'lucide-react';
import type { PlanConfig, PlanId } from '@/lib/stripe';

interface OnboardingClientProps {
  orgName: string;
  currentPlan: PlanId;
  name: string;
  avatar: string | null;
  plans: PlanConfig[];
}

interface InviteRow {
  id: number;
  email: string;
  role: 'admin' | 'member';
}

const MAX_AVATAR_BYTES = 512 * 1024; // 512KB raw file
const MAX_INVITES = 3;
const STEPS = ['Profile', 'Invite team', 'Choose plan'] as const;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function OnboardingClient({
  orgName,
  currentPlan,
  name: initialName,
  avatar: initialAvatar,
  plans,
}: OnboardingClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [isFinishing, startFinish] = useTransition();

  // Step 1 — profile
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, startProfile] = useTransition();

  // Step 2 — invites
  const [invites, setInvites] = useState<InviteRow[]>([
    { id: 1, email: '', role: 'member' },
  ]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [isSendingInvites, startInvites] = useTransition();

  // Step 3 — plan
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(currentPlan);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setProfileError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setProfileError('Image must be smaller than 512KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
    reader.onerror = () => setProfileError('Failed to read the image file.');
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatar(null);
    setProfileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function saveProfileAndContinue() {
    setProfileError(null);
    if (name.trim().length < 2) {
      setProfileError('Name must be at least 2 characters.');
      return;
    }
    startProfile(async () => {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), avatar }),
      });
      if (res.ok) {
        setStep(1);
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setProfileError(data.error ?? 'Failed to save your profile.');
      }
    });
  }

  function addInviteRow() {
    setInvites((prev) =>
      prev.length >= MAX_INVITES
        ? prev
        : [...prev, { id: Date.now(), email: '', role: 'member' }],
    );
  }

  function removeInviteRow(id: number) {
    setInvites((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  function updateInvite(id: number, patch: Partial<InviteRow>) {
    setInvites((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function sendInvitesAndContinue() {
    setInviteError(null);
    setInviteNotice(null);

    const filled = invites
      .map((r) => ({ ...r, email: r.email.trim() }))
      .filter((r) => r.email.length > 0);

    if (filled.length === 0) {
      // Nothing to send — treat as skip.
      setStep(2);
      return;
    }

    const invalid = filled.find((r) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
    if (invalid) {
      setInviteError(`"${invalid.email}" is not a valid email address.`);
      return;
    }

    startInvites(async () => {
      const results = await Promise.all(
        filled.map((r) =>
          fetch('/api/org/invitations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: r.email, role: r.role }),
          }).then((res) => res.ok),
        ),
      );
      const sent = results.filter(Boolean).length;
      const failed = results.length - sent;
      if (failed > 0) {
        setInviteError(
          `Sent ${sent} invite${sent === 1 ? '' : 's'}, but ${failed} failed. You can invite the rest later from Settings.`,
        );
        return;
      }
      setInviteNotice(`Sent ${sent} invite${sent === 1 ? '' : 's'}.`);
      setStep(2);
    });
  }

  function complete(destination: string = '/dashboard') {
    startFinish(async () => {
      await fetch('/api/onboarding/complete', { method: 'POST' });
      router.push(destination);
      router.refresh();
    });
  }

  const busy = isSavingProfile || isSendingInvites || isFinishing;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(180deg, #fafaf9 0%, #f4f4f5 100%)' }}
    >
      <div className="w-full max-w-xl">
        {/* Brand */}
        <div className="flex items-center justify-center mb-6 anim-fade-up delay-0">
          <span className="flex items-center gap-2.5">
            <span
              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-white"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <Sparkles className="w-4 h-4" strokeWidth={2.25} />
            </span>
            <span className="text-base font-semibold tracking-tight">Saasly</span>
          </span>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6 anim-fade-up delay-1">
          {STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center justify-center rounded-full text-xs font-semibold transition-colors"
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: done || active ? 'var(--accent)' : 'var(--bg-muted)',
                      color: done || active ? '#fff' : 'var(--muted)',
                      border: active ? '2px solid var(--accent-soft)' : '1px solid var(--border)',
                    }}
                  >
                    {done ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
                  </span>
                  <span
                    className="text-xs font-medium hidden sm:block"
                    style={{ color: active ? 'var(--fg)' : 'var(--muted)' }}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <span
                    className="rounded-full"
                    style={{
                      width: 24,
                      height: 2,
                      backgroundColor: i < step ? 'var(--accent)' : 'var(--border)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="card-elev p-8 anim-fade-up delay-2">
          {/* ── Step 1: profile ───────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold mb-2" style={{ letterSpacing: '-0.02em' }}>
                  Welcome to {orgName}
                </h1>
                <p className="text-sm" style={{ color: 'var(--muted-strong)' }}>
                  Let&apos;s get you set up. First, confirm how you&apos;ll show up to your team.
                </p>
              </div>

              <div className="flex items-center gap-4">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt="Avatar preview"
                    width={64}
                    height={64}
                    className="rounded-full object-cover flex-shrink-0"
                    style={{ width: 64, height: 64, border: '1px solid var(--border)' }}
                  />
                ) : (
                  <div
                    className="rounded-full inline-flex items-center justify-center flex-shrink-0 text-base font-semibold text-white"
                    style={{ width: 64, height: 64, backgroundColor: 'var(--accent)' }}
                  >
                    {initialsOf(name)}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-secondary btn-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload
                    </button>
                    {avatar && (
                      <button type="button" onClick={removeAvatar} className="btn btn-secondary btn-sm">
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    JPG, PNG or GIF. Max 512KB.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onPickFile}
                  className="hidden"
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1.5">
                  Display name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  className="input"
                />
              </div>

              {profileError && (
                <div className="banner banner-red text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={saveProfileAndContinue}
                  disabled={busy}
                  className="btn btn-primary"
                >
                  {isSavingProfile ? (
                    <>
                      <span className="spinner" />
                      Saving
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: invite team ──────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-5 h-5" style={{ color: 'var(--accent)' }} strokeWidth={1.85} />
                  <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
                    Invite your team
                  </h1>
                </div>
                <p className="text-sm" style={{ color: 'var(--muted-strong)' }}>
                  Saasly is better together. Add up to {MAX_INVITES} teammates now — or skip and do
                  it later.
                </p>
              </div>

              <div className="space-y-3">
                {invites.map((row) => (
                  <div key={row.id} className="flex gap-2">
                    <input
                      type="email"
                      value={row.email}
                      onChange={(e) => updateInvite(row.id, { email: e.target.value })}
                      placeholder="colleague@example.com"
                      className="input flex-1"
                    />
                    <select
                      value={row.role}
                      onChange={(e) =>
                        updateInvite(row.id, { role: e.target.value as 'admin' | 'member' })
                      }
                      className="input"
                      style={{ width: 'auto', minWidth: 110 }}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    {invites.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInviteRow(row.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--muted)' }}
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {invites.length < MAX_INVITES && (
                  <button
                    type="button"
                    onClick={addInviteRow}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--accent-hover)' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add another
                  </button>
                )}
              </div>

              {inviteError && (
                <div className="banner banner-red text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}
              {inviteNotice && (
                <div className="banner banner-green text-sm">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{inviteNotice}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  disabled={busy}
                  className="btn btn-secondary"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={busy}
                    className="btn btn-ghost"
                    style={{ color: 'var(--muted-strong)' }}
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={sendInvitesAndContinue}
                    disabled={busy}
                    className="btn btn-primary"
                  >
                    {isSendingInvites ? (
                      <>
                        <span className="spinner" />
                        Sending
                      </>
                    ) : (
                      <>
                        Send invites
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: choose plan ──────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold mb-2" style={{ letterSpacing: '-0.02em' }}>
                  Choose a plan
                </h1>
                <p className="text-sm" style={{ color: 'var(--muted-strong)' }}>
                  Start free on Starter — you can upgrade anytime from Billing.
                </p>
              </div>

              <div className="space-y-3">
                {plans.map((plan) => {
                  const active = selectedPlan === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className="card w-full text-left p-4 transition-colors"
                      style={{
                        borderColor: active ? 'var(--accent)' : 'var(--border)',
                        boxShadow: active ? '0 0 0 1px var(--accent)' : 'var(--shadow-sm)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span
                            className="inline-flex items-center justify-center rounded-full flex-shrink-0 mt-0.5"
                            style={{
                              width: 18,
                              height: 18,
                              border: active
                                ? '5px solid var(--accent)'
                                : '2px solid var(--border-strong)',
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{plan.name}</span>
                              {plan.highlighted && (
                                <span
                                  className="chip"
                                  style={{
                                    fontSize: 10,
                                    backgroundColor: 'var(--accent-soft)',
                                    color: 'var(--accent-hover)',
                                  }}
                                >
                                  Popular
                                </span>
                              )}
                            </div>
                            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                              {plan.features[0]}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-lg font-semibold">${plan.price}</span>
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>
                            /mo
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={busy}
                  className="btn btn-secondary"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                {selectedPlan === 'starter' ? (
                  <button
                    type="button"
                    onClick={() => complete()}
                    disabled={busy}
                    className="btn btn-primary"
                  >
                    {isFinishing ? (
                      <>
                        <span className="spinner" />
                        Finishing
                      </>
                    ) : (
                      <>
                        Continue on Starter
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => complete()}
                      disabled={busy}
                      className="btn btn-ghost"
                      style={{ color: 'var(--muted-strong)' }}
                    >
                      {isFinishing ? 'Finishing' : 'Finish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => complete('/settings/billing')}
                      disabled={busy}
                      className="btn btn-primary"
                    >
                      Upgrade to {plans.find((p) => p.id === selectedPlan)?.name}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Persistent skip */}
        <div className="text-center mt-6 anim-fade-up delay-3">
          <button
            type="button"
            onClick={() => complete()}
            disabled={busy}
            className="text-xs font-medium"
            style={{ color: 'var(--muted)' }}
          >
            Skip onboarding
          </button>
        </div>
      </div>
    </div>
  );
}
