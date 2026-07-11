/**
 * GET /api/admin/market-share?days=30&lang=<lang>
 *
 * AI 시장 점유 진단(도메인 Top) 데이터를 스코프(lang)별로 반환.
 * market_share_domains RPC(도메인×인용수, keywords.lang 필터) + 자사/경쟁사/권위 분류·합계 계산.
 * 대시보드 홈 SSR 계산과 동일 로직 — lang=null(통합)이면 SSR 값과 동일.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COMPETITOR_PATTERNS = ['eye', 'clinic', 'hospital', 'medic', '안과', 'derm', 'plastic', 'hair'];
const AUTHORITY = new Set([
  'namu.wiki', 'youtube.com', 'modoodoc.com', 'hidoc.co.kr', 'news.hidoc.co.kr',
  'v.daum.net', 'edu.donga.com', 'news.naver.com',
]);

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const days = Math.min(90, Math.max(1, Number(sp.get('days') ?? '30') || 30));
  const lang = sp.get('lang');

  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  }

  const { data, error } = await sb.rpc('market_share_domains', { _days: days, _lang: lang || null });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Array<{ domain: string; citations: number }>;
  let totalCitations = 0;
  let medimapCitations = 0;
  const all = rows.map((r) => {
    const domain = (r.domain || '').toLowerCase();
    const citations = Number(r.citations) || 0;
    totalCitations += citations;
    const isOwn = domain.includes('wecircle') || domain.includes('medimap') || domain.includes('medi-map');
    if (isOwn) medimapCitations += citations;
    const isAuth = AUTHORITY.has(domain);
    const isCompetitor = !isOwn && !isAuth && COMPETITOR_PATTERNS.some((p) => domain.includes(p));
    return { domain, citations, isOwn, isCompetitor };
  });

  return NextResponse.json(
    { ok: true, domains: all.slice(0, 50), medimapCitations, totalCitations },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
