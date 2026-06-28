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

  // Round 75 — 기간 필터 (일수). 기본 30, 1~365 클램프.
  const daysParam = url.searchParams.get('days');
  const DAYS = daysParam ? Math.max(1, Math.min(365, Number(daysParam) || 30)) : 30;
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

  // responses — Round 84 (2026-06-28) 함정 DC fix:
  //   기존: source_domains IS NOT NULL 인 response 만 가져옴 → Claude 의 모든 response 가
  //   source_domains=NULL 이라 차트에서 사라짐. Gemini 만 grounding metadata 로 URL 노출,
  //   Claude/OpenAI 는 응답 텍스트에 URL 안 줌. 결과: 화면에서 Claude/OpenAI = 0 표시.
  //   fix: NULL 도 포함해 가져온 후, NULL 인 경우 mentions 테이블의 brand 기반으로 fallback.
  const { data: respRows } = await sb
    .from('responses')
    .select('id, query_id, source_domains, created_at')
    .gte('created_at', cutoff);
  const filtered = (respRows ?? []).filter((r: { query_id: number }) => validQ.has(r.query_id));

  // 함정 DC fix — source_domains 가 없는 response 는 mentions 테이블로 fallback
  const responseIds = filtered.map((r: { id: number }) => r.id);
  const mentionMap = new Map<number, Array<{ brand: string; is_target: boolean; is_competitor: boolean }>>();
  if (responseIds.length > 0) {
    const { data: mRows } = await sb
      .from('mentions')
      .select('response_id, brand, is_target, is_competitor')
      .in('response_id', responseIds);
    (mRows ?? []).forEach((m: { response_id: number; brand: string; is_target: boolean; is_competitor: boolean }) => {
      if (!mentionMap.has(m.response_id)) mentionMap.set(m.response_id, []);
      mentionMap.get(m.response_id)!.push({
        brand: m.brand,
        is_target: m.is_target,
        is_competitor: m.is_competitor,
      });
    });
  }

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
      id: number;
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

      // Round 84 함정 DC fix — source_domains 있으면 도메인 분류, 없으면 mentions fallback
      const hasSourceDomains = Array.isArray(r.source_domains) && r.source_domains.length > 0;

      if (hasSourceDomains) {
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
      } else {
        // 함정 DC fallback — Claude/OpenAI 처럼 응답에 URL 없는 엔진은 mentions 로 카운트
        const ms = mentionMap.get(r.id) ?? [];
        ms.forEach((m) => {
          engineTotals.set(meta.engine, (engineTotals.get(meta.engine) ?? 0) + 1);
          if (m.is_target) {
            // is_target=true 는 BGN 같은 클라이언트(자기 자신) 기준이라 T2 클라이언트 시리즈로
            clientSeries[di]++;
            clientTotal++;
          } else if (m.is_competitor) {
            competitorTotal++;
            const domKey = m.brand.toLowerCase().replace(/\s+/g, '-');
            if (!byDomain.has(domKey)) byDomain.set(domKey, { total: 0, series: zeros() });
            const d = byDomain.get(domKey)!;
            d.total++;
            d.series[di]++;
          }
        });
      }
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

  // Round 85 (2026-06-28) — dropdown 에 항상 운영 3엔진 표시 (claude / gemini / openai).
  //   이전: enginesAvailable Set 기반 → 측정 데이터 없는 엔진은 dropdown 에 안 나옴 → 운영자가
  //   "OpenAI 측정 자체가 안 되나?" 오인. 사용자 요구: 3엔진 항상 선택 가능.
  //   Perplexity 는 사용자 정책상 제외 (Round 84 가이드).
  const REQUIRED_ENGINES = ['claude', 'gemini', 'openai'];
  const enginesUnion = new Set([...enginesAvailable, ...REQUIRED_ENGINES]);
  const engineOrder = ['claude', 'gemini', 'openai', 'perplexity'];
  const topEngine =
    engineTotals.size > 0
      ? Array.from(engineTotals.entries()).reduce((a, b) => (a[1] >= b[1] ? a : b))[0]
      : null;

  return NextResponse.json({
    ok: true,
    keywords: Array.from(allKeywordSet).sort(),
    engines: Array.from(enginesUnion).sort(
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
