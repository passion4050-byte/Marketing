/**
 * /api/debug-partners — Round 12 진단용 디버그 endpoint.
 *
 * partners.ts 의 getAllPartnerPosts() 를 직접 호출하여 결과를 JSON 으로 노출.
 * 페이지 렌더링과 무관하게 partners.ts 결과를 검증.
 *
 * 사용: GET https://medimap-blog-phi.vercel.app/api/debug-partners
 * 응답:
 *   ok=true:  posts 배열 + 길이 + 첫 글 요약
 *   ok=false: 에러 메시지 + stack trace
 *
 * 진단 끝나면 이 파일 삭제 가능.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getAllPartnerPosts } from "@/lib/partners";
import { getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Round 190 (2026-09-02) — 선택적 잠금. `DEBUG_ENDPOINT_SECRET` 를 설정하면
  //   그때부터 매칭을 요구한다(미설정이면 기존처럼 공개).
  //   ⚠ 이 엔드포인트를 지우지 말 것 — Round 184b 에서 같은 런타임의 DB 속도를
  //     193ms 로 실측해 "DB 는 무죄"를 한 번에 증명한 도구다. 진단력은 남기되
  //     운영자가 원할 때 잠글 수 있게 한다.
  const gate = process.env.DEBUG_ENDPOINT_SECRET;
  if (gate) {
    const given =
      new URL(req.url).searchParams.get("secret") ??
      req.headers.get("x-debug-secret");
    if (given !== gate) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
  }
  const t0 = Date.now();
  const env = {
    has_DATABASE_URL: !!process.env.DATABASE_URL,
    has_NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    // Round 174k — 크롤러 계측이 edge 에서 Supabase REST 로 직접 쓰는 데 필요한 env.
    //   값은 노출하지 않고 존재 여부만.
    has_SUPABASE_URL: !!process.env.SUPABASE_URL,
    has_SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    has_SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    VERCEL_REGION: process.env.VERCEL_REGION ?? null,
  };

  // 1) getSql() 자체 확인
  const sql = getSql();
  const sqlStatus = sql ? "OK" : "NULL";

  // 2) raw SQL 결과 직접 확인 (partners.ts 와 동일한 query)
  let rawRowCount = -1;
  let rawSample: unknown = null;
  let rawError: string | null = null;
  if (sql) {
    try {
      const rows = await sql.unsafe<Array<Record<string, unknown>>>(`
        SELECT gc.id, gc.tenant_id, t.name AS tenant_name,
               t.partner_slug, gc.partner_category,
               gc.slug, gc.title, gc.is_partner_content,
               gc.status, gc.compliance_status
        FROM generated_contents gc
        LEFT JOIN tenants t ON t.id = gc.tenant_id
        WHERE gc.is_partner_content = true
          AND gc.status = 'published'
          AND gc.compliance_status = 'pass'
          AND gc.slug IS NOT NULL
          AND length(trim(gc.slug)) > 0
          AND t.partner_slug IS NOT NULL
          AND gc.partner_category IS NOT NULL
        ORDER BY COALESCE(gc.published_at, gc.created_at) DESC
        LIMIT 500
      `);
      rawRowCount = rows.length;
      rawSample = rows.slice(0, 3); // 첫 3개만
    } catch (err) {
      rawError = err instanceof Error ? err.message : String(err);
    }
  }

  // 3) getAllPartnerPosts() 호출 (모듈 캐시 통과)
  let mappedCount = -1;
  let mappedSample: unknown = null;
  let mappedError: string | null = null;
  try {
    const posts = await getAllPartnerPosts();
    mappedCount = posts.length;
    mappedSample = posts.slice(0, 3).map((p) => ({
      id: p.id,
      partner_slug: p.partner_slug,
      partner_category: p.partner_category,
      tenant_name: p.tenant_name,
      slug: p.slug,
      title: p.title,
    }));
  } catch (err) {
    mappedError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(
    {
      ok: true,
      timing_ms: Date.now() - t0,
      env,
      sqlStatus,
      raw_query: {
        rowCount: rawRowCount,
        sample: rawSample,
        error: rawError,
      },
      partners_ts: {
        mappedCount,
        sample: mappedSample,
        error: mappedError,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
