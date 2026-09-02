/**
 * /api/debug-db — DB 연결 진단.
 *
 * 🔴 Round 190 (2026-09-02) — 인증 없는 엔드포인트가 DATABASE_URL 내용을
 *   그대로 echo 하고 있었다. 라이브 실측:
 *     urlPrefix: "postgresql://postgres.gifopyow..."   (앞 30자)
 *     urlLength: 109                                    (문자열 정확한 길이)
 *   비밀번호는 30자 컷 앞에서 잘려 직접 노출되진 않았지만,
 *   **길이가 알려지면 비밀번호 길이가 역산된다.** 더 큰 문제는 구조다 —
 *   누가 나중에 slice(0, 50) 으로만 늘려도 비밀번호가 그대로 나간다.
 *   → 시크릿 소재(값·길이·접두사)는 **절대 응답에 넣지 않는다.** 존재 여부(boolean)만.
 *
 *   ⚠ 이 엔드포인트를 지우지는 않는다 — Round 184b 에서 `/api/debug-partners` 가
 *     "DB 는 무죄"를 193ms 만에 증명해 오진 규명 시간을 크게 줄였다.
 *     진단 도구는 남기되, 시크릿을 흘리지 않게 만든다.
 *
 *   선택적 잠금: `DEBUG_ENDPOINT_SECRET` 를 설정하면 그때부터 매칭을 요구한다
 *   (미설정이면 기존처럼 공개 — 지금 당장 진단 도구가 깨지지 않게).
 */
 import { getSql } from "@/lib/db";
  import { NextResponse, type NextRequest } from "next/server";

  export const dynamic = "force-dynamic";
  export const runtime = "nodejs";

  export async function GET(req: NextRequest) {
    const gate = process.env.DEBUG_ENDPOINT_SECRET;
    if (gate) {
      const given =
        new URL(req.url).searchParams.get("secret") ??
        req.headers.get("x-debug-secret");
      if (given !== gate) {
        // 존재 자체를 확인시켜 주지 않으려 404 로 응답한다.
        return NextResponse.json({ error: "not found" }, { status: 404 });
      }
    }
    const dbUrl = process.env.DATABASE_URL;
    const sql = getSql();
    const out: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      env: {
        hasDatabaseUrl: !!dbUrl,
        // Round 190 — urlLength·urlPrefix 제거. 시크릿 소재는 응답에 넣지 않는다.
        //   (길이만으로도 비밀번호 길이가 역산된다.)
        hasHost: dbUrl ? dbUrl.includes("supabase.co") || dbUrl.includes("supabase.com") : false,
        vercelEnv: process.env.VERCEL_ENV ?? null,
        vercelRegion: process.env.VERCEL_REGION ?? null,
        nextPhase: process.env.NEXT_PHASE ?? null,
      },
      sql: {
        initialized: !!sql,
      },
    };

    if (sql) {
      try {
        const rows = await sql`SELECT 1 AS ok, count(*) AS total FROM generated_contents`;
        out.query = { ok: true, result: rows[0] };
      } catch (e) {
        out.query = {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
          name: e instanceof Error ? e.name : null,
        };
      }

      try {
        const rows = await sql`
          SELECT id, channel, status, compliance_status
          FROM generated_contents
          WHERE status = 'published' AND channel = 'blog_html' AND compliance_status = 'pass'
          LIMIT 5
        `;
        out.publishedBlogHtml = { ok: true, rows };
      } catch (e) {
        out.publishedBlogHtml = { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }

    return NextResponse.json(out, {
      headers: { "Cache-Control": "no-store" },
    });
  }
