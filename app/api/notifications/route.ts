import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface PrefsRow {
  product_updates: number;
  security_alerts: number;
  team_activity: number;
  billing: number;
}

interface PatchBody {
  product_updates?: boolean;
  security_alerts?: boolean;
  team_activity?: boolean;
  billing?: boolean;
}

const KEYS = ['product_updates', 'security_alerts', 'team_activity', 'billing'] as const;
type PrefKey = (typeof KEYS)[number];

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const row = sqlite
      .prepare(
        `SELECT product_updates, security_alerts, team_activity, billing
         FROM notification_preferences WHERE user_id = ?`,
      )
      .get(session.userId) as PrefsRow | undefined;

    const prefs = row ?? {
      product_updates: 1,
      security_alerts: 1,
      team_activity: 1,
      billing: 1,
    };

    return NextResponse.json({
      product_updates: prefs.product_updates === 1,
      security_alerts: prefs.security_alerts === 1,
      team_activity: prefs.team_activity === 1,
      billing: prefs.billing === 1,
    });
  } catch (err) {
    console.error('[notifications.get]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as PatchBody;

    // Read current values (or defaults) so a partial update preserves the rest.
    const existing = sqlite
      .prepare(
        `SELECT product_updates, security_alerts, team_activity, billing
         FROM notification_preferences WHERE user_id = ?`,
      )
      .get(session.userId) as PrefsRow | undefined;

    const current: Record<PrefKey, number> = existing ?? {
      product_updates: 1,
      security_alerts: 1,
      team_activity: 1,
      billing: 1,
    };

    for (const key of KEYS) {
      const value = body[key];
      if (value !== undefined) {
        if (typeof value !== 'boolean') {
          return NextResponse.json({ error: `Invalid value for ${key}` }, { status: 400 });
        }
        current[key] = value ? 1 : 0;
      }
    }

    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO notification_preferences
           (user_id, product_updates, security_alerts, team_activity, billing, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           product_updates = excluded.product_updates,
           security_alerts = excluded.security_alerts,
           team_activity = excluded.team_activity,
           billing = excluded.billing,
           updated_at = excluded.updated_at`,
      )
      .run(
        session.userId,
        current.product_updates,
        current.security_alerts,
        current.team_activity,
        current.billing,
        now,
      );

    return NextResponse.json({
      product_updates: current.product_updates === 1,
      security_alerts: current.security_alerts === 1,
      team_activity: current.team_activity === 1,
      billing: current.billing === 1,
    });
  } catch (err) {
    console.error('[notifications.patch]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
