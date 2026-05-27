'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Building2,
  ImageIcon,
  Upload,
  Trash2,
} from 'lucide-react';
import { slugify } from '@/lib/utils';

interface SettingsClientProps {
  initialName: string;
  initialSlug: string;
  initialLogo: string | null;
  role: string;
}

const MAX_LOGO_BYTES = 512 * 1024;

export default function SettingsClient({
  initialName,
  initialSlug,
  initialLogo,
  role,
}: SettingsClientProps) {
  const router = useRouter();
  const isOwner = role === 'owner';

  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [logo, setLogo] = useState<string | null>(initialLogo);

  const [savedName, setSavedName] = useState(initialName);
  const [savedSlug, setSavedSlug] = useState(initialSlug);
  const [savedLogo, setSavedLogo] = useState<string | null>(initialLogo);

  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete state.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const dirty =
    name.trim() !== savedName ||
    slugify(slug) !== savedSlug ||
    (logo ?? null) !== (savedLogo ?? null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError('Image must be under 512 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogo(reader.result);
      }
    };
    reader.onerror = () => setError('Could not read the image file.');
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Organization name must be at least 2 characters.');
      return;
    }
    const normalizedSlug = slugify(slug);
    if (!normalizedSlug) {
      setError('Slug cannot be empty.');
      return;
    }

    startTransition(async () => {
      const res = await fetch('/api/org', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, slug: normalizedSlug, logo }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          organization: { name: string; slug: string; logo: string | null };
        };
        setSavedName(data.organization.name);
        setSavedSlug(data.organization.slug);
        setSavedLogo(data.organization.logo);
        setName(data.organization.name);
        setSlug(data.organization.slug);
        setLogo(data.organization.logo);
        setSuccess('Organization settings saved.');
        router.refresh();
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Failed to save changes.');
      }
    });
  }

  async function handleDelete() {
    setDeleteError(null);
    startTransition(async () => {
      const res = await fetch('/api/org/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: confirmName }),
      });

      if (res.ok) {
        const data = (await res.json()) as { action?: string; redirect?: string };
        if (data.action === 'logout') {
          window.location.href = data.redirect ?? '/login';
        } else {
          // 'switched' or 'none' — reload into the resolved org.
          window.location.href = '/dashboard';
        }
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setDeleteError(data.error ?? 'Failed to delete organization.');
      }
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="card max-w-2xl anim-fade-up delay-1">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold text-[15px]">Organization</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Public details for {savedName}.
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Logo</label>
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border)' }}
              >
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="Organization logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6" style={{ color: 'var(--muted)' }} strokeWidth={1.85} />
                )}
              </div>
              {isOwner && (
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary btn-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {logo ? 'Replace' : 'Upload'}
                  </button>
                  {logo && (
                    <button type="button" onClick={removeLogo} className="btn btn-ghost btn-sm" style={{ color: 'var(--muted-strong)' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              <ImageIcon className="w-3 h-3 inline mr-1 align-text-bottom" />
              PNG, JPG or SVG, up to 512 KB.
            </p>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5">
              Organization name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isOwner}
              required
              minLength={2}
              className="input"
            />
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-1.5">
              URL slug
            </label>
            <div
              className="flex items-stretch overflow-hidden rounded-md"
              style={{ border: '1px solid var(--border)' }}
            >
              <span
                className="px-3 flex items-center text-sm"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--muted)',
                  borderRight: '1px solid var(--border)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                saasly.io/
              </span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                onBlur={() => setSlug((s) => slugify(s))}
                disabled={!isOwner}
                className="flex-1 px-3 py-2.5 text-sm"
                style={{
                  backgroundColor: isOwner ? 'var(--bg)' : 'var(--bg-subtle)',
                  color: 'var(--fg)',
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
              Lowercase letters, numbers and dashes. Must be unique.
            </p>
          </div>

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

          {isOwner ? (
            <div className="flex justify-end pt-1">
              <button type="submit" disabled={isPending || !dirty} className="btn btn-primary">
                {isPending ? (
                  <>
                    <span className="spinner" />
                    Saving
                  </>
                ) : (
                  'Save changes'
                )}
              </button>
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Only the organization owner can edit these settings.
            </p>
          )}
        </div>
      </form>

      {isOwner && (
        <div className="card max-w-2xl anim-fade-up delay-2" style={{ borderColor: '#fecaca' }}>
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ borderBottom: '1px solid #fecaca', backgroundColor: 'var(--status-red-soft)' }}
          >
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--status-red)' }} />
            <h2 className="font-semibold text-[15px]" style={{ color: '#991b1b' }}>
              Danger zone
            </h2>
          </div>
          <div className="p-6">
            {!deleteOpen ? (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold">Delete organization</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--muted-strong)' }}>
                    Permanently delete your organization and all associated data.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteOpen(true);
                    setConfirmName('');
                    setDeleteError(null);
                  }}
                  className="btn btn-danger btn-sm"
                >
                  Delete
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold">Delete {savedName}?</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--muted-strong)' }}>
                    This removes all members, invitations, API keys and audit logs. This action
                    cannot be undone. Type{' '}
                    <span className="font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
                      {savedName}
                    </span>{' '}
                    to confirm.
                  </p>
                </div>
                <input
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={savedName}
                  autoFocus
                  className="input"
                />
                {deleteError && (
                  <div className="banner banner-red text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{deleteError}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(false)}
                    disabled={isPending}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isPending || confirmName !== savedName}
                    className="btn btn-danger btn-sm"
                  >
                    {isPending ? (
                      <>
                        <span className="spinner" />
                        Deleting
                      </>
                    ) : (
                      'Delete organization'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
