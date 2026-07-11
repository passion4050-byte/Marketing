/**
 * GET /api/admin/citation-proof-tenants?lang=<lang>
 *
 * AI 인용 증거(Proof) 카드의 병원 드롭다운 소스 — "측정 데이터가 실제로 있는 병원"만 반환.
 * 스코프(lang)별로 is_target 언급이 존재하는 tenant 만 노출해, 선택 시 항상 카드가 뜨게 한다.
 * (전체 tenant 목록을 쓰면 측정 데이터 없는 병원 선택 시 공백이 떠 혼란을 준다.)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const lang = new URL(req.url).searchParams.get('lang');

  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  }

  const { data, error } = await sb.rpc('citation_proof_tenants', { _lang: lang || null });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    { ok: true, tenants: data ?? [] },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
