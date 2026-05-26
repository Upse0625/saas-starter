import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth';

const PROTECTED_PREFIXES = ['/dashboard', '/settings'];
const API_PROTECTED_PREFIXES = [
  '/api/org',
  '/api/stripe/checkout',
  '/api/stripe/portal',
  '/api/keys',
  '/api/audit',
  '/api/auth/sessions',
  '/api/auth/resend-verification',
  '/api/auth/2fa/setup',
  '/api/auth/2fa/enable',
  '/api/auth/2fa/disable',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route needs protection
  const isProtectedPage = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isProtectedApi = API_PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session')?.value;

  if (!token) {
    if (isProtectedApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyJWT(token);

  if (!payload) {
    if (isProtectedApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('session');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/settings/:path*',
    '/api/org/:path*',
    '/api/stripe/checkout',
    '/api/stripe/portal',
    '/api/keys/:path*',
    '/api/audit',
    '/api/auth/sessions',
    '/api/auth/resend-verification',
    '/api/auth/2fa/setup',
    '/api/auth/2fa/enable',
    '/api/auth/2fa/disable',
  ],
};
