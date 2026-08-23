import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  isAdminConfigured,
  verifySessionCookie,
} from "@/lib/admin-auth";
import { detectAiCrawler } from "@/lib/crawler-detect";

export const config = {
  // Round 164 — 해외 경로·리뷰 퍼널도 AI 크롤러 감지 대상에 추가 (크롤 지표 수집).
  matcher: [
    "/admin/:path*",
    "/with-partners/:path*",
    "/blog/:path*",
    // Round 173 - /all HTML sitemap hub. Its whole job is to be crawled, so its
    //   crawl rate is the fastest readout on whether budget actually freed up.
    //   ⚠ Adding a path here REQUIRES a matching early-return below, otherwise it
    //   falls through to the admin-auth branch and redirects to /admin/login.
    "/all",
    "/en/:path*",
    "/ja/:path*",
    "/zh/:path*",
    "/tw/:path*",
    "/guides/:path*",
    "/review/:path*",
  ],
};

/**
 * Round 110-B (2026-07-02) — AI 크롤러 감지 시 fire-and-forget 로 /api/track/crawler 호출.
 * middleware 는 edge runtime → postgres 직접 못 씀 → nodejs endpoint 로 delegate.
 */
function logCrawlerIfDetected(req: NextRequest, pathname: string): void {
  const ua = req.headers.get("user-agent");
  const bot = detectAiCrawler(ua);
  if (!bot) return;
  const origin = req.nextUrl.origin;
  // fire-and-forget — 응답 지연 방지 (300ms timeout)
  fetch(`${origin}/api/track/crawler`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bot_name: bot,
      path: pathname,
      user_agent: ua,
      referer: req.headers.get("referer"),
      country: req.headers.get("x-vercel-ip-country"),
    }),
    signal: AbortSignal.timeout(300),
  }).catch(() => { /* swallow */ });
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Round 165 (2026-08-18) — 국내(/blog·/with-partners) no-store 강제 제거.
  //   Round 14/16 의 no-store 는 당시 페이지가 force-dynamic 이던 시절의 응급조치.
  //   Round 129 에서 두 경로 모두 ISR(revalidate 60s)로 전환됐는데 이 헤더가 남아
  //   Vercel CDN 캐시를 전면 무력화 — 모든 뷰가 서버 함수까지 왕복(콜드스타트 포함).
  //   해외(en/ja/zh/tw) 경로는 처음부터 ISR 헤더 그대로라 빨랐음. 국내도 동일하게:
  //   크롤러 로깅만 하고 Next 의 ISR 캐시 헤더(s-maxage=60, SWR)를 그대로 통과시킨다.
  //   신규 발행 노출 지연은 최대 60초 — 즉시 반영이 필요하면 /api/revalidate 사용.
  if (
    pathname.startsWith("/with-partners") ||
    pathname.startsWith("/blog") ||
    pathname === "/all"
  ) {
    logCrawlerIfDetected(req, pathname);
    return NextResponse.next();
  }

  // Round 164 — 해외(en/ja/zh/tw)·리뷰 경로: AI 크롤러 로깅만 하고 통과.
  //   ⚠ 캐시 헤더는 건드리지 않음 (해외 페이지 ISR 유지). 어드민 인증 분기로 떨어지지 않게 조기 return.
  if (
    pathname.startsWith("/en") ||
    pathname.startsWith("/ja") ||
    pathname.startsWith("/zh") ||
    pathname.startsWith("/tw") ||
    pathname.startsWith("/guides") ||
    pathname.startsWith("/review")
  ) {
    logCrawlerIfDetected(req, pathname);
    return NextResponse.next();
  }

  // /admin/login: 미인증이면 로그인 폼, 이미 인증된 상태면 dashboard 로.
  if (pathname.startsWith("/admin/login")) {
    if (isAdminConfigured()) {
      const session = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
      const alreadyAuthed = await verifySessionCookie(session);
      if (alreadyAuthed) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    }
    return NextResponse.next();
  }

  // ADMIN_PASSWORD 미설정이면 안내 페이지로 강제 (잠금된 어드민 보호).
  if (!isAdminConfigured()) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("setup", "1");
    return NextResponse.redirect(url);
  }

  const session = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const ok = await verifySessionCookie(session);
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    if (pathname !== "/admin") {
      url.searchParams.set("from", pathname + search);
    }
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
