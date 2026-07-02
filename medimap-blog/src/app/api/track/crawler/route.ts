/**
 * Round 110-B (2026-07-02) — AI 크롤러 방문 로그 endpoint.
 *
 * middleware 에서 GPTBot/ClaudeBot/PerplexityBot 등 감지 시 fire-and-forget 로 호출.
 * middleware 는 edge runtime 이라 postgres 직접 못 씀 → 이 endpoint (nodejs) 로 delegate.
 *
 * POST /api/track/crawler
 *   body: { bot_name, path, user_agent?, referer?, country? }
 */
import { NextRequest, NextResponse } from "next/server";
import { recordCrawlerHit } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ok = await recordCrawlerHit({
      bot_name: String(body.bot_name || "unknown").slice(0, 64),
      path: String(body.path || "/").slice(0, 512),
      user_agent: body.user_agent ? String(body.user_agent).slice(0, 512) : null,
      referer: body.referer ? String(body.referer).slice(0, 512) : null,
      country: body.country ? String(body.country).slice(0, 8) : null,
      status_code: body.status_code ?? 200,
    });
    return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }
}
