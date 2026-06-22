/**
 * Round 65~67 (2026-06-22) — 추이 분석 API.
 *
 * 경쟁사 페이지 상단 "추이 분석" 차트. 30일 일별 시계열.
 * 단일 series 구성: 메디맵(T1) + 선택 클라이언트(T2) + 경쟁사 도메인 top 6.
 *   - 탭 "경쟁사 점유 현황" : engine 필터 없음 (전체 엔진 합산)
 *   - 탭 "AI 엔진별 인용"   : ?engine=gemini 처럼 한 엔진으로 필터
 *
 * dataKey 의 '.' 충돌 회피 위해 v0..vN 키 + series 라벨 분리.
 *
 * Query: ?tenantId=4  ?keyword=라식  ?engine=gemini
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
  const engineFilter = url.searchParams.get('engine')?.trim().toLowerCase() || null;

  const DAYS = 30;
  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
  const classifierSets = await loadClassifierSets();

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
  const clientLabel = tenantIdFilter ? tenantNameMap.get(tenantIdFilter) ?? '클라이언트' : '클라이언트 자체';

  // Round 68 — 자사(메디맵 self) 선택 시 own 키워드로 경쟁 데이터 표시
  const selRow = tenantIdFilter
    ? (tenantsAll ?? []).find((t: { id: number }) => t.id === tenantIdFilter)
    : null;
  const isSelfTenant =
    !!selRow &&
    ((selRow as { business_model?: string }).business_model === 'self' ||
      (selRow as { partner_slug?: string }).partner_slug === 'medimap-self');

  // 키워드 (자사는 own, 그 외는 competitor_landscape)
  let kwQuery = sb.from('keywords').select('id, text, tenant_id').eq('is_active', true);
  kwQuery = isSelfTenant
    ? kwQuery.or('purpose.eq.own,purpose.is.null')
    : kwQuery.eq('purpose', 'competitor_landscape');
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

  // queries
  let queriesQuery = sb
    .from('queries')
    .select('id, tenant_id, keyword_id, engine')
    .neq('engine', 'stub')
    .gte('requested_at', cutoff);
  if (tenantIdFilter) queriesQuery = queriesQuery.eq('tenant_id', tenantIdFilter);
  const { data: queries } = await queriesQuery;
  const qMeta = new Map<number, { tenant: number; engine: string }>();
  const enginesAvailable = new Set<string>();
  (queries ?? []).forEach((q: { id: number; tenant_id: number; keyword_id: number; engine: string }) => {
    if (targetKwIds.has(q.keyword_id)) {
      const eng = (q.engine || '?').toLowerCase();
      qMeta.set(q.id, { tenant: q.tenant_id, engine: eng });
      if (eng !== '?') enginesAvailable.add(eng);
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
  const medimapSeries = zeros();
  const clientSeries = zeros();
  const byDomain = new Map<string, { total: number; series: number[] }>();
  const engineTotals = new Map<string, number>();
  let medimapTotal = 0;
  let clientTotal = 0;
  let competitorTotal = 0;

  filtered.forEach(
    (r: {
      query_id: number;
      source_domains: Array<{ domain: string; final_url: string | null }> | null;
      created_at: string;
    }) => {
      const meta = qMeta.get(r.query_id);
      if (!meta) return;
      if (engineFilter && meta.engine !== engineFilter) return; // 엔진 필터
      const di = idxOf.get(r.created_at.slice(0, 10));
      if (di == null) return;
      const clientDomains =
        selectedClientDomains ?? (meta.tenant ? tenantDomainsMap.get(meta.tenant) ?? null : null);

      (r.source_domains ?? []).forEach((sd) => {
        const tier: Tier = classifyDomain(sd.domain, sd.final_url ?? null, clientDomains, classifierSets);
        if (tier === 'NOISE') return;
        engineTotals.set(meta.engine, (engineTotals.get(meta.engine) ?? 0) + 1);

        if (tier === 'T1') {
          medimapSeries[di]++;
          medimapTotal++;
          return;
        }
        if (tier === 'T2') {
          clientSeries[di]++;
          clientTotal++;
          return;
        }
        // 경쟁사 T3/T4/T5
        competitorTotal++;
        if (sd.domain) {
          if (!byDomain.has(sd.domain)) byDomain.set(sd.domain, { total: 0, series: zeros() });
          const d = byDomain.get(sd.domain)!;
          d.total++;
          d.series[di]++;
        }
      });
    }
  );

  // series 빌드 — 메디맵 + (클라이언트) + 경쟁사 top6
  const topDomains = Array.from(byDomain.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6);
  const seriesLabels: string[] = ['메디맵 인용 현황'];
  const seriesData: number[][] = [medimapSeries];
  if (tenantIdFilter || clientTotal > 0) {
    seriesLabels.push(clientLabel);
    seriesData.push(clientSeries);
  }
  topDomains.forEach(([dom, v]) => {
    seriesLabels.push(dom);
    seriesData.push(v.series);
  });
  const seriesDim: Dim = {
    series: seriesLabels,
    data: labels.map((d, i) => {
      const row: Record<string, number | string> = { date: d };
      seriesData.forEach((s, si) => {
        row[`v${si}`] = s[i];
      });
      return row;
    }),
  };

  const engineOrder = ['claude', 'gemini', 'perplexity', 'openai'];
  const topEngine =
    engineTotals.size > 0
      ? Array.from(engineTotals.entries()).reduce((a, b) => (a[1] >= b[1] ? a : b))[0]
      : null;

  return NextResponse.json({
    ok: true,
    keywords: Array.from(allKeywordSet).sort(),
    engines: Array.from(enginesAvailable).sort(
      (a, b) => (engineOrder.indexOf(a) + 1 || 99) - (engineOrder.indexOf(b) + 1 || 99)
    ),
    dates: labels,
    series: seriesDim,
    summary: {
      medimap_total: medimapTotal,
      client_total: clientTotal,
      competitor_total: competitorTotal,
      top_engine: topEngine,
      top_competitor: topDomains.length ? topDomains[0][0] : null,
      client_label: clientLabel,
    },
  });
}
