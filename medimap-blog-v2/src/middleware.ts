/**
 * Next.js middleware — 인증/보안 가드
 *
 * 1. /api/admin/* (단 login/logout/cron 제외) → ADMIN cookie 검증
 * 2. /admin/* (login 제외) → cookie 없으면 /admin/login 리다이렉트
 *    (이미 (portal)/layout.tsx 에서 처리하지만 edge 에서 빠르게 차단)
 *
 * Round 50 (2026-05-31) — Cron 우회:
 *   - X-Cron-Secret 헤더 또는 ?cronSecret query 가 process.env.CRON_SECRET 일치 시 통과
 *   - GitHub Actions cron 이 admin endpoint 호출 가능
 */
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/api/admin/:path*', '/admin/:path*']
};

const ADMIN_COOKIE_NAME = 'medimap-admin-session';

const PUBLIC_API_PATHS = ['/api/admin/login', '/api/admin/logout'];
const PUBLIC_PAGE_PATHS = ['/admin/login'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isApi = pathname.startsWith('/api/admin');

  // 공개 라우트는 통과
  if (PUBLIC_PAGE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }
  if (PUBLIC_API_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  // Round 50 — Cron secret 우회 (GitHub Actions 가 admin endpoint 호출)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && isApi) {
    const headerSecret = req.headers.get('x-cron-secret');
    const querySecret = req.nextUrl.searchParams.get('cronSecret');
    if (headerSecret === cronSecret || querySecret === cronSecret) {
      return NextResponse.next();
    }
  }

  // ADMIN_PASSWORD 미설정 (dev mode) → 통과
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.next();
  }

  // cookie 없으면 차단
  if (!cookie) {
    if (isApi) {
      return new NextResponse(
        JSON.stringify({ ok: false, error: 'unauthorized — admin login required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const loginUrl = new URL('/admin/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // cookie 가 있으면 통과 (검증은 server-side route 에서 강화)
  // Round 59 fix 2 (2026-06-01) — /api/admin/* 응답 cache 차단 (Vercel edge / CDN 무력화)
  const res = NextResponse.next();
  if (isApi) {
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.headers.set('CDN-Cache-Control', 'no-store');
    res.headers.set('Vercel-CDN-Cache-Control', 'no-store');
  }
  return res;
}
