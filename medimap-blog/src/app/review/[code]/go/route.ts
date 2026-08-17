import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { detectAiCrawler } from "@/lib/crawler-detect";

// Round 163d — 봇 무기록
const GENERIC_BOT_RE =
  /bot|crawl|spider|preview|scrap|python|curl|wget|httpclient|headless|phantom|lighthouse|monitor|slurp|mj12|facebookexternalhit|kakaotalk-scrap|whatsapp|telegram|slack|discord/i;

/**
 * Round 162 — 리뷰 퍼널 클릭 추적 + 구글 리뷰 작성으로 302.
 * /review/{code}/go?l={lang} → review_funnel_events(event='click') 기록 후
 * tenants.google_review_url (없으면 gmaps_url) 로 리다이렉트.
 */

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params;
  const lang = req.nextUrl.searchParams.get("l") ?? null;
  const sql = getSql();
  let target = "https://wecircle.co.kr";
  if (sql) {
    try {
      const rows = await sql<
        Array<{ id: number; google_review_url: string | null; gmaps_url: string | null }>
      >`
        SELECT id, google_review_url, gmaps_url
        FROM tenants WHERE partner_slug = ${code} LIMIT 1
      `;
      const t = rows[0];
      if (t) {
        target = t.google_review_url ?? t.gmaps_url ?? target;
        const ua = req.headers.get("user-agent");
        const isBot = !ua || detectAiCrawler(ua) !== null || GENERIC_BOT_RE.test(ua);
        try {
          if (!isBot)
            await sql`
              INSERT INTO review_funnel_events (tenant_id, code, event, lang, referer)
              VALUES (${t.id}, ${code}, 'click', ${lang}, ${req.headers.get("referer")})
            `;
        } catch {
          /* 추적 실패는 리다이렉트를 막지 않음 */
        }
      }
    } catch {
      /* DB 실패 시에도 홈으로 폴백 */
    }
  }
  return NextResponse.redirect(target, 302);
}
