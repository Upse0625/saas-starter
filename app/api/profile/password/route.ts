import { NextRequest, NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { sqlite } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { audit } from '@/lib/audit';

interface PasswordBody {
  currentPassword: string;
  newPassword: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as PasswordBody;
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both passwords are required' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters' },
        { status: 400 },
      );
    }

    const row = sqlite
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .get(session.userId) as { password_hash: string } | undefined;

    if (!row) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const ok = await compare(currentPassword, row.password_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    const newHash = await hash(newPassword, 12);
    sqlite.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, session.userId);

    try {
      await audit({
        action: 'user.password_reset',
        orgId: session.orgId,
        actorUserId: session.userId,
      });
    } catch (err) {
      console.error('[profile.password] audit failed', err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[profile.password]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
