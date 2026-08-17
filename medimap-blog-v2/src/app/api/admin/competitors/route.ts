/**
 * Round 34 (2026-05-30) — 경쟁사 분석 API.
 *
 * 자사 페이지가 "메디맵 + 클라이언트 자체 인용률" 추적이라면,
 * 이 API 는 "경쟁사 (T3+T4+T5) 가 키워드별로 얼마나 노출되는지" 추적.
 *
 * Query:
 *   ?tenantId=4   — 선택된 클라이언트 (필수, 그 클라이언트의 키워드 측정 결과 분석)
 *
 * 응답:
 *   {
 *     tenants, selected_tenant,
 *     business_model: "라식,라섹,스마일라식,스마일프로",
 *     competitor_top: [{ domain, tier, count, keywords, urls }],
 *     keyword_competitor_matrix: [
 *       { keyword, total_sources, competitors: [{domain, count, tier}] }
 *     ],
 *     tier_distribution: { T3, T4, T5 }
 *   }
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { classifyDomain, loadClassifierSets, type Tier } from '@/lib/domain-classifier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Round 37 C (2026-05-31) — 5-tier 분류 사전이 domain_classifications 테이블로 이전.
// 하드코딩 Set + classify 함수 제거. lib/domain-classifier 의 공용 헬퍼 사용.

function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const url = new URL(req.url);
  const tenantIdParam = url.searchParams.get('tenantId');
  const tenantIdFilter = tenantIdParam ? Number(tenantIdParam) : null;
  // Round 40 B2 (2026-05-31) — 라벨 필터 (DIRECT/INDIRECT/REFERENCE/TO_LEARN/IGNORE)
  const labelFilter = url.searchParams.get('label')?.toUpperCase() ?? null;
  const validLabels = new Set(['DIRECT', 'INDIRECT', 'REFERENCE', 'TO_LEARN', 'IGNORE']);
  const applyLabel = labelFilter && validLabels.has(labelFilter) ? labelFilter : null;

  // 1. 전체 tenants (selector 용)
  // Round 36 (2026-05-31): additional_domains 까지 가져와 T2 분류에 사용.
  const { data: tenantsAll } = await sb
    .from('tenants')
    .select('id, name, homepage, business_model, partner_slug, additional_domains')
    .order('id');
  const tenantsList = (tenantsAll ?? []).map(
    (t: { id: number; name: string; business_model: string | null; partner_slug: string | null }) => ({
      id: t.id,
      name: t.name,
      is_self: t.business_model === 'self' || t.partner_slug === 'medimap-self',
    })
  );
  const selectedTenantRow = tenantIdFilter
    ? (tenantsAll ?? []).find((t: { id: number }) => t.id === tenantIdFilter)
    : null;
  const selectedTenant = selectedTenantRow
    ? {
        id: selectedTenantRow.id,
        name: selectedTenantRow.name,
        business_model: selectedTenantRow.business_model ?? '',
        is_self: selectedTenantRow.business_model === 'self' || selectedTenantRow.partner_slug === 'medimap-self',
      }
    : null;
  // Round 36 — selected tenant 의 자체 도메인 set (homepage + additional_domains 통합)
  const selectedClientDomains: Set<string> | null = selectedTenantRow
    ? (() => {
        const set = new Set<string>();
        const main = extractDomain(selectedTenantRow.homepage);
        if (main) set.add(main.toLowerCase());
        (selectedTenantRow.additional_domains ?? []).forEach((d: string) => {
          if (d) set.add(d.toLowerCase().replace(/^www\./, ''));
        });
        return set.size > 0 ? set : null;
      })()
    : null;

  // Round 75 — 기간 필터 (일수). 기본 30, 1~365 클램프.
  const daysParam = url.searchParams.get('days');
  const days = daysParam ? Math.max(1, Math.min(365, Number(daysParam) || 30)) : 30;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const classifierSets = await loadClassifierSets();

  // 언어 스코프 (keywords.lang). scope≠all 이면 lang keyword_id 로 키워드/쿼리 필터.
  const scopeParam = url.searchParams.get('scope') || 'all';
  const kwLang =
    scopeParam === 'ko' ? 'ko' : scopeParam === 'en' ? 'en' : scopeParam === 'ja' ? 'ja' : scopeParam === 'zh' ? 'zh-Hant' : null;
  let langKwIds: number[] | null = null;
  if (kwLang) {
    const { data: lkw } = await sb.from('keywords').select('id').eq('lang', kwLang);
    langKwIds = (lkw ?? []).map((k: { id: number }) => k.id);
  }

  // 2. 경쟁 추적 키워드 추출.
  //    Round 68 — 자사(메디맵 self) 선택 시 'own' 키워드로 경쟁사 데이터 표시.
  //    (메디맵은 competitor_landscape 키워드가 없고 own 키워드 응답에 경쟁사가 잡힘)
  const isSelfTenant = !!selectedTenant?.is_self;
  let landscapeKwQuery = sb
    .from('keywords')
    .select('id, text, tenant_id')
    .eq('is_active', true);
  landscapeKwQuery = isSelfTenant
    ? landscapeKwQuery.or('purpose.eq.own,purpose.is.null')
    : landscapeKwQuery.eq('purpose', 'competitor_landscape');
  if (tenantIdFilter) landscapeKwQuery = landscapeKwQuery.eq('tenant_id', tenantIdFilter);
  if (langKwIds) landscapeKwQuery = landscapeKwQuery.in('id', langKwIds);
  const { data: landscapeKeywords } = await landscapeKwQuery;
  const landscapeKwIds = new Set(
    (landscapeKeywords ?? []).map((k: { id: number }) => k.id)
  );
  const keywordTextMap = new Map<number, string>();
  (landscapeKeywords ?? []).forEach((k: { id: number; text: string }) => {
    keywordTextMap.set(k.id, k.text);
  });

  // 3. queries — competitor_landscape 키워드 + tenant 필터
  // Round 163b — 1,000행 캡 대응: 페이지네이션 전량 수집
  const queries = await fetchAllRows<{ id: number; tenant_id: number; keyword_id: number; engine: string }>(
    (from, to) => {
      let q = sb
        .from('queries')
        .select('id, tenant_id, keyword_id, engine')  // Round 64 — engine 추가 (드릴다운)
        .neq('engine', 'stub')  // Round 36 fix 2 — production 측정만, stub 시드 제외
        .gte('requested_at', cutoff)
        .order('id')
        .range(from, to);
      if (tenantIdFilter) q = q.eq('tenant_id', tenantIdFilter);
      if (langKwIds) q = q.in('keyword_id', langKwIds);
      return q;
    }
  );
  const queryKeywordMap = new Map<number, number>();
  const queryEngineMap = new Map<number, string>();  // Round 64 — query → 엔진
  (queries ?? []).forEach((q: { id: number; keyword_id: number; engine: string }) => {
    if (landscapeKwIds.has(q.keyword_id)) {
      queryKeywordMap.set(q.id, q.keyword_id);
      queryEngineMap.set(q.id, q.engine);
    }
  });
  const validQueryIds = new Set(queryKeywordMap.keys());

  // 4. responses 의 source_domains 집계 — 경쟁사 중심
  // Round 163b — 1,000행 캡 대응
  const respRows = await fetchAllRows<{
    id: number;
    query_id: number;
    source_domains: Array<{ domain: string; final_url: string | null; is_self?: boolean }> | null;
    created_at: string;
  }>((from, to) =>
    sb
      .from('responses')
      .select('id, query_id, source_domains, created_at')
      .gte('created_at', cutoff)
      .not('source_domains', 'is', null)
      .order('id')
      .range(from, to)
  );
  const filteredResp = (respRows ?? []).filter(
    (r: { query_id: number }) => validQueryIds.has(r.query_id)
  );

  const tierCount = { T3: 0, T4: 0, T5: 0 };
  // domain → { count, tier, keywords, urls }
  const domainAgg = new Map<
    string,
    {
      count: number;
      tier: Tier;
      keywords: Set<string>;
      urls: Set<string>;
      // Round 64 — 키워드별 인용 상세 (드릴다운): 키워드 → {인용수, 엔진, 콘텐츠 URL}
      byKw: Map<string, { count: number; engines: Set<string>; urls: Set<string>; urlsByEngine: Map<string, Set<string>> }>;
    }
  >();
  // keyword → competitor 별 카운트 (+ Round 66 엔진별 카운트)
  const keywordMatrix = new Map<
    string,
    {
      total_sources: number;
      competitors: Map<string, { count: number; tier: Tier }>;
      engines: Map<string, number>;
    }
  >();
  // Round 66 — 클라이언트(자사) 현황: T1 메디맵 / T2 클라이언트 자체 / 전체 비-NOISE 출처
  const clientStatus = { medimap_t1: 0, client_t2: 0, total_sources: 0 };
  // Round 73 — 클라이언트(자사) 도메인이 인용된 키워드 종류 수집
  const clientKeywordSet = new Set<string>();

  filteredResp.forEach(
    (r: {
      query_id: number;
      source_domains: Array<{ domain: string; final_url: string | null }> | null;
    }) => {
      const kwId = queryKeywordMap.get(r.query_id);
      const kw = kwId ? keywordTextMap.get(kwId) ?? '?' : '?';
      const engine = queryEngineMap.get(r.query_id) ?? '?';  // Round 64
      if (!keywordMatrix.has(kw)) {
        keywordMatrix.set(kw, { total_sources: 0, competitors: new Map(), engines: new Map() });
      }
      const kwBucket = keywordMatrix.get(kw)!;

      (r.source_domains ?? []).forEach((sd) => {
        const tier = classifyDomain(sd.domain, null, selectedClientDomains, classifierSets);
        // Round 66 — 클라이언트 현황 집계 (스킵 전에)
        if (tier !== 'NOISE') clientStatus.total_sources++;
        if (tier === 'T1') clientStatus.medimap_t1++;
        if (tier === 'T2') {
          clientStatus.client_t2++;
          if (kw && kw !== '?') clientKeywordSet.add(kw);
        }
        // 경쟁사 페이지 = T3+T4+T5 만 카운트 (T1 메디맵, T2 자체 제외)
        if (tier === 'NOISE' || tier === 'T1' || tier === 'T2') return;
        tierCount[tier]++;
        kwBucket.total_sources++;
        // Round 66 — 키워드별 엔진 인용 카운트
        if (engine && engine !== '?') {
          kwBucket.engines.set(engine, (kwBucket.engines.get(engine) ?? 0) + 1);
        }

        if (sd.domain) {
          if (!domainAgg.has(sd.domain)) {
            domainAgg.set(sd.domain, {
              count: 0,
              tier,
              keywords: new Set(),
              urls: new Set(),
              byKw: new Map(),
            });
          }
          const dom = domainAgg.get(sd.domain)!;
          dom.count++;
          dom.keywords.add(kw);
          if (sd.final_url) dom.urls.add(sd.final_url);

          // Round 64 — 키워드별 인용 상세 누적 (드릴다운)
          if (!dom.byKw.has(kw)) {
            dom.byKw.set(kw, { count: 0, engines: new Set(), urls: new Set(), urlsByEngine: new Map() });
          }
          const kwDetail = dom.byKw.get(kw)!;
          kwDetail.count++;
          if (engine && engine !== '?') kwDetail.engines.add(engine);
          if (sd.final_url) {
            kwDetail.urls.add(sd.final_url);
            // Round 104-c — url 을 엔진별로도 묶음(엔진 칩 클릭 → 그 엔진 URL 만 필터)
            if (engine && engine !== '?') {
              if (!kwDetail.urlsByEngine.has(engine)) kwDetail.urlsByEngine.set(engine, new Set());
              kwDetail.urlsByEngine.get(engine)!.add(sd.final_url);
            }
          }

          // 키워드 매트릭스
          if (!kwBucket.competitors.has(sd.domain)) {
            kwBucket.competitors.set(sd.domain, { count: 0, tier });
          }
          kwBucket.competitors.get(sd.domain)!.count++;
        }
      });
    }
  );

  // Round 40 B2 — 라벨 필터 적용 시 tenant_domain_competition fetch
  let labelMap = new Map<string, { label: string; priority: number }>();
  if (applyLabel && tenantIdFilter) {
    const { data: labelRows } = await sb
      .from('tenant_domain_competition')
      .select('domain, label, priority')
      .eq('tenant_id', tenantIdFilter)
      .eq('label', applyLabel);
    labelMap = new Map(
      (labelRows ?? []).map((r: { domain: string; label: string; priority: number }) => [
        r.domain.toLowerCase(),
        { label: r.label, priority: r.priority },
      ])
    );
  }

  const competitorTop = Array.from(domainAgg.entries())
    .filter(([domain]) => !applyLabel || labelMap.has(domain.toLowerCase()))
    .map(([domain, { count, tier, keywords, urls, byKw }]) => ({
      domain,
      tier,
      count,
      keywords: Array.from(keywords),
      urls: Array.from(urls).slice(0, 5),
      // Round 64 — 키워드별 인용 상세 (인용수 desc 정렬)
      citations: Array.from(byKw.entries())
        .map(([keyword, v]) => ({
          keyword,
          count: v.count,
          engines: Array.from(v.engines).sort(),
          urls: Array.from(v.urls).slice(0, 8),
          // Round 104-c — 엔진별 URL (엔진 칩 클릭 필터용)
          urlsByEngine: Object.fromEntries(
            Array.from(v.urlsByEngine.entries()).map(([e, s]) => [e, Array.from(s).slice(0, 8)])
          ),
        }))
        .sort((a, b) => b.count - a.count),
      label: labelMap.get(domain.toLowerCase())?.label ?? null,
      priority: labelMap.get(domain.toLowerCase())?.priority ?? null,
    }))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || b.count - a.count);

  const keywordCompetitorMatrix = Array.from(keywordMatrix.entries())
    .map(([keyword, { total_sources, competitors, engines }]) => ({
      keyword,
      total_sources,
      competitors: Array.from(competitors.entries())
        .map(([domain, v]) => ({ domain, count: v.count, tier: v.tier }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      // Round 66 — 키워드별 AI 엔진 인용 횟수
      engines: Array.from(engines.entries())
        .map(([engine, count]) => ({ engine, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.total_sources - a.total_sources);

  return NextResponse.json({
    ok: true,
    tenants: tenantsList,
    selected_tenant: selectedTenant,
    business_model: selectedTenant?.business_model ?? '',
    competitor_top: competitorTop,
    keyword_competitor_matrix: keywordCompetitorMatrix,
    tier_distribution: tierCount,
    // Round 66/73 — 클라이언트(자사) 현황 + 인용 키워드 종류
    client_status: { ...clientStatus, keywords: Array.from(clientKeywordSet) },
  });
}
