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

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const classifierSets = await loadClassifierSets();

  // 2. competitor_landscape keywords 만 추출 (Round 34 phase 2 — 비즈니스 모델 키워드)
  let landscapeKwQuery = sb
    .from('keywords')
    .select('id, text, tenant_id')
    .eq('purpose', 'competitor_landscape')
    .eq('is_active', true);
  if (tenantIdFilter) landscapeKwQuery = landscapeKwQuery.eq('tenant_id', tenantIdFilter);
  const { data: landscapeKeywords } = await landscapeKwQuery;
  const landscapeKwIds = new Set(
    (landscapeKeywords ?? []).map((k: { id: number }) => k.id)
  );
  const keywordTextMap = new Map<number, string>();
  (landscapeKeywords ?? []).forEach((k: { id: number; text: string }) => {
    keywordTextMap.set(k.id, k.text);
  });

  // 3. queries — competitor_landscape 키워드 + tenant 필터
  let queriesQuery = sb
    .from('queries')
    .select('id, tenant_id, keyword_id')
    .neq('engine', 'stub')  // Round 36 fix 2 — production 측정만, stub 시드 제외
    .gte('requested_at', cutoff);
  if (tenantIdFilter) queriesQuery = queriesQuery.eq('tenant_id', tenantIdFilter);
  const { data: queries } = await queriesQuery;
  const queryKeywordMap = new Map<number, number>();
  (queries ?? []).forEach((q: { id: number; keyword_id: number }) => {
    if (landscapeKwIds.has(q.keyword_id)) {
      queryKeywordMap.set(q.id, q.keyword_id);
    }
  });
  const validQueryIds = new Set(queryKeywordMap.keys());

  // 4. responses 의 source_domains 집계 — 경쟁사 중심
  const { data: respRows } = await sb
    .from('responses')
    .select('id, query_id, source_domains, created_at')
    .gte('created_at', cutoff)
    .not('source_domains', 'is', null);
  const filteredResp = (respRows ?? []).filter(
    (r: { query_id: number }) => validQueryIds.has(r.query_id)
  );

  const tierCount = { T3: 0, T4: 0, T5: 0 };
  // domain → { count, tier, keywords, urls }
  const domainAgg = new Map<
    string,
    { count: number; tier: Tier; keywords: Set<string>; urls: Set<string> }
  >();
  // keyword → competitor 별 카운트
  const keywordMatrix = new Map<
    string,
    { total_sources: number; competitors: Map<string, { count: number; tier: Tier }> }
  >();

  filteredResp.forEach(
    (r: {
      query_id: number;
      source_domains: Array<{ domain: string; final_url: string | null }> | null;
    }) => {
      const kwId = queryKeywordMap.get(r.query_id);
      const kw = kwId ? keywordTextMap.get(kwId) ?? '?' : '?';
      if (!keywordMatrix.has(kw)) {
        keywordMatrix.set(kw, { total_sources: 0, competitors: new Map() });
      }
      const kwBucket = keywordMatrix.get(kw)!;

      (r.source_domains ?? []).forEach((sd) => {
        const tier = classifyDomain(sd.domain, null, selectedClientDomains, classifierSets);
        // 경쟁사 페이지 = T3+T4+T5 만 카운트 (T1 메디맵, T2 자체 제외)
        if (tier === 'NOISE' || tier === 'T1' || tier === 'T2') return;
        tierCount[tier]++;
        kwBucket.total_sources++;

        if (sd.domain) {
          if (!domainAgg.has(sd.domain)) {
            domainAgg.set(sd.domain, {
              count: 0,
              tier,
              keywords: new Set(),
              urls: new Set(),
            });
          }
          const dom = domainAgg.get(sd.domain)!;
          dom.count++;
          dom.keywords.add(kw);
          if (sd.final_url) dom.urls.add(sd.final_url);

          // 키워드 매트릭스
          if (!kwBucket.competitors.has(sd.domain)) {
            kwBucket.competitors.set(sd.domain, { count: 0, tier });
          }
          kwBucket.competitors.get(sd.domain)!.count++;
        }
      });
    }
  );

  const competitorTop = Array.from(domainAgg.entries())
    .map(([domain, { count, tier, keywords, urls }]) => ({
      domain,
      tier,
      count,
      keywords: Array.from(keywords),
      urls: Array.from(urls).slice(0, 5),
    }))
    .sort((a, b) => b.count - a.count);

  const keywordCompetitorMatrix = Array.from(keywordMatrix.entries())
    .map(([keyword, { total_sources, competitors }]) => ({
      keyword,
      total_sources,
      competitors: Array.from(competitors.entries())
        .map(([domain, v]) => ({ domain, count: v.count, tier: v.tier }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
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
  });
}
