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

// 🔴 Round 138+ — PostgREST 기본 1000행 한도 우회. 30일 queries/responses 는 수천 건이라
//   단일 select 면 오래된 1000건만 와서 최근 날짜(07-02 이후)가 통째로 잘림(추이차트 하드컷 버그).
//   range 페이지네이션으로 전량 로드.
async function fetchAll<T>(
  make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let from = 0; from < 200000; from += PAGE) {
    const { data, error } = await make(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

export async function GET(req: Request) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const url = new URL(req.url);
  const tenantIdParam = url.searchParams.get('tenantId');
  const tenantIdFilter = tenantIdParam ? Number(tenantIdParam) : null;
  const keywordFilter = url.searchParams.get('keyword')?.trim() || null;
  const engineFilter = url.searchParams.get('engine')?.trim().toLowerCase() || null;
  // Round 86 (2026-06-28) — multi-engine breakdown 모드.
  //   breakdown=engine 면 메디맵·클라이언트 시리즈를 엔진별 (Gemini/Claude/OpenAI) 로 분리.
  //   사용자 요구: "한눈에 보고 싶어, 엔진별 비교" — 한 차트에 동시 표시.
  const breakdownEngine = url.searchParams.get('breakdown') === 'engine';

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
  // Round 138+ (A 수정) — 기존엔 비자사 차트가 competitor_landscape(3일 주기 측정)만 집계 →
  //   그 사이 날짜가 0으로 비어 "07-04부터 안 보임" 발생. own(자사 브랜드) 키워드는 매일 측정되고
  //   그 응답에도 경쟁사 출처 인용이 담기므로 함께 포함해 차트를 일별로 채운다.
  kwQuery = isSelfTenant
    ? kwQuery.or('purpose.eq.own,purpose.is.null')
    : kwQuery.or('purpose.eq.competitor_landscape,purpose.eq.own,purpose.is.null');
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

  // queries — 페이지네이션(1000행 한도 우회)
  const queries = await fetchAll<{ id: number; tenant_id: number; keyword_id: number; engine: string }>(
    (from, to) => {
      let q = sb
        .from('queries')
        .select('id, tenant_id, keyword_id, engine')
        .neq('engine', 'stub')
        .gte('requested_at', cutoff)
        .order('id')
        .range(from, to);
      if (tenantIdFilter) q = q.eq('tenant_id', tenantIdFilter);
      return q;
    }
  );
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
  const respRows = await fetchAll<{
    id: number;
    query_id: number;
    source_domains: Array<{ domain: string; final_url: string | null }> | null;
    created_at: string;
  }>((from, to) =>
    sb
      .from('responses')
      .select('id, query_id, source_domains, created_at')
      .gte('created_at', cutoff)
      .order('id')
      .range(from, to)
  );
  const filtered = respRows.filter((r: { query_id: number }) => validQ.has(r.query_id));

  // 함정 DC fix — source_domains 가 없는 response 는 mentions 테이블로 fallback
  const responseIds = filtered.map((r: { id: number }) => r.id);
  const mentionMap = new Map<number, Array<{ brand: string; is_target: boolean; is_competitor: boolean }>>();
  // responseIds 가 수천 개일 수 있어 .in() 을 200개씩 청크로 (URL 길이 + 1000행 한도 회피)
  for (let i = 0; i < responseIds.length; i += 200) {
    const chunk = responseIds.slice(i, i + 200);
    const { data: mRows } = await sb
      .from('mentions')
      .select('response_id, brand, is_target, is_competitor')
      .in('response_id', chunk);
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

  // Round 86 — 엔진별 메디맵/클라이언트 시리즈 (breakdownEngine 모드)
  const REQUIRED_ENGINES_LIST = ['gemini', 'claude', 'openai'];
  const medimapByEngine = new Map<string, number[]>(
    REQUIRED_ENGINES_LIST.map((e) => [e, zeros()])
  );
  const clientByEngine = new Map<string, number[]>(
    REQUIRED_ENGINES_LIST.map((e) => [e, zeros()])
  );
  const competitorByEngine = new Map<string, number[]>(
    REQUIRED_ENGINES_LIST.map((e) => [e, zeros()])
  );

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
            // Round 86 — 엔진별 누적
            const arr = medimapByEngine.get(meta.engine);
            if (arr) arr[di]++;
            return;
          }
          if (tier === 'T2') {
            clientSeries[di]++;
            clientTotal++;
            const arr = clientByEngine.get(meta.engine);
            if (arr) arr[di]++;
            return;
          }
          // 경쟁사 T3/T4/T5
          competitorTotal++;
          const cArr = competitorByEngine.get(meta.engine);
          if (cArr) cArr[di]++;
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
            clientSeries[di]++;
            clientTotal++;
            const arr = clientByEngine.get(meta.engine);
            if (arr) arr[di]++;
          } else if (m.is_competitor) {
            competitorTotal++;
            const cArr = competitorByEngine.get(meta.engine);
            if (cArr) cArr[di]++;
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

  // Round 86 — breakdownEngine 모드: 엔진별 라인으로 series 빌드 (도메인 라인 생략).
  if (breakdownEngine) {
    const engineLabel: Record<string, string> = {
      gemini: 'Gemini', claude: 'Claude', openai: 'ChatGPT',
    };
    const breakdownLabels: string[] = [];
    const breakdownData: number[][] = [];
    REQUIRED_ENGINES_LIST.forEach((eng) => {
      const mArr = medimapByEngine.get(eng);
      if (mArr && mArr.some((v) => v > 0)) {
        breakdownLabels.push(`메디맵 · ${engineLabel[eng]}`);
        breakdownData.push(mArr);
      }
    });
    REQUIRED_ENGINES_LIST.forEach((eng) => {
      const cArr = clientByEngine.get(eng);
      if (cArr && cArr.some((v) => v > 0) && tenantIdFilter) {
        breakdownLabels.push(`${clientLabel} · ${engineLabel[eng]}`);
        breakdownData.push(cArr);
      }
    });
    REQUIRED_ENGINES_LIST.forEach((eng) => {
      const cArr = competitorByEngine.get(eng);
      if (cArr && cArr.some((v) => v > 0)) {
        breakdownLabels.push(`경쟁사 합산 · ${engineLabel[eng]}`);
        breakdownData.push(cArr);
      }
    });
    // 데이터 없어도 최소 메디맵 3엔진 라인은 표시 (0 라인이라도 dropdown 가시화)
    if (breakdownLabels.length === 0) {
      REQUIRED_ENGINES_LIST.forEach((eng) => {
        breakdownLabels.push(`메디맵 · ${engineLabel[eng]}`);
        breakdownData.push(zeros());
      });
    }
    const breakdownSeriesDim: Dim = {
      series: breakdownLabels,
      data: labels.map((d, i) => {
        const row: Record<string, number | string> = { date: d };
        breakdownData.forEach((s, si) => { row[`v${si}`] = s[i]; });
        return row;
      }),
    };
    const enginesUnion = new Set([...enginesAvailable, ...REQUIRED_ENGINES_LIST]);
    return NextResponse.json({
      ok: true,
      keywords: Array.from(allKeywordSet).sort(),
      engines: Array.from(enginesUnion).sort(),
      dates: labels,
      series: breakdownSeriesDim,
      summary: {
        medimap_total: medimapTotal,
        client_total: clientTotal,
        competitor_total: competitorTotal,
        top_engine:
          engineTotals.size > 0
            ? Array.from(engineTotals.entries()).reduce((a, b) => (a[1] >= b[1] ? a : b))[0]
            : null,
        top_competitor: null,
        client_label: clientLabel,
        breakdown: 'engine',
      },
    });
  }

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
