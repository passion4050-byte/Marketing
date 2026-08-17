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

  // Round 14/16 (2026-05-27): with-partners + blog 경로 — force-dynamic 만으론
  // Vercel CDN edge cache 가 옛 응답 hold. middleware 에서 Cache-Control: no-store
  // 강제. Next.js 응답 헤더가 Vercel CDN 의 cache 정책을 override.
  if (
    pathname.startsWith("/with-partners") ||
    pathname.startsWith("/blog")
  ) {
    logCrawlerIfDetected(req, pathname);
    const res = NextResponse.next();
    res.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
    res.headers.set("CDN-Cache-Control", "no-store");
    res.headers.set("Vercel-CDN-Cache-Control", "no-store");
    return res;
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
