/**
 * GET /api/admin/ccs-trend?days=30
 *
 * 일자별 CCS(콘텐츠 인용 점유율) 추이 — RPC citation_market_trend.
 * self = wecircle/medimap/medi-map 도메인 인용. total = 그날 전체 source 인용.
 * ccs_pct = self/total*100. 어드민 대시보드 '인용 시장' 추이 라인용.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const days = Math.min(180, Math.max(7, Number(sp.get('days') ?? '30') || 30));
  const lang = sp.get('lang'); // null = 전체(통합)
  const market = sp.get('market'); // null = 전체

  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  }

  const { data, error } = await sb.rpc('citation_market_trend', {
    _days: days,
    _lang: lang || null,
    _market: market || null,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, points: data ?? [] },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } },
  );
}
