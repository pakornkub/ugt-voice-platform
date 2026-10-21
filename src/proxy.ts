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

// No-login portal (owner 2026-10-21): anyone may file a ticket and track it with its code + secret.
// The pages and their Server Actions guard themselves (rate limit, secret check).
const PUBLIC_PATHS = ['/report', '/track'];
// Set by lib/public-access.ts once a ticket was opened with its secret — lets the portal reach the
// file routes, which check it against the ticket themselves.
const PUBLIC_TICKET_COOKIE = 'vc_track';

const matchesPath = (pathname: string, paths: string[]) =>
  paths.some((p) => pathname === p || pathname.startsWith(p + '/'));

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
  const isAuthOnlyPath = matchesPath(pathname, AUTH_ONLY_PATHS);
  const isPublic =
    matchesPath(pathname, PUBLIC_PATHS) ||
    (pathname.startsWith('/api/files') && request.cookies.has(PUBLIC_TICKET_COOKIE));

  // A cookie on /login is NOT bounced to the app here: presence ≠ a live session, and a stale
  // cookie would loop (/ → layout → /login → here → /). The login page checks the real session.

  // Unauthenticated user visiting a protected page → redirect to /login.
  // API routes get 401 JSON instead of a redirect.
  if (!isAuthOnlyPath && !isPublic && !sessionCookie) {
    if (pathname.startsWith('/api/')) {
      return applySecurityHeaders(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        request,
        nonce
      );
    }
    const url = request.nextUrl.clone();
    // The app root without a session is the employees' door: the no-login form.
    if (pathname === '/') {
      url.pathname = '/report';
      return applySecurityHeaders(NextResponse.redirect(url), request, nonce);
    }
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
    // The bare app root (basePath with no trailing path) is not matched by the pattern below —
    // without this entry it skipped the proxy and the no-login redirect to /report.
    '/',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|eot|otf)).*)',
  ],
};
