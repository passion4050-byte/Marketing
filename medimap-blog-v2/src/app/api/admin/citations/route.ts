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
 *
 * Round 163 (2026-08-17) — 성능·정합성 재수술.
 *   기존: mentions/queries/responses 원본 행을 supabase-js 로 8회 순차 왕복 후 JS 집계.
 *   실측 30일 = queries 3,949행 · responses 1,840행(source_domains 3.6MB)
 *   → 🔴 supabase-js 1,000행 캡으로 집계가 조용히 잘려 있었음 (느림 + 수치 오류).
 *   변경: citations_dashboard(p_days, p_tenant, p_lang) RPC 단일 왕복 —
 *   SQL 에서 조인·(일×키워드×엔진×도메인×URL) 단위 접기 후 jsonb 하나로 반환
 *   (jsonb 단일값 = PostgREST 행 캡 미적용). tier 분류(T1~T5)는 기존
 *   classifyDomain(JS) 유지 — cnt 가중치로 동일 집계. 응답 shape 무변경.
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { classifyDomain, loadClassifierSets, type Tier } from '@/lib/domain-classifier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function extractDomainFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** RPC sources 행: [date, tenant_id, keyword_id, engine, domain, final_url, is_self, cnt] */
type SourceRow = [string, number, number, string, string | null, string | null, boolean, number];

interface CitationsRpcPayload {
  sources: SourceRow[];
  keywords: Record<string, string>;
  mention_by_date: Array<[string, number]>;
  keyword_mentions: Array<[number, number]>;
}

export async function GET(req: Request) {
  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  }

  const url = new URL(req.url);
  const tenantIdParam = url.searchParams.get('tenantId');
  const tenantIdFilter = tenantIdParam ? Number(tenantIdParam) : null;
  // Round 75 — 기간 필터 (일수). 기본 30, 1~365 클램프.
  const daysParam = url.searchParams.get('days');
  const days = daysParam ? Math.max(1, Math.min(365, Number(daysParam) || 30)) : 30;

  // 언어 스코프 (keywords.lang)
  const scopeParam = url.searchParams.get('scope') || 'all';
  const kwLang =
    scopeParam === 'ko' ? 'ko' : scopeParam === 'en' ? 'en' : scopeParam === 'ja' ? 'ja' : scopeParam === 'zh' ? 'zh-Hant' : null;

  // Round 163 — 병렬 3콜: 분류 사전 + tenants(selector) + RPC(전 집계 원자료)
  const [classifierSets, tenantsRes, rpcRes] = await Promise.all([
    loadClassifierSets(),
    sb
      .from('tenants')
      .select('id, name, homepage, business_model, partner_slug, additional_domains')
      .order('id'),
    sb.rpc('citations_dashboard', {
      p_days: days,
      p_tenant: tenantIdFilter,
      p_lang: kwLang,
    }),
  ]);

  const tenantsAll = tenantsRes.data ?? [];
  const tenantsList = tenantsAll.map(
    (t: { id: number; name: string; homepage: string | null; business_model: string | null; partner_slug: string | null }) => ({
      id: t.id,
      name: t.name,
      is_self: t.business_model === 'self' || t.partner_slug === 'medimap-self',
    })
  );
  // Round 36 — tenant 별 자체 도메인 set (homepage + additional_domains 통합).
  const tenantDomainsMap = new Map<number, Set<string>>();
  tenantsAll.forEach(
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

  if (rpcRes.error) {
    return NextResponse.json({ ok: false, error: rpcRes.error.message }, { status: 500 });
  }
  const payload = (rpcRes.data ?? {
    sources: [],
    keywords: {},
    mention_by_date: [],
    keyword_mentions: [],
  }) as CitationsRpcPayload;

  // mention trend — RPC 일자 집계를 최근 days 축에 투영
  const mentionByDate = new Map<string, number>(
    (payload.mention_by_date ?? []).map(([d, cnt]) => [d, cnt])
  );
  const today = new Date();
  const mentionTrend: Array<{ date: string; count: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const ds = d.toISOString().slice(0, 10);
    mentionTrend.push({ date: ds.slice(5), count: mentionByDate.get(ds) ?? 0 });
  }

  // 집계 변수 (기존 구조 유지 — cnt 가중 누적)
  const tierCount = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 };
  const domainCount = new Map<string, { count: number; tier: Tier; keywords: Set<string> }>();
  const domainKwAgg = new Map<
    string,
    Map<string, { count: number; engines: Set<string>; urls: Set<string> }>
  >();
  const shareByDate = new Map<string, { total: number; t1: number }>();
  const keywordStats = new Map<
    number,
    { keyword: string; source_count: number; t1: number; t2: number; t5: number; mention_count: number }
  >();
  const ownCitationMap = new Map<
    string,
    { url: string; domain: string; keywords: Set<string>; engines: Set<string>; dates: string[]; count: number }
  >();
  const domainUrls = new Map<string, Set<string>>();
  const keywordTextMap = payload.keywords ?? {};

  (payload.sources ?? []).forEach((row) => {
    const [date, tenantId, keywordId, engine, domain, finalUrl, isSelfFlag, cnt] = row;
    const clientDomains =
      selectedClientDomains ?? (tenantId ? tenantDomainsMap.get(tenantId) ?? null : null);
    const kwText = keywordTextMap[String(keywordId)] ?? '?';

    if (!shareByDate.has(date)) shareByDate.set(date, { total: 0, t1: 0 });
    const dateBucket = shareByDate.get(date)!;

    if (!keywordStats.has(keywordId)) {
      keywordStats.set(keywordId, {
        keyword: kwText,
        source_count: 0,
        t1: 0,
        t2: 0,
        t5: 0,
        mention_count: 0,
      });
    }
    const kwBucket = keywordStats.get(keywordId)!;

    const tier = classifyDomain(domain ?? '', finalUrl, clientDomains, classifierSets);

    // Round 143h — T1 (자사) 인용 증거: DB 분류 OR 수집 시점 is_self 플래그
    const isSelf = tier === 'T1' || isSelfFlag === true;
    if (isSelf && finalUrl) {
      if (!ownCitationMap.has(finalUrl)) {
        ownCitationMap.set(finalUrl, {
          url: finalUrl,
          domain: domain ?? '',
          keywords: new Set(),
          engines: new Set(),
          dates: [],
          count: 0,
        });
      }
      const entry = ownCitationMap.get(finalUrl)!;
      entry.count += cnt;
      entry.keywords.add(kwText);
      if (engine && engine !== '?') entry.engines.add(engine);
      entry.dates.push(date);
    }

    // Round 32 phase D — 도메인별 실제 final_url 목록 (tier 무관, NOISE 포함 원본 동작 유지)
    if (domain && finalUrl) {
      if (!domainUrls.has(domain)) domainUrls.set(domain, new Set());
      domainUrls.get(domain)!.add(finalUrl);
    }

    if (tier === 'NOISE') return;
    tierCount[tier] += cnt;
    if (domain) {
      const existing = domainCount.get(domain);
      if (existing) {
        existing.count += cnt;
        existing.keywords.add(kwText);
      } else {
        domainCount.set(domain, { count: cnt, tier, keywords: new Set([kwText]) });
      }
      // Round 64 — 키워드별 인용 상세 (드릴다운)
      if (!domainKwAgg.has(domain)) domainKwAgg.set(domain, new Map());
      const kwMap = domainKwAgg.get(domain)!;
      if (!kwMap.has(kwText)) {
        kwMap.set(kwText, { count: 0, engines: new Set(), urls: new Set() });
      }
      const kwDetail = kwMap.get(kwText)!;
      kwDetail.count += cnt;
      if (engine && engine !== '?') kwDetail.engines.add(engine);
      if (finalUrl) kwDetail.urls.add(finalUrl);
    }
    dateBucket.total += cnt;
    if (tier === 'T1') dateBucket.t1 += cnt;
    kwBucket.source_count += cnt;
    if (tier === 'T1') kwBucket.t1 += cnt;
    if (tier === 'T2') kwBucket.t2 += cnt;
    if (tier === 'T5') kwBucket.t5 += cnt;
  });

  // mention 카운트 — 키워드별 (RPC 집계, 기존과 동일하게 responses 보유 키워드 버킷에만 반영)
  (payload.keyword_mentions ?? []).forEach(([kid, cnt]) => {
    const bucket = keywordStats.get(kid);
    if (bucket) bucket.mention_count += cnt;
  });

  const ownCitations = Array.from(ownCitationMap.values())
    .map((e) => ({
      url: e.url,
      domain: e.domain,
      keywords: Array.from(e.keywords),
      engines: Array.from(e.engines),
      dates: [...new Set(e.dates)].sort().reverse(),
      count: e.count,
    }))
    .sort((a, b) => b.count - a.count);

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
  for (let i = days - 1; i >= 0; i--) {
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
    // Round 143h — 자사(T1) 인용 증거 목록 (어떤 URL이 몇 번 인용됐는지)
    own_citations: ownCitations,
  });
}
