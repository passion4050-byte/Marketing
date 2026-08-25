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
 * AI·검색 크롤러 방문 기록.
 *
 * Round 174k (2026-08-25) — 🔴 내부 self-fetch 를 버리고 Supabase REST 로 직접 쓴다.
 *
 * 왜 바꿨나 — Round 174f 의 `waitUntil` 수정은 **실패했다**:
 *   배포 4시간 뒤에도 콘텐츠 경로 히트 0건. 그런데 봇은 분명히 왔다 —
 *   15:48~15:49 사이 meta-externalagent 가 `/r/p508·p492·p484·p498·p450` 를
 *   80초 안에 찍었다. 이 `p{id}` 숏링크는 **본문 안에만** 존재하므로 그 5개 글을
 *   방금 가져왔다는 뜻이고, 5편 전부 `/with-partners/...` = 아래 matcher 대상이다.
 *   → matcher 문제도, 봇 유입 부족도 아니었다.
 *
 * 배포 여부도 확정됐다: 같은 라운드의 뒤 커밋(727b55b, posts.ts former_slug 매칭)이
 *   라이브에서 동작하므로 그보다 앞선 f92c21e(middleware)는 배포돼 있다.
 *   따라서 남은 원인은 **edge → 자기 자신 `/api/track/crawler` fetch 가 실패**하는 것.
 *   (self-fetch 는 origin 해석·재귀 방지·배포 보호 등으로 조용히 깨지기 쉽고
 *    `.catch()` 가 삼켜서 로그도 안 남는다.)
 *
 * 그래서 서버리스 함수를 한 홉 거치지 않고 Supabase PostgREST 에 직접 POST 한다.
 *   edge 에서 되는 건 fetch 뿐인데 PostgREST 는 순수 HTTP 라 딱 맞는다.
 *
 * ⚠ env 2개가 있어야 이 경로가 켜진다. 없으면 기존 경로로 폴백 — 무회귀.
 *   확인 방법: GET /api/debug-partners → has_SUPABASE_URL / has_SUPABASE_SERVICE_ROLE_KEY
 *   (값은 노출 안 함, 존재 여부만)
 */
function logCrawlerIfDetected(
  req: NextRequest,
  pathname: string,
  event: NextFetchEvent,
): void {
  const ua = req.headers.get("user-agent");
  const bot = detectAiCrawler(ua);
  if (!bot) return;

  const row = {
    bot_name: bot,
    path: pathname.slice(0, 512),
    user_agent: ua ? ua.slice(0, 512) : null,
    // ⚠ 길이 컷을 여기서 직접 한다. 기존엔 /api/track/crawler 가 slice 했는데
    //   이제 그 라우트를 건너뛰므로 컬럼 길이 초과로 INSERT 가 조용히 실패할 수 있다.
    referer: (req.headers.get("referer") || "").slice(0, 512) || null,
    country: (req.headers.get("x-vercel-ip-country") || "").slice(0, 8) || null,
    status_code: 200,
    // hit_at 은 컬럼 기본값 now() 에 맡긴다 (스키마 확인함).
  };

  // ⚠ env 이름이 프로젝트마다 갈린다. 예전에 넣어둔 것이 NEXT_PUBLIC_SUPABASE_URL
  //   일 수 있어 둘 다 본다. 이름 하나 어긋나면 조용히 폴백으로 떨어져 또 0건이
  //   된다 — 그게 Round 174f 의 실패 방식이었다.
  const sbUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  let p: Promise<unknown>;
  if (sbUrl && sbKey) {
    // 1홉. 서버리스 콜드스타트 없음.
    p = fetch(`${sbUrl}/rest/v1/crawler_hits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(3000),
    }).catch(() => { /* 계측 실패가 페이지를 막으면 안 된다 */ });
  } else {
    // 폴백 — env 미설정 환경(로컬·프리뷰)에서 기존 동작 유지.
    p = fetch(`${req.nextUrl.origin}/api/track/crawler`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(4000),
    }).catch(() => { /* swallow */ });
  }
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
