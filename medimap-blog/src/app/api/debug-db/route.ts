 import { getSql } from "@/lib/db";
  import { NextResponse } from "next/server";

  export const dynamic = "force-dynamic";
  export const runtime = "nodejs";

  export async function GET() {
    const dbUrl = process.env.DATABASE_URL;
    const sql = getSql();
    const out: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      env: {
        hasDatabaseUrl: !!dbUrl,
        urlLength: dbUrl?.length ?? 0,
        urlPrefix: dbUrl ? dbUrl.slice(0, 30) + "..." : null,
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
