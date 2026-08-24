import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
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
 * Round 110-B (2026-07-02) — AI 크롤러 감지 시 /api/track/crawler 로 delegate.
 *   middleware 는 edge runtime → postgres 직접 못 씀 → nodejs endpoint 경유.
 *
 * Round 174 (2026-08-24) — 🔴 이 함수는 두 달간 단 한 건도 기록하지 못했다.
 *   실측: crawler_hits 1,281건이 전부 `/r/*` (별도 nodejs 라우트가 직접 INSERT).
 *   콘텐츠 경로(/blog·/with-partners·/all·해외) 히트는 **0건**. 원인 두 가지:
 *     1) AbortSignal.timeout(300) — 대상이 nodejs serverless 함수라 콜드스타트
 *        (부팅 + TLS + postgres connect, connect_timeout 만 5s)만으로 300ms 를
 *        넘긴다. 사실상 항상 abort.
 *     2) waitUntil 없음 — NextResponse.next() 를 반환하는 순간 edge isolate 가
 *        정리되면서 in-flight fetch 가 같이 죽는다. 300ms 를 늘려도 이것만으로는
 *        안 고쳐진다. 둘을 같이 고쳐야 한다.
 *   ⚠ 따라서 "googlebot 0건"은 구글이 안 왔다는 뜻이 아니라 **계측이 없었다**는
 *     뜻이다. Round 173 에서 crawler-detect.ts 에 Googlebot 을 추가한 것만으로는
 *     아무것도 관측되지 않았다. 이 수정 이후에 쌓이는 0 만 신호로 취급할 것.
 */
function logCrawlerIfDetected(
  req: NextRequest,
  pathname: string,
  event: NextFetchEvent,
): void {
  const ua = req.headers.get("user-agent");
  const bot = detectAiCrawler(ua);
  if (!bot) return;
  const origin = req.nextUrl.origin;
  const p = fetch(`${origin}/api/track/crawler`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bot_name: bot,
      path: pathname,
      user_agent: ua,
      referer: req.headers.get("referer"),
      country: req.headers.get("x-vercel-ip-country"),
    }),
    // 콜드스타트 + pg connect 여유. 응답을 기다리지 않으므로(waitUntil) 사용자
    //   지연에는 영향이 없다. 상한만 둬서 edge 실행이 매달리지 않게 한다.
    signal: AbortSignal.timeout(4000),
  }).catch(() => { /* swallow — 계측 실패가 페이지를 막으면 안 된다 */ });
  // 응답 반환 후에도 이 promise 가 살아있도록 런타임에 알린다.
  event.waitUntil(p);
}

export async function middleware(req: NextRequest, event: NextFetchEvent) {
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
    logCrawlerIfDetected(req, pathname, event);
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
    logCrawlerIfDetected(req, pathname, event);
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
