/**
 * Round 32 phase C (2026-05-30) — AI 인용 분석 API + 클라이언트 필터링.
 *
 * Query parameter:
 *   ?tenantId=4   — 특정 클라이언트만 필터링 (생략 시 전체)
 *
 * 5-Tier source 분류:
 *   T1 = 메디맵 자체 (medi-map.co.kr 등)
 *   T2 = 클라이언트 자체 (tenant.homepage)
 *   T3 = 권위/공식 (MSD 매뉴얼, 종합병원)
 *   T4 = 의료 플랫폼 (모두닥, 강남언니 등)
 *   T5 = 기타 (경쟁사 의료 사이트)
 *
 * 응답:
 *   - mention_trend, source_tier, top_domains, medimap_share_trend
 *   - tenants: 전체 tenant 목록 (selector 용)
 *   - selected_tenant: 선택된 tenant 정보
 *   - keyword_breakdown: 키워드별 mention/source 통계
 *   - competitor_breakdown: 도메인별 + 인용된 키워드 top 3
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { classifyDomain, loadClassifierSets, type Tier } from '@/lib/domain-classifier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Round 37 C (2026-05-31) — 5-tier 분류 사전이 domain_classifications 테이블로 이전.
// 하드코딩 Set + classify 함수 제거. lib/domain-classifier 의 공용 헬퍼 사용.

function extractDomainFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  }

  const url = new URL(req.url);
  const tenantIdParam = url.searchParams.get('tenantId');
  const tenantIdFilter = tenantIdParam ? Number(tenantIdParam) : null;

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const classifierSets = await loadClassifierSets();

  // 1. 전체 tenants (selector 용)
  // Round 36 (2026-05-31): additional_domains 도 함께 가져와 T2 분류에 사용.
  const { data: tenantsAll } = await sb
    .from('tenants')
    .select('id, name, homepage, business_model, partner_slug, additional_domains')
    .order('id');
  const tenantsList = (tenantsAll ?? []).map(
    (t: { id: number; name: string; homepage: string | null; business_model: string | null; partner_slug: string | null }) => ({
      id: t.id,
      name: t.name,
      is_self: t.business_model === 'self' || t.partner_slug === 'medimap-self',
    })
  );
  // Round 36 — tenant 별 자체 도메인 set (homepage + additional_domains 통합).
  const tenantDomainsMap = new Map<number, Set<string>>();
  (tenantsAll ?? []).forEach(
    (t: { id: number; homepage: string | null; additional_domains: string[] | null }) => {
      const set = new Set<string>();
      const main = extractDomainFromUrl(t.homepage);
      if (main) set.add(main.toLowerCase());
      (t.additional_domains ?? []).forEach((d) => {
        if (d) set.add(d.toLowerCase().replace(/^www\./, ''));
      });
      if (set.size > 0) tenantDomainsMap.set(t.id, set);
    }
  );
  const selectedTenant = tenantIdFilter
    ? tenantsList.find((t) => t.id === tenantIdFilter) ?? null
    : null;
  const selectedClientDomains = tenantIdFilter
    ? tenantDomainsMap.get(tenantIdFilter) ?? null
    : null;

  // 2. mentions trend — tenant 필터 적용
  let mentionsQuery = sb
    .from('mentions')
    .select('created_at, tenant_id, is_target')
    .gte('created_at', cutoff)
    .eq('is_target', true);
  if (tenantIdFilter) {
    mentionsQuery = mentionsQuery.eq('tenant_id', tenantIdFilter);
  }
  const { data: mentionRows } = await mentionsQuery;
  const mentionByDate = new Map<string, number>();
  (mentionRows ?? []).forEach((m: { created_at: string }) => {
    const date = m.created_at.slice(0, 10);
    mentionByDate.set(date, (mentionByDate.get(date) ?? 0) + 1);
  });
  const today = new Date();
  const mentionTrend: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const ds = d.toISOString().slice(0, 10);
    mentionTrend.push({ date: ds.slice(5), count: mentionByDate.get(ds) ?? 0 });
  }

  // Round 34 phase 2 — purpose='own' 키워드만 (자사 추적 페이지)
  // competitor_landscape 키워드 (BGN '라식', '라섹' 등) 는 별도 /admin/competitors 페이지에서 표시.
  let ownKwQuery = sb
    .from('keywords')
    .select('id, text, tenant_id')
    .or('purpose.eq.own,purpose.is.null') // null 도 자사로 (기존 데이터 호환)
    .eq('is_active', true);
  if (tenantIdFilter) ownKwQuery = ownKwQuery.eq('tenant_id', tenantIdFilter);
  const { data: ownKeywords } = await ownKwQuery;
  const ownKwIds = new Set(
    (ownKeywords ?? []).map((k: { id: number }) => k.id)
  );

  // 3. queries 의 tenant_id 매핑 (responses 의 tenant 필터링용)
  // Round 36 fix 2 (2026-05-31) — stub engine 제외, production 측정만.
  let queriesQuery = sb
    .from('queries')
    .select('id, tenant_id, keyword_id, engine')  // Round 64 — engine 추가 (드릴다운)
    .neq('engine', 'stub')
    .gte('requested_at', cutoff);
  if (tenantIdFilter) {
    queriesQuery = queriesQuery.eq('tenant_id', tenantIdFilter);
  }
  const { data: queriesRows } = await queriesQuery;
  const queryTenantMap = new Map<number, number>();
  const queryKeywordMap = new Map<number, number>();
  const queryEngineMap = new Map<number, string>();  // Round 64 — query → 엔진
  (queriesRows ?? []).forEach((q: { id: number; tenant_id: number; keyword_id: number; engine: string }) => {
    // own 키워드만 포함
    if (!ownKwIds.has(q.keyword_id)) return;
    queryTenantMap.set(q.id, q.tenant_id);
    queryKeywordMap.set(q.id, q.keyword_id);
    queryEngineMap.set(q.id, q.engine);
  });
  const validQueryIds = new Set(queryTenantMap.keys());

  // 4. keywords 정보 (text 매핑)
  const keywordIds = Array.from(new Set(Array.from(queryKeywordMap.values())));
  const keywordTextMap = new Map<number, string>();
  if (keywordIds.length > 0) {
    const { data: kws } = await sb.from('keywords').select('id, text').in('id', keywordIds);
    (kws ?? []).forEach((k: { id: number; text: string }) => {
      keywordTextMap.set(k.id, k.text);
    });
  }

  // 5. responses 의 source_domains — tenant 필터링 후 집계
  const { data: respRows } = await sb
    .from('responses')
    .select('id, query_id, source_domains, created_at')
    .gte('created_at', cutoff)
    .not('source_domains', 'is', null);
  const filteredResp = (respRows ?? []).filter(
    (r: { query_id: number }) => validQueryIds.has(r.query_id)
  );

  // 집계 변수
  const tierCount = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 };
  const domainCount = new Map<string, { count: number; tier: Tier; keywords: Set<string> }>();
  // Round 64 — 도메인 → 키워드별 인용 상세 (드릴다운): 키워드 → {인용수, 엔진, 콘텐츠 URL}
  const domainKwAgg = new Map<
    string,
    Map<string, { count: number; engines: Set<string>; urls: Set<string> }>
  >();
  const shareByDate = new Map<string, { total: number; t1: number }>();
  // 키워드별 source 분포
  const keywordStats = new Map<
    number,
    { keyword: string; source_count: number; t1: number; t2: number; t5: number; mention_count: number }
  >();

  filteredResp.forEach(
    (r: {
      id: number;
      query_id: number;
      source_domains: Array<{ domain: string; final_url: string | null; is_self: boolean }> | null;
      created_at: string;
    }) => {
      const tenantId = queryTenantMap.get(r.query_id);
      const keywordId = queryKeywordMap.get(r.query_id);
      const clientDomains =
        selectedClientDomains ?? (tenantId ? tenantDomainsMap.get(tenantId) ?? null : null);
      const date = r.created_at.slice(0, 10);
      if (!shareByDate.has(date)) shareByDate.set(date, { total: 0, t1: 0 });
      const dateBucket = shareByDate.get(date)!;

      const kwText = keywordId ? keywordTextMap.get(keywordId) ?? '?' : '?';
      const engine = queryEngineMap.get(r.query_id) ?? '?';  // Round 64
      if (keywordId && !keywordStats.has(keywordId)) {
        keywordStats.set(keywordId, {
          keyword: kwText,
          source_count: 0,
          t1: 0,
          t2: 0,
          t5: 0,
          mention_count: 0,
        });
      }
      const kwBucket = keywordId ? keywordStats.get(keywordId)! : null;

      (r.source_domains ?? []).forEach((sd) => {
        const tier = classifyDomain(sd.domain, sd.final_url, clientDomains, classifierSets);
        if (tier === 'NOISE') return;
        tierCount[tier]++;
        const key = sd.domain;
        if (key) {
          const existing = domainCount.get(key);
          if (existing) {
            existing.count++;
            existing.keywords.add(kwText);
          } else {
            domainCount.set(key, { count: 1, tier, keywords: new Set([kwText]) });
          }

          // Round 64 — 키워드별 인용 상세 누적 (드릴다운)
          if (!domainKwAgg.has(key)) domainKwAgg.set(key, new Map());
          const kwMap = domainKwAgg.get(key)!;
          if (!kwMap.has(kwText)) {
            kwMap.set(kwText, { count: 0, engines: new Set(), urls: new Set() });
          }
          const kwDetail = kwMap.get(kwText)!;
          kwDetail.count++;
          if (engine && engine !== '?') kwDetail.engines.add(engine);
          if (sd.final_url) kwDetail.urls.add(sd.final_url);
        }
        dateBucket.total++;
        if (tier === 'T1') dateBucket.t1++;
        if (kwBucket) {
          kwBucket.source_count++;
          if (tier === 'T1') kwBucket.t1++;
          if (tier === 'T2') kwBucket.t2++;
          if (tier === 'T5') kwBucket.t5++;
        }
      });
    }
  );

  // mention 카운트 — 키워드별 (queries → mentions JOIN)
  if (mentionRows && validQueryIds.size > 0) {
    // mention 의 query_id 매핑 — responses 통해서
    const respIdToQuery = new Map<number, number>(
      filteredResp.map((r: { id: number; query_id: number }) => [r.id, r.query_id])
    );
    let mentionQuery = sb
      .from('mentions')
      .select('id, response_id, tenant_id, is_target, created_at')
      .gte('created_at', cutoff)
      .eq('is_target', true);
    if (tenantIdFilter) {
      mentionQuery = mentionQuery.eq('tenant_id', tenantIdFilter);
    }
    const { data: mentionsFull } = await mentionQuery;
    (mentionsFull ?? []).forEach(
      (m: { response_id: number }) => {
        const qid = respIdToQuery.get(m.response_id);
        if (qid != null) {
          const kid = queryKeywordMap.get(qid);
          if (kid != null) {
            const bucket = keywordStats.get(kid);
            if (bucket) bucket.mention_count++;
          }
        }
      }
    );
  }

  const totalTier = Object.values(tierCount).reduce((a, b) => a + b, 0);
  const topDomains = Array.from(domainCount.entries())
    .map(([domain, { count, tier, keywords }]) => ({
      domain,
      count,
      tier,
      keywords: Array.from(keywords).slice(0, 3),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Round 32 phase D (2026-05-30) — 도메인별로 실제 final_url 목록도 같이 보냄.
  // 사용자가 어드민에서 URL 클릭 → 새 탭으로 진입 → 그 콘텐츠 학습.
  const domainUrls = new Map<string, Set<string>>();
  filteredResp.forEach(
    (r: {
      source_domains: Array<{ domain: string; final_url: string | null }> | null;
    }) => {
      (r.source_domains ?? []).forEach((sd) => {
        if (!sd.domain || !sd.final_url) return;
        if (!domainUrls.has(sd.domain)) domainUrls.set(sd.domain, new Set());
        domainUrls.get(sd.domain)!.add(sd.final_url);
      });
    }
  );

  const competitorBreakdown = Array.from(domainCount.entries())
    .filter(([, v]) => v.tier === 'T5' || v.tier === 'T4' || v.tier === 'T3')
    .map(([domain, { count, tier, keywords }]) => ({
      domain,
      tier,
      count,
      keywords: Array.from(keywords),
      urls: Array.from(domainUrls.get(domain) ?? []).slice(0, 5),
      // Round 64 — 키워드별 인용 상세 (인용수 desc)
      citations: Array.from((domainKwAgg.get(domain) ?? new Map()).entries())
        .map(([keyword, v]) => ({
          keyword,
          count: v.count,
          engines: Array.from(v.engines).sort(),
          urls: Array.from(v.urls).slice(0, 8),
        }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count);

  const keywordBreakdown = Array.from(keywordStats.values())
    .sort((a, b) => b.mention_count - a.mention_count);

  // 메디맵 share trend
  const medimapShareTrend: Array<{ date: string; share_pct: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const ds = d.toISOString().slice(0, 10);
    const bucket = shareByDate.get(ds);
    const share =
      bucket && bucket.total > 0 ? Math.round((bucket.t1 / bucket.total) * 1000) / 10 : 0;
    medimapShareTrend.push({ date: ds.slice(5), share_pct: share });
  }

  return NextResponse.json({
    ok: true,
    tenants: tenantsList,
    selected_tenant: selectedTenant,
    mention_trend: mentionTrend,
    source_tier: { ...tierCount, total: totalTier },
    top_domains: topDomains,
    medimap_share_trend: medimapShareTrend,
    keyword_breakdown: keywordBreakdown,
    competitor_breakdown: competitorBreakdown,
  });
}
