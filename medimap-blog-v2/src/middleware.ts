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
  // Round 81 보안 — 헤더 전용. 쿼리파라미터(?cronSecret=)는 referer/프록시/브라우저 히스토리/
  //   Vercel 액세스 로그로 시크릿이 유출되므로 제거. 모든 cron/자가호출은 x-cron-secret 헤더 사용.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && isApi) {
    const headerSecret = req.headers.get('x-cron-secret');
    if (headerSecret === cronSecret) {
      return NextResponse.next();
    }
  }

  // ADMIN_PASSWORD 미설정 → fail CLOSED (Round 81 보안 수정).
  //   이전엔 fail-open(통과)이라 env 누락/오타 한 번이면 admin 전체(읽기·쓰기·삭제)가
  //   public 으로 노출되는 P0 구멍이었음. 공개 블로그 미들웨어는 이미 fail-closed.
  //   login 페이지는 위 PUBLIC_PAGE_PATHS 에서 통과되므로 리다이렉트 루프 없음.
  if (!process.env.ADMIN_PASSWORD) {
    if (isApi) {
      return new NextResponse(
        JSON.stringify({ ok: false, error: 'admin not configured (ADMIN_PASSWORD unset)' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const loginUrl = new URL('/admin/login', req.url);
    loginUrl.searchParams.set('setup', '1');
    return NextResponse.redirect(loginUrl);
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
