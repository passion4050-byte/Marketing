/**
 * Next.js middleware — 인증/보안 가드
 *
 * 1. /api/admin/* (단 login/logout 제외) → ADMIN cookie 검증
 * 2. /admin/* (login 제외) → cookie 없으면 /admin/login 리다이렉트
 *    (이미 (portal)/layout.tsx 에서 처리하지만 edge 에서 빠르게 차단)
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
  return NextResponse.next();
}
