/**
 * Round 110-C (2026-07-02) — 카카오톡 CTA 클릭 beacon endpoint.
 *
 * 클라이언트 (KakaoCta / CTABlock / floating) 에서 클릭 시:
 *   navigator.sendBeacon('/api/track/kakao', JSON.stringify({...}))
 * 또는 fetch(url, { keepalive: true })
 *
 * POST /api/track/kakao
 *   body: { event, page_path?, cta_label?, utm_medium?, utm_campaign?, tenant_id? }
 */
import { NextRequest, NextResponse } from "next/server";
import { recordKakaoReferral, hashIp } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_EVENTS = new Set([
  "kakao_cta_click",
  "kakao_channel_click",
  "kakao_beacon",
  "kakao_floating_click",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const evt = String(body.event || "kakao_beacon");
    if (!VALID_EVENTS.has(evt)) {
      return NextResponse.json({ ok: false, error: "invalid event" }, { status: 400 });
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ip_hash = await hashIp(ip);
    const ok = await recordKakaoReferral({
      event: evt as "kakao_cta_click",
      page_path: body.page_path ? String(body.page_path).slice(0, 512) : null,
      cta_label: body.cta_label ? String(body.cta_label).slice(0, 128) : null,
      utm_medium: body.utm_medium ? String(body.utm_medium).slice(0, 64) : null,
      utm_campaign: body.utm_campaign ? String(body.utm_campaign).slice(0, 128) : null,
      tenant_id: body.tenant_id ? Number(body.tenant_id) : null,
      user_agent: req.headers.get("user-agent")?.slice(0, 512) || null,
      referer: req.headers.get("referer")?.slice(0, 512) || null,
      ip_hash,
    });
    return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }
}
