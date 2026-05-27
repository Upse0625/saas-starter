import { NextRequest, NextResponse } from 'next/server';
import { sqlite } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface PatchBody {
  name?: string;
  avatar?: string | null;
}

// ~700KB cap on the base64 payload itself (data URL string length).
const MAX_AVATAR_CHARS = 700 * 1024;

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as PatchBody;

    const sets: string[] = [];
    const values: (string | null)[] = [];

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (name.length < 2) {
        return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
      }
      sets.push('name = ?');
      values.push(name);
    }

    if (body.avatar !== undefined) {
      if (body.avatar === null) {
        sets.push('avatar = ?');
        values.push(null);
      } else {
        if (!body.avatar.startsWith('data:image/')) {
          return NextResponse.json({ error: 'Avatar must be an image data URL' }, { status: 400 });
        }
        if (body.avatar.length > MAX_AVATAR_CHARS) {
          return NextResponse.json({ error: 'Avatar image is too large' }, { status: 400 });
        }
        sets.push('avatar = ?');
        values.push(body.avatar);
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    values.push(session.userId);
    sqlite.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[profile.patch]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
