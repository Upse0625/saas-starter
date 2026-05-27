import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { sqlite } from '@/lib/db';
import ProfileClient from './ProfileClient';

interface UserRow {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  email_verified_at: string | null;
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const user = sqlite
    .prepare('SELECT id, email, name, avatar, email_verified_at FROM users WHERE id = ?')
    .get(session.userId) as UserRow | undefined;

  if (!user) redirect('/login');

  return (
    <div>
      <div className="mb-8 anim-fade-up delay-0">
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
          Settings · Profile
        </p>
        <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
          Profile
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
          Manage your personal information, email address, and password.
        </p>
      </div>

      <ProfileClient
        name={user.name}
        email={user.email}
        avatar={user.avatar}
        emailVerified={user.email_verified_at !== null}
      />
    </div>
  );
}
