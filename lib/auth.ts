import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { sqlite } from './db';

const COOKIE_NAME = 'session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? 'fallback-dev-secret-change-in-production';
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  orgId: string;
  email: string;
  sessionId?: string;
}

export async function signJWT(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyJWT(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sessionId = payload['sessionId'];
    return {
      userId: payload['userId'] as string,
      orgId: payload['orgId'] as string,
      email: payload['email'] as string,
      sessionId: typeof sessionId === 'string' ? sessionId : undefined,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signJWT(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJWT(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

/**
 * Verify that the session row exists in the sessions table and has not been revoked
 * or expired. Returns true when the session is still active.
 *
 * If the JWT was issued before sessionId tracking existed (legacy cookie), this
 * function returns true so existing users aren't logged out.
 */
export function enforceSessionActive(payload: SessionPayload): boolean {
  if (!payload.sessionId) return true;
  const row = sqlite.prepare(`
    SELECT id, revoked_at, expires_at
    FROM sessions
    WHERE id = ? AND user_id = ?
  `).get(payload.sessionId, payload.userId) as
    | { id: string; revoked_at: string | null; expires_at: string }
    | undefined;
  if (!row) return false;
  if (row.revoked_at) return false;
  if (new Date(row.expires_at).getTime() < Date.now()) return false;
  // Touch last_active_at on every check
  sqlite.prepare('UPDATE sessions SET last_active_at = ? WHERE id = ?')
    .run(new Date().toISOString(), payload.sessionId);
  return true;
}

/**
 * Insert a new session row and return its id (16 hex chars).
 * Used by login/signup to record the active session for revocation.
 */
export function createSessionRow(args: {
  userId: string;
  ip: string | null;
  userAgent: string | null;
}): string {
  const id = randomBytes(8).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + MAX_AGE * 1000);
  sqlite.prepare(`
    INSERT INTO sessions (id, user_id, ip, user_agent, last_active_at, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    args.userId,
    args.ip,
    args.userAgent,
    now.toISOString(),
    expires.toISOString(),
    now.toISOString(),
  );
  return id;
}
