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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MEDIMAP_DOMAINS = new Set<string>([
  'medi-map.co.kr', 'www.medi-map.co.kr',
  'medimap-blog-phi.vercel.app',
  'geo-v2-beta.vercel.app',
  'geo-v2-git-main-medimaps-projects.vercel.app',
]);
const AUTHORITY_DOMAINS = new Set<string>([
  'www.msdmanuals.com', 'msdmanuals.com',
  'www.amc.seoul.kr', 'amc.seoul.kr',
  'www.samsunghospital.com', 'samsunghospital.com',
  'www.snuh.org', 'snuh.org',
  'sev.iseverance.com',
  'www.snubh.org', 'snubh.org',
]);
const PLATFORM_DOMAINS = new Set<string>([
  'www.modoodoc.com', 'modoodoc.com',
  'www.ddmdandy.com', 'ddmdandy.com',
  'www.gangnam-unni.com', 'gangnamunni.com',
  'www.babitalk.com', 'babitalk.com',
  'strawberry-ent.co.kr', 'www.strawberry-ent.co.kr',
]);
const NOISE_DOMAINS = new Set<string>([
  'www.google.com', 'google.com',
  'www.youtube.com', 'youtube.com',
]);

type Tier = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'NOISE';

function classify(domain: string | null, clientHomepageDomain: string | null): Tier {
  if (!domain) return 'NOISE';
  const d = domain.toLowerCase();
  if (MEDIMAP_DOMAINS.has(d)) return 'T1';
  if (clientHomepageDomain && d.endsWith(clientHomepageDomain)) return 'T2';
  if (AUTHORITY_DOMAINS.has(d)) return 'T3';
  if (PLATFORM_DOMAINS.has(d)) return 'T4';
  if (NOISE_DOMAINS.has(d)) return 'NOISE';
  return 'T5';
}

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
  const { data: tenantsAll } = await sb
    .from('tenants')
    .select('id, name, homepage, business_model, partner_slug')
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
  const selectedClientDomain = selectedTenantRow ? extractDomain(selectedTenantRow.homepage) : null;

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 2. queries → tenant 필터링
  let queriesQuery = sb
    .from('queries')
    .select('id, tenant_id, keyword_id')
    .gte('requested_at', cutoff);
  if (tenantIdFilter) queriesQuery = queriesQuery.eq('tenant_id', tenantIdFilter);
  const { data: queries } = await queriesQuery;
  const queryKeywordMap = new Map<number, number>();
  (queries ?? []).forEach((q: { id: number; keyword_id: number }) => {
    queryKeywordMap.set(q.id, q.keyword_id);
  });
  const validQueryIds = new Set(queryKeywordMap.keys());

  // 3. keywords text
  const keywordIds = Array.from(new Set(Array.from(queryKeywordMap.values())));
  const keywordTextMap = new Map<number, string>();
  if (keywordIds.length > 0) {
    const { data: kws } = await sb.from('keywords').select('id, text').in('id', keywordIds);
    (kws ?? []).forEach((k: { id: number; text: string }) => {
      keywordTextMap.set(k.id, k.text);
    });
  }

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
        const tier = classify(sd.domain, selectedClientDomain);
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
