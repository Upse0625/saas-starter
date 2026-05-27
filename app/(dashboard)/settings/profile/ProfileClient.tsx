'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  User as UserIcon,
  Mail,
  KeyRound,
  Upload,
  Trash2,
  MailWarning,
} from 'lucide-react';

interface ProfileClientProps {
  name: string;
  email: string;
  avatar: string | null;
  emailVerified: boolean;
}

const MAX_AVATAR_BYTES = 512 * 1024; // 512KB raw file

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function ProfileClient({
  name: initialName,
  email: initialEmail,
  avatar: initialAvatar,
  emailVerified: initialVerified,
}: ProfileClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile (name + avatar)
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSavingProfile, startProfile] = useTransition();

  // Email
  const [email, setEmail] = useState(initialEmail);
  const [emailVerified, setEmailVerified] = useState(initialVerified);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [isSavingEmail, startEmail] = useTransition();

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSavingPassword, startPassword] = useTransition();

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setProfileError(null);
    setProfileSuccess(null);
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
    setProfileSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
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
        setProfileSuccess('Profile updated.');
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        setProfileError(data.error ?? 'Failed to update profile');
      }
    });
  }

  function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);
    const next = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    if (next === initialEmail.toLowerCase()) {
      setEmailError('That is already your email address.');
      return;
    }
    startEmail(async () => {
      const res = await fetch('/api/profile/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: next }),
      });
      if (res.ok) {
        setEmail(next);
        setEmailVerified(false);
        setEmailSuccess('Email updated. Check your inbox to verify your new address.');
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        setEmailError(data.error ?? 'Failed to update email');
      }
    });
  }

  function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    startPassword(async () => {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setCurrentPassword('');
        setNewPassword('');
        setPasswordSuccess('Password updated.');
      } else {
        const data = (await res.json()) as { error?: string };
        setPasswordError(data.error ?? 'Failed to update password');
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile: name + avatar */}
      <div className="card overflow-hidden anim-fade-up delay-1">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" style={{ color: 'var(--muted-strong)' }} strokeWidth={1.85} />
            <h2 className="font-semibold text-[15px]">Profile</h2>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
            Your name and avatar are visible to your team.
          </p>
        </div>

        <form onSubmit={saveProfile} className="p-6 space-y-5">
          {profileSuccess && (
            <div className="banner banner-green text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

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
              Name
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
            <button type="submit" disabled={isSavingProfile} className="btn btn-primary">
              {isSavingProfile ? (
                <>
                  <span className="spinner" />
                  Saving
                </>
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Email */}
      <div className="card overflow-hidden anim-fade-up delay-2">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" style={{ color: 'var(--muted-strong)' }} strokeWidth={1.85} />
            <h2 className="font-semibold text-[15px]">Email address</h2>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
            Changing your email requires re-verification before some features work.
          </p>
        </div>

        <form onSubmit={saveEmail} className="p-6 space-y-5">
          {emailSuccess && (
            <div className="banner banner-green text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{emailSuccess}</span>
            </div>
          )}

          {!emailVerified && (
            <div className="banner banner-amber text-sm">
              <MailWarning className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Verify your new email — we sent a verification link to {email}.</span>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
            />
          </div>

          {emailError && (
            <div className="banner banner-red text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{emailError}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button type="submit" disabled={isSavingEmail} className="btn btn-primary">
              {isSavingEmail ? (
                <>
                  <span className="spinner" />
                  Updating
                </>
              ) : (
                'Update email'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Password */}
      <div className="card overflow-hidden anim-fade-up delay-3">
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" style={{ color: 'var(--muted-strong)' }} strokeWidth={1.85} />
            <h2 className="font-semibold text-[15px]">Password</h2>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
            Use at least 8 characters. We recommend a unique passphrase.
          </p>
        </div>

        <form onSubmit={savePassword} className="p-6 space-y-5">
          {passwordSuccess && (
            <div className="banner banner-green text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <div>
            <label htmlFor="current-password" className="block text-sm font-medium mb-1.5">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="input"
            />
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium mb-1.5">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="input"
            />
          </div>

          {passwordError && (
            <div className="banner banner-red text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button type="submit" disabled={isSavingPassword} className="btn btn-primary">
              {isSavingPassword ? (
                <>
                  <span className="spinner" />
                  Updating
                </>
              ) : (
                'Update password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
