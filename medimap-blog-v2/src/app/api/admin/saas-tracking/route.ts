/**
 * Round 38 (2026-05-31) — 메디맵 SaaS 자체 시장 노출도 추적 API.
 *
 * "GEO 최적화", "AEO 컨설팅" 같은 SaaS 카테고리 키워드를 AI 에 query 했을 때
 * 메디맵 자체 도메인이 인용되는지 + 경쟁 SaaS 도메인은 무엇이 노출되는지 추적.
 *
 * GET /api/admin/saas-tracking
 *   응답: {
 *     keywords: [{ id, text, last_measured_at }],
 *     mention_count, t1_count, competitor_count,
 *     daily_trend: [{ date, t1, total, t1_share }],
 *     competitor_domains: [{ domain, count, urls[] }],
 *     keyword_grounding: [{ keyword, queries, grounded, t1, rate }]
 *   }
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { fetchAllRows, fetchByIdChunks } from '@/lib/fetchAllRows';
import { classifyDomain, loadClassifierSets } from '@/lib/domain-classifier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Round 143 — 언어 스코프 → 측정 keywords.lang (zh 는 측정에서 zh-Hant).
function scopeToKwLang(scope: string | null): string | null {
  switch (scope) {
    case 'ko': return 'ko';
    case 'en': return 'en';
    case 'ja': return 'ja';
    case 'zh': return 'zh-Hant';
    default: return null;
  }
}

export async function GET(req: Request) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const scopeParam = new URL(req.url).searchParams.get('scope')?.trim() || null;
  const scopeLang = scopeToKwLang(scopeParam); // null = 전체

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const classifierSets = await loadClassifierSets();

  // 1. SaaS 마케팅 키워드 (is_saas_marketing=true) — 언어 스코프 필터
  let kwQuery = sb
    .from('keywords')
    .select('id, text, is_active, last_measured_at')
    .eq('is_saas_marketing', true);
  if (scopeLang) kwQuery = kwQuery.eq('lang', scopeLang);
  const { data: kwRows } = await kwQuery.order('id');

  const keywords = (kwRows ?? []).map((k: { id: number; text: string; is_active: boolean; last_measured_at: string | null }) => ({
    id: k.id,
    text: k.text,
    is_active: k.is_active,
    last_measured_at: k.last_measured_at,
  }));

  if (keywords.length === 0) {
    return NextResponse.json({
      ok: true,
      keywords: [],
      mention_count: 0,
      t1_count: 0,
      competitor_count: 0,
      daily_trend: [],
      competitor_domains: [],
      keyword_grounding: [],
      note: scopeLang
        ? `이 언어(${scopeParam})의 SaaS 마케팅 키워드가 아직 없습니다. 위서클 자사 SaaS는 현재 국내(ko) 위주로 측정됩니다 — 해외 SaaS 확장 시 채워집니다.`
        : 'SaaS 마케팅 키워드 미등록 — keywords.is_saas_marketing=true 인 row 추가 필요',
    });
  }

  const keywordIds = keywords.map((k) => k.id);
  const keywordTextMap = new Map<number, string>(keywords.map((k) => [k.id, k.text]));

  // 2. queries — SaaS 키워드 측정 (production 만)
  // Round 163b — 1,000행 캡 대응
  const queriesRows = await fetchAllRows<{ id: number; keyword_id: number; requested_at: string }>(
    (from, to) =>
      sb
        .from('queries')
        .select('id, keyword_id, requested_at')
        .in('keyword_id', keywordIds)
        .neq('engine', 'stub')
        .gte('requested_at', cutoff)
        .order('id')
        .range(from, to)
  );

  const queryToKw = new Map<number, number>();
  (queriesRows ?? []).forEach((q: { id: number; keyword_id: number }) => {
    queryToKw.set(q.id, q.keyword_id);
  });

  // 3. responses — source_domains 분석
  const queryIdsArr = Array.from(queryToKw.keys());
  let respsRows: Array<{ query_id: number; source_domains: Array<{ domain: string; final_url: string | null }> | null; created_at: string }> = [];
  if (queryIdsArr.length > 0) {
    // Round 163b — id 다량 .in() 은 URL 길이·캡 양쪽 위험 → 청크 수집
    respsRows = await fetchByIdChunks(queryIdsArr, (chunk) =>
      sb
        .from('responses')
        .select('query_id, source_domains, created_at')
        .in('query_id', chunk)
        .gte('created_at', cutoff)
    );
  }

  // 4. 집계
  let t1Count = 0;
  let competitorCount = 0;
  const dailyMap = new Map<string, { t1: number; total: number }>();
  const competitorDomains = new Map<string, { count: number; urls: Set<string> }>();
  const kwStats = new Map<number, { queries: number; grounded: number; t1: number }>();

  // queries 횟수 카운트
  (queriesRows ?? []).forEach((q: { id: number; keyword_id: number }) => {
    if (!kwStats.has(q.keyword_id)) {
      kwStats.set(q.keyword_id, { queries: 0, grounded: 0, t1: 0 });
    }
    kwStats.get(q.keyword_id)!.queries++;
  });

  respsRows.forEach((r) => {
    const kwId = queryToKw.get(r.query_id);
    const date = r.created_at.slice(5, 10);
    const stats = kwId ? kwStats.get(kwId) : null;

    const sources = r.source_domains ?? [];
    if (sources.length > 0 && stats) stats.grounded++;

    sources.forEach((sd) => {
      const tier = classifyDomain(sd.domain, sd.final_url, null, classifierSets);

      if (!dailyMap.has(date)) dailyMap.set(date, { t1: 0, total: 0 });
      const bucket = dailyMap.get(date)!;
      bucket.total++;

      if (tier === 'T1') {
        bucket.t1++;
        t1Count++;
        if (stats) stats.t1++;
      } else if (tier !== 'NOISE') {
        // T3/T4/T5 모두 경쟁 SaaS 후보 — SaaS 마케팅 키워드에서 grounding 되는 외부 도메인
        competitorCount++;
        if (sd.domain) {
          const d = sd.domain.toLowerCase();
          if (!competitorDomains.has(d)) {
            competitorDomains.set(d, { count: 0, urls: new Set() });
          }
          const cd = competitorDomains.get(d)!;
          cd.count++;
          if (sd.final_url) cd.urls.add(sd.final_url);
        }
      }
    });
  });

  // 5. 일자별 30일 fill
  const dailyTrend: Array<{ date: string; t1: number; total: number; t1_share: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateKey = dt.toISOString().slice(5, 10);
    const b = dailyMap.get(dateKey) ?? { t1: 0, total: 0 };
    dailyTrend.push({
      date: dateKey,
      t1: b.t1,
      total: b.total,
      t1_share: b.total > 0 ? b.t1 / b.total : 0,
    });
  }

  // 6. 경쟁 SaaS 도메인 ranking
  const competitorList = Array.from(competitorDomains.entries())
    .map(([domain, v]) => ({
      domain,
      count: v.count,
      urls: Array.from(v.urls).slice(0, 5),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // 7. 키워드별 grounding
  const keywordGrounding = Array.from(kwStats.entries()).map(([kwId, v]) => ({
    keyword: keywordTextMap.get(kwId) ?? `#${kwId}`,
    queries: v.queries,
    grounded: v.grounded,
    t1: v.t1,
    rate: v.queries > 0 ? v.grounded / v.queries : 0,
  })).sort((a, b) => b.queries - a.queries);

  return NextResponse.json({
    ok: true,
    keywords,
    mention_count: t1Count + competitorCount,
    t1_count: t1Count,
    competitor_count: competitorCount,
    daily_trend: dailyTrend,
    competitor_domains: competitorList,
    keyword_grounding: keywordGrounding,
  });
}
