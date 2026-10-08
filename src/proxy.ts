// src/proxy.ts — Next.js 16 route protection (ugt-nextjs-auth-setup,
// 2026-09-02; renamed from src/middleware.ts on the Next 16 upgrade,
// 2026-10-08). Proxy runs on the nodejs runtime only.
//
// Cookie-presence check only (no DB call) + the standard security headers on
// every response. Why presence-only, never auth.api.getSession(): this
// function runs on EVERY request that isn't a static asset — a DB round-trip
// here adds that latency to every navigation and turns a DB hiccup into a
// whole-app outage. The real session check belongs in the layout that already
// talks to the DB once (src/app/(shell)/layout.tsx, src/app/admin/setup/layout.tsx).
import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// Paths only unauthenticated users should access. Authenticated users
// visiting these are sent to the app. No '/reset-password' — this project
// has no local email/password login (SSO only).
const AUTH_ONLY_PATHS = ['/login'];

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? ' ws://localhost:* http://localhost:*' : ''}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  nonce: string
): NextResponse {
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );

  // Behind a TLS-terminating reverse proxy the request arrives as http, so
  // the forwarded header is the only truthful source.
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ||
    request.nextUrl.protocol.replace(':', '');
  if (proto === 'https') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000');
  }

  return response;
}

export function proxy(request: NextRequest) {
  // Standalone deploy, no basePath, as of this chunk (docs/admin-handoff.md
  // §2) — kept for parity with the org pattern in case a shared-domain
  // basePath is adopted later.
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const rawPathname = request.nextUrl.pathname;
  const pathname =
    basePath && rawPathname.startsWith(basePath)
      ? rawPathname.slice(basePath.length) || '/'
      : rawPathname;

  const nonce = generateNonce();

  // Always pass through Next.js internals, static assets, and the public
  // auth API + health check.
  if (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/health') ||
    /\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|eot|otf|css|js|map)$/i.test(pathname)
  ) {
    return applySecurityHeaders(NextResponse.next(), request, nonce);
  }

  const sessionCookiePrefix =
    (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/^\//, '') || 'better-auth';
  const sessionCookie = getSessionCookie(request, { cookiePrefix: sessionCookiePrefix });
  const isAuthOnlyPath = AUTH_ONLY_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  // Authenticated user visiting /login → redirect to the app.
  if (isAuthOnlyPath && sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return applySecurityHeaders(NextResponse.redirect(url), request, nonce);
  }

  // Unauthenticated user visiting a protected page → redirect to /login.
  // API routes get 401 JSON instead of a redirect.
  if (!isAuthOnlyPath && !sessionCookie) {
    if (pathname.startsWith('/api/')) {
      return applySecurityHeaders(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        request,
        nonce
      );
    }
    const url = request.nextUrl.clone();
    // ?from= = หน้าที่ผู้ใช้ตั้งใจไป (basePath-relative) — login flow ใช้พา
    // กลับหลัง login สำเร็จ
    const from = pathname === '/' && !url.search ? '' : pathname + url.search;
    url.pathname = '/login';
    url.search = '';
    if (from) url.searchParams.set('from', from);
    return applySecurityHeaders(NextResponse.redirect(url), request, nonce);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-from', pathname + request.nextUrl.search);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return applySecurityHeaders(response, request, nonce);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|eot|otf)).*)',
  ],
};
