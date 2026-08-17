import { NextRequest, NextResponse } from "next/server";
import { getShortlink as getStaticShortlink } from "@/lib/shortlinks";
import { lookupShortlink, recordClick, recordCrawlerHit, hashIp } from "@/lib/db";
import { detectAiCrawler } from "@/lib/crawler-detect";

// Round 163d (2026-08-17) — 상담 클릭 봇 오염 차단.
//   실측: 166클릭 중 136건이 봇(GPTBot 79·ClaudeBot 30·GoogleOther 19 등) — "상담 클릭"
//   지표가 사실상 AI 크롤러 트래픽이었음. AI 크롤러는 crawler_hits 로 분리 기록(자산),
//   일반 봇은 무기록. shortlink_clicks 에는 사람 클릭만 남긴다.
const GENERIC_BOT_RE =
  /bot|crawl|spider|preview|scrap|python|curl|wget|httpclient|headless|phantom|lighthouse|monitor|slurp|mj12|facebookexternalhit|kakaotalk-scrap|whatsapp|telegram|slack|discord/i;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 단축링크 redirect 라우트 — `m.medimap.kr/r/{slug}` 또는 `medimap-blog-phi.vercel.app/r/{slug}`.
 *
 * 데이터 소스 우선순위:
 * 1) Supabase Postgres `shortlinks` 테이블 (DATABASE_URL 설정 시) — 실시간 click 적재
 * 2) `content/shortlinks.json` 정적 매니페스트 (DB 미설정/장애 시 폴백)
 *
 * click 적재는 fire-and-forget — redirect 응답을 차단하지 않는다 (timeout 800ms).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const slug = params.slug;

  // 1차: Postgres
  let target: string | null = null;
  let shortlinkId: number | null = null;
  let tenantId: number | null = null;

  const dbRow = await lookupShortlink(slug);
  if (dbRow) {
    target = dbRow.target_url;
    shortlinkId = dbRow.id;
    tenantId = dbRow.tenant_id;
  } else {
    // 2차: 정적 매니페스트
    const staticRow = await getStaticShortlink(slug);
    if (staticRow) {
      target = staticRow.target_url;
    }
  }

  if (!target) {
    return NextResponse.redirect(new URL("/blog", req.url), 302);
  }

  // click 로깅 (fire-and-forget — DB 적재 + 외부 webhook 둘 다)
  // Round 163d — 봇 분류: AI 크롤러는 crawler_hits, 일반 봇은 무기록, 사람만 shortlink_clicks.
  const ua = req.headers.get("user-agent");
  const aiBot = detectAiCrawler(ua);
  const isBot = aiBot !== null || (ua ? GENERIC_BOT_RE.test(ua) : true);
  if (aiBot) {
    void recordCrawlerHit({
      bot_name: aiBot,
      user_agent: ua,
      path: `/r/${slug}`,
      referer: req.headers.get("referer"),
      country: req.headers.get("x-vercel-ip-country"),
      status_code: 302,
    }).catch(() => {});
  }
  if (!isBot && shortlinkId !== null && tenantId !== null) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const click = (async () => {
      const ip_hash = await hashIp(ip);
      await recordClick({
        shortlink_id: shortlinkId!,
        tenant_id: tenantId!,
        user_agent: req.headers.get("user-agent"),
        referer: req.headers.get("referer"),
        country: req.headers.get("x-vercel-ip-country"),
        ip_hash,
      });
    })();
    // race against 800ms timeout
    Promise.race([
      click,
      new Promise<void>((res) => setTimeout(res, 800)),
    ]).catch(() => {
      /* swallow */
    });
  }

  // 외부 webhook (선택)
  const webhook = process.env.SHORTLINK_CLICK_WEBHOOK;
  if (webhook) {
    fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": process.env.SHORTLINK_WEBHOOK_SECRET || "",
      },
      body: JSON.stringify({
        slug,
        clicked_at: new Date().toISOString(),
        user_agent: req.headers.get("user-agent"),
        referer: req.headers.get("referer"),
        country: req.headers.get("x-vercel-ip-country") || undefined,
      }),
      signal: AbortSignal.timeout(800),
    }).catch(() => {
      /* swallow */
    });
  }

  return NextResponse.redirect(target, 302);
}

export const HEAD = GET;
