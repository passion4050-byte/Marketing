/**
 * Round 65 (2026-06-22) — 추이 분석 API. / Round 66 — 우리(자사) 라인 + 엔진별 우리·경쟁사.
 *
 * 경쟁사 페이지 상단 "추이 분석" 차트용 시계열. 키워드 필터(선택) + 30일 일별.
 *   - byEngine     : 엔진마다 2개 시리즈 — "{engine}·우리"(T1+T2) / "{engine}·경쟁사"(T3~T5)
 *   - byCompetitor : "우리 점유"(T1+T2) + 경쟁사 도메인별 top 6  (= 경쟁사 점유 현황)
 *   - byClient     : 클라이언트(tenant)별 추이 top 6
 *
 * dataKey 에 '.' 이 들어가면 recharts 가 nested path 로 해석하므로 v0..vN 키 + series 라벨 분리.
 *
 * Query: ?tenantId=4  ?keyword=라식
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { classifyDomain, loadClassifierSets, type Tier } from '@/lib/domain-classifier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

type Dim = { series: string[]; data: Array<Record<string, number | string>> };

export async function GET(req: Request) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const url = new URL(req.url);
  const tenantIdParam = url.searchParams.get('tenantId');
  const tenantIdFilter = tenantIdParam ? Number(tenantIdParam) : null;
  const keywordFilter = url.searchParams.get('keyword')?.trim() || null;

  const DAYS = 30;
  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
  const classifierSets = await loadClassifierSets();

  // 날짜 축
  const today = new Date();
  const labels: string[] = [];
  const idxOf = new Map<string, number>();
  for (let i = DAYS - 1; i >= 0; i--) {
    const ds = new Date(today.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    idxOf.set(ds, labels.length);
    labels.push(ds.slice(5));
  }
  const zeros = () => new Array(DAYS).fill(0) as number[];

  // tenants
  const { data: tenantsAll } = await sb
    .from('tenants')
    .select('id, name, homepage, business_model, partner_slug, additional_domains')
    .order('id');
  const tenantNameMap = new Map<number, string>();
  const tenantDomainsMap = new Map<number, Set<string>>();
  (tenantsAll ?? []).forEach(
    (t: { id: number; name: string; homepage: string | null; additional_domains: string[] | null }) => {
      tenantNameMap.set(t.id, t.name);
      const set = new Set<string>();
      const main = extractDomain(t.homepage);
      if (main) set.add(main.toLowerCase());
      (t.additional_domains ?? []).forEach((d) => {
        if (d) set.add(d.toLowerCase().replace(/^www\./, ''));
      });
      if (set.size > 0) tenantDomainsMap.set(t.id, set);
    }
  );
  const selectedClientDomains = tenantIdFilter ? tenantDomainsMap.get(tenantIdFilter) ?? null : null;

  // landscape 키워드
  let kwQuery = sb
    .from('keywords')
    .select('id, text, tenant_id')
    .eq('purpose', 'competitor_landscape')
    .eq('is_active', true);
  if (tenantIdFilter) kwQuery = kwQuery.eq('tenant_id', tenantIdFilter);
  const { data: landscapeKeywords } = await kwQuery;
  const kwTextById = new Map<number, string>();
  const allKeywordSet = new Set<string>();
  (landscapeKeywords ?? []).forEach((k: { id: number; text: string }) => {
    kwTextById.set(k.id, k.text);
    allKeywordSet.add(k.text);
  });
  const targetKwIds = new Set<number>();
  kwTextById.forEach((text, id) => {
    if (!keywordFilter || text === keywordFilter) targetKwIds.add(id);
  });

  // queries (engine 포함)
  let queriesQuery = sb
    .from('queries')
    .select('id, tenant_id, keyword_id, engine')
    .neq('engine', 'stub')
    .gte('requested_at', cutoff);
  if (tenantIdFilter) queriesQuery = queriesQuery.eq('tenant_id', tenantIdFilter);
  const { data: queries } = await queriesQuery;
  const qMeta = new Map<number, { tenant: number; engine: string }>();
  (queries ?? []).forEach((q: { id: number; tenant_id: number; keyword_id: number; engine: string }) => {
    if (targetKwIds.has(q.keyword_id)) {
      qMeta.set(q.id, { tenant: q.tenant_id, engine: (q.engine || '?').toLowerCase() });
    }
  });
  const validQ = new Set(qMeta.keys());

  // responses
  const { data: respRows } = await sb
    .from('responses')
    .select('query_id, source_domains, created_at')
    .gte('created_at', cutoff)
    .not('source_domains', 'is', null);
  const filtered = (respRows ?? []).filter((r: { query_id: number }) => validQ.has(r.query_id));

  // 누적기
  const compByEngine = new Map<string, number[]>(); // 엔진별 경쟁사 인용
  const ownByEngine = new Map<string, number[]>(); // 엔진별 우리(T1+T2) 인용
  const byDomain = new Map<string, { total: number; series: number[] }>();
  const byClient = new Map<number, { total: number; series: number[] }>();
  const ownSeries = zeros(); // 우리 점유 합계 (T1+T2)
  let ownTotal = 0;
  let compTotal = 0;

  filtered.forEach(
    (r: {
      query_id: number;
      source_domains: Array<{ domain: string; final_url: string | null }> | null;
      created_at: string;
    }) => {
      const meta = qMeta.get(r.query_id);
      if (!meta) return;
      const di = idxOf.get(r.created_at.slice(0, 10));
      if (di == null) return;
      const clientDomains =
        selectedClientDomains ?? (meta.tenant ? tenantDomainsMap.get(meta.tenant) ?? null : null);

      (r.source_domains ?? []).forEach((sd) => {
        const tier: Tier = classifyDomain(sd.domain, sd.final_url ?? null, clientDomains, classifierSets);
        if (tier === 'NOISE') return;

        // 우리(메디맵 T1 + 클라이언트 자체 T2)
        if (tier === 'T1' || tier === 'T2') {
          ownSeries[di]++;
          ownTotal++;
          if (!ownByEngine.has(meta.engine)) ownByEngine.set(meta.engine, zeros());
          ownByEngine.get(meta.engine)![di]++;
          return;
        }

        // 경쟁사 (T3/T4/T5)
        compTotal++;
        if (!compByEngine.has(meta.engine)) compByEngine.set(meta.engine, zeros());
        compByEngine.get(meta.engine)![di]++;
        if (sd.domain) {
          if (!byDomain.has(sd.domain)) byDomain.set(sd.domain, { total: 0, series: zeros() });
          const d = byDomain.get(sd.domain)!;
          d.total++;
          d.series[di]++;
        }
        if (meta.tenant != null) {
          if (!byClient.has(meta.tenant)) byClient.set(meta.tenant, { total: 0, series: zeros() });
          const c = byClient.get(meta.tenant)!;
          c.total++;
          c.series[di]++;
        }
      });
    }
  );

  const buildDim = (labelsArr: string[], seriesArr: number[][]): Dim => ({
    series: labelsArr,
    data: labels.map((d, i) => {
      const row: Record<string, number | string> = { date: d };
      seriesArr.forEach((s, si) => {
        row[`v${si}`] = s[i];
      });
      return row;
    }),
  });

  // 엔진: 우리 + 경쟁사 (엔진당 2 시리즈)
  const engineOrder = ['claude', 'gemini', 'perplexity', 'openai'];
  const enginesAll = Array.from(new Set([...ownByEngine.keys(), ...compByEngine.keys()])).sort(
    (a, b) => (engineOrder.indexOf(a) + 1 || 99) - (engineOrder.indexOf(b) + 1 || 99)
  );
  const engineLabels: string[] = [];
  const engineSeries: number[][] = [];
  enginesAll.forEach((e) => {
    engineLabels.push(`${e}·우리`);
    engineSeries.push(ownByEngine.get(e) ?? zeros());
    engineLabels.push(`${e}·경쟁사`);
    engineSeries.push(compByEngine.get(e) ?? zeros());
  });
  const engineDim = buildDim(engineLabels, engineSeries);

  // 경쟁사 점유 현황 = 우리 점유 + 경쟁사 도메인 top 6
  const topDomains = Array.from(byDomain.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6);
  const competitorDim = buildDim(
    ['우리 점유', ...topDomains.map(([dom]) => dom)],
    [ownSeries, ...topDomains.map(([, v]) => v.series)]
  );

  // 클라이언트별 top 6
  const topClients = Array.from(byClient.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6);
  const clientDim = buildDim(
    topClients.map(([id]) => tenantNameMap.get(id) ?? `#${id}`),
    topClients.map(([, v]) => v.series)
  );

  // 요약
  const engineTotals = enginesAll.map((e) => ({
    engine: e,
    total: (ownByEngine.get(e) ?? []).reduce((x, y) => x + y, 0) + (compByEngine.get(e) ?? []).reduce((x, y) => x + y, 0),
  }));
  const topEngine = engineTotals.length
    ? engineTotals.reduce((a, b) => (a.total >= b.total ? a : b)).engine
    : null;

  return NextResponse.json({
    ok: true,
    keywords: Array.from(allKeywordSet).sort(),
    dates: labels,
    byEngine: engineDim,
    byCompetitor: competitorDim,
    byClient: clientDim,
    summary: {
      total: compTotal,
      own_total: ownTotal,
      top_engine: topEngine,
      top_competitor: topDomains.length ? topDomains[0][0] : null,
    },
  });
}
