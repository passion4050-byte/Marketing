/**
 * GET /api/admin/citation-proof?tenant=<id>&lang=<lang>&limit=12
 *
 * AI 인용 증거(Proof) — 우리가 측정해 저장한 실제 AI 답변에서 대상 병원이 언급된 응답을
 * 응답 단위로 반환(엔진·질문·병원명·실제 답변 스니펫·전체 답변·인용여부·날짜).
 * chatgpt.com 화면 캡처가 아니라, DB의 원본 답변을 증거 카드로 렌더(항상 재현·ToS 무관).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const tenant = sp.get('tenant');
  const lang = sp.get('lang');
  const limit = Math.min(50, Math.max(1, Number(sp.get('limit') ?? '12') || 12));

  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  }

  const { data, error } = await sb.rpc('citation_proof', {
    _tenant: tenant ? Number(tenant) : null,
    _lang: lang || null,
    _limit: limit,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    { ok: true, items: data ?? [] },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
