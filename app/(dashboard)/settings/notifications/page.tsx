import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { sqlite } from '@/lib/db';
import NotificationsClient from './NotificationsClient';

interface PrefsRow {
  user_id: string;
  product_updates: number;
  security_alerts: number;
  team_activity: number;
  billing: number;
  updated_at: string;
}

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let prefs = sqlite
    .prepare(
      `SELECT user_id, product_updates, security_alerts, team_activity, billing, updated_at
       FROM notification_preferences WHERE user_id = ?`,
    )
    .get(session.userId) as PrefsRow | undefined;

  if (!prefs) {
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO notification_preferences
           (user_id, product_updates, security_alerts, team_activity, billing, updated_at)
         VALUES (?, 1, 1, 1, 1, ?)`,
      )
      .run(session.userId, now);
    prefs = {
      user_id: session.userId,
      product_updates: 1,
      security_alerts: 1,
      team_activity: 1,
      billing: 1,
      updated_at: now,
    };
  }

  return (
    <div>
      <div className="mb-8 anim-fade-up delay-0">
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
          Settings · Notifications
        </p>
        <h1 className="text-2xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
          Notifications
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-strong)' }}>
          Choose which emails you want to receive from us.
        </p>
      </div>

      <NotificationsClient
        prefs={{
          product_updates: prefs.product_updates === 1,
          security_alerts: prefs.security_alerts === 1,
          team_activity: prefs.team_activity === 1,
          billing: prefs.billing === 1,
        }}
      />
    </div>
  );
}
