/**
 * Round 143i — GET /api/admin/ccs-detail?date=YYYY-MM-DD&lang=
 *
 * 특정 날짜의 T1(자사) 인용 상세:
 *   - 어떤 wecircle URL 이 인용됐는지
 *   - 어떤 키워드로 (AI 가 검색한 키워드)
 *   - 어떤 AI 엔진이 인용했는지
 *   - 해당 날 시장 전체 인용 수 (분모)
 *
 * CcsTrend.tsx 의 스파이크 점 클릭 시 호출 → 슬라이드 인 패널에 표시.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { loadClassifierSets, classifyDomain } from '@/lib/domain-classifier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SourceDomain = {
  domain?: string;
  final_url?: string | null;
  is_self?: boolean;
};

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const date = sp.get('date'); // YYYY-MM-DD
  const lang = sp.get('lang'); // null = 전체

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: 'date 파라미터 필요 (YYYY-MM-DD)' }, { status: 400 });
  }

  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const dateStart = `${date}T00:00:00.000Z`;
  const dateEnd = `${date}T23:59:59.999Z`;

  // T1 도메인 분류기
  const classifierSets = await loadClassifierSets();

  // 해당 날짜 responses (lang 필터 있으면 keyword.lang 기준)
  let kwIds: number[] | null = null;
  if (lang) {
    const { data: kws } = await sb
      .from('keywords')
      .select('id')
      .eq('lang', lang)
      .eq('is_active', true);
    kwIds = (kws ?? []).map((k: { id: number }) => k.id);
    if (kwIds.length === 0) {
      return NextResponse.json({
        ok: true,
        date,
        total_citations: 0,
        t1_citations: [],
        t1_count: 0,
        market_count: 0,
        ccs_pct: 0,
      });
    }
  }

  // queries for that date
  let qQuery = sb
    .from('queries')
    .select('id, keyword_id, engine')
    .gte('requested_at', dateStart)
    .lte('requested_at', dateEnd);
  if (kwIds) {
    qQuery = qQuery.in('keyword_id', kwIds);
  }
  const { data: queries } = await qQuery;
  if (!queries || queries.length === 0) {
    return NextResponse.json({
      ok: true, date, total_citations: 0, t1_citations: [], t1_count: 0, market_count: 0, ccs_pct: 0,
    });
  }

  const queryIds = queries.map((q: { id: number }) => q.id);
  const queryMap = new Map(
    (queries as Array<{ id: number; keyword_id: number; engine: string }>).map((q) => [
      q.id,
      { keyword_id: q.keyword_id, engine: q.engine },
    ])
  );

  // keyword 텍스트
  const kwIdSet = [...new Set(queries.map((q: { keyword_id: number }) => q.keyword_id))];
  const { data: kws } = await sb.from('keywords').select('id, keyword').in('id', kwIdSet);
  const kwText = new Map(((kws ?? []) as Array<{ id: number; keyword: string }>).map((k) => [k.id, k.keyword]));

  // responses for those queries
  const { data: resp } = await sb
    .from('responses')
    .select('id, query_id, source_domains, created_at')
    .in('query_id', queryIds.slice(0, 2000))
    .gte('created_at', dateStart)
    .lte('created_at', dateEnd)
    .not('source_domains', 'is', null);

  // 집계
  let marketCount = 0;
  const t1Map = new Map<
    string,
    { url: string; domain: string; keyword: string; engine: string; time: string; count: number }
  >();

  for (const r of (resp ?? []) as Array<{
    id: number;
    query_id: number;
    source_domains: SourceDomain[] | null;
    created_at: string;
  }>) {
    const qMeta = queryMap.get(r.query_id);
    const kw = qMeta ? kwText.get(qMeta.keyword_id) ?? '?' : '?';
    const engine = qMeta?.engine ?? '?';
    const time = r.created_at.slice(11, 16); // HH:MM

    for (const sd of r.source_domains ?? []) {
      if (!sd?.domain) continue;
      marketCount++;
      const tier = classifyDomain(sd.domain, sd.final_url ?? null, null, classifierSets);
      const isSelf = tier === 'T1' || sd.is_self === true;
      if (!isSelf || !sd.final_url) continue;

      const key = sd.final_url;
      if (!t1Map.has(key)) {
        t1Map.set(key, { url: key, domain: sd.domain, keyword: kw, engine, time, count: 0 });
      }
      const e = t1Map.get(key)!;
      e.count++;
    }
  }

  const t1Citations = Array.from(t1Map.values()).sort((a, b) => b.count - a.count);
  const t1Count = t1Citations.reduce((s, c) => s + c.count, 0);
  const ccsPct = marketCount > 0 ? Math.round((t1Count / marketCount) * 10000) / 100 : 0;

  return NextResponse.json(
    {
      ok: true,
      date,
      t1_citations: t1Citations,
      t1_count: t1Count,
      market_count: marketCount,
      ccs_pct: ccsPct,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
