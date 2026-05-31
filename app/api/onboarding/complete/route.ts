import { NextResponse } from 'next/server';
import { sqlite } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    sqlite
      .prepare('UPDATE users SET onboarded_at = ? WHERE id = ?')
      .run(new Date().toISOString(), session.userId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[onboarding.complete]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
