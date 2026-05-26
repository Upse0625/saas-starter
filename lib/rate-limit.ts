import { headers } from 'next/headers';

interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Bucket>();

const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = Date.now();

function sweep() {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, b] of buckets) if (b.resetAt < now) buckets.delete(key);
}

export interface RateLimitConfig {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetIn: number;
}

export function check({ key, limit, windowMs }: RateLimitConfig): RateLimitResult {
  sweep();
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetIn: windowMs };
  }
  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetIn: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, resetIn: bucket.resetAt - now };
}

export async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function rateLimitByIp(scope: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const ip = await getClientIp();
  return check({ key: `${scope}:ip:${ip}`, limit, windowMs });
}

export function rateLimitByKey(scope: string, key: string, limit: number, windowMs: number): RateLimitResult {
  return check({ key: `${scope}:${key}`, limit, windowMs });
}
