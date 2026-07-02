/**
 * Round 44 (2026-05-31) — 월간 보고서 17년차 영업/마케터 관점 재구성.
 *
 * 클라이언트 (병·의원장/마케팅 담당자) 가 받는 자료.
 * "위서클에 돈 쓴 ROI 가 무엇인가" 답하는 게 핵심.
 *
 * 구성:
 *   1. Executive Summary — 한 줄 요약 + KPI 3개 + 성공 사례
 *   2. AI 검색 노출 변화 — T1 share 추이 + 비교
 *   3. 키워드 성과 — Top 5 잘함 / 보강 필요 Top 5
 *   4. 경쟁사 분석 — 직접 경쟁자 도메인 변화 + 신규 등장
 *   5. 콘텐츠 성과 — 발행 N편 + AI 인용 list
 *   6. 다음 달 액션 — 추천 콘텐츠 + 보강 키워드 + 영업 인사이트
 *
 * print:hidden + print:* 클래스로 PDF 저장 친화.
 */
import nextDynamic from 'next/dynamic';
import { ArrowDown, ArrowUp, Award, FileText, Target, TrendingUp, Users, Zap, AlertCircle } from 'lucide-react';
import { getServerClient } from '@/lib/supabase';
import { classifyDomain, loadClassifierSets } from '@/lib/domain-classifier';
import { PrintButton } from './_components/PrintButton';

// Round 57 (2026-05-31) — recharts 번들 (~100KB) lazy load. 첫 페인트 후 비동기 로드.
// Round 58 fix 2 (2026-06-01) — `export const dynamic` 과 변수명 충돌 → nextDynamic alias (함정 BR)
const ReportTrendChart = nextDynamic(
  () => import('./_components/ReportTrendChart').then((m) => m.ReportTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-40 items-center justify-center rounded border border-dashed border-border text-[11px] text-ink-muted">
        차트 로딩 중…
      </div>
    ),
  }
);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DailyPoint = { date: string; t1: number; total: number; t1_share: number };

async function fetchReportData(tenantIdStr: string) {
  const sb = getServerClient();
  if (!sb) return null;
  const tenantId = Number(tenantIdStr);
  if (!tenantId) return null;

  // 1. tenant
  const { data: tenant } = await sb
    .from('tenants')
    .select('id, name, business_model, domain_category, region, partner_slug, homepage, additional_domains')
    .eq('id', tenantId)
    .single();
  if (!tenant) return null;

  const now = new Date();
  const cutoffThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const cutoffPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const classifierSets = await loadClassifierSets();

  // selectedClientDomains (T2 매칭용)
  const clientDomains = new Set<string>();
  if (tenant.homepage) {
    try {
      const main = new URL(tenant.homepage).hostname.replace(/^www\./, '');
      clientDomains.add(main.toLowerCase());
    } catch { /* ignore */ }
  }
  (tenant.additional_domains ?? []).forEach((d: string) => {
    if (d) clientDomains.add(d.toLowerCase().replace(/^www\./, ''));
  });

  // 2. keywords
  const { data: kws } = await sb
    .from('keywords')
    .select('id, text, purpose, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);
  const ownKeywords = (kws ?? []).filter((k: { purpose: string }) => k.purpose === 'own');
  const competitorKeywords = (kws ?? []).filter((k: { purpose: string }) => k.purpose === 'competitor_landscape');

  // 3. queries + responses (이번 달 + 지난 달)
  const allKwIds = (kws ?? []).map((k: { id: number }) => k.id);
  if (allKwIds.length === 0) {
    return {
      tenant,
      hasData: false,
      ownKeywords,
      competitorKeywords,
      tierThis: { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 },
      tierPrev: { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 },
      totalThis: 0,
      totalPrev: 0,
      t1ShareThis: 0,
      t1SharePrev: 0,
      t1ShareDelta: 0,
      dailyTrend: [] as DailyPoint[],
      topKeywords: [] as Array<{ keyword: string; citations: number; t1: number; t5: number; win_rate: number }>,
      weakKeywords: [] as Array<{ keyword: string; citations: number; t1: number; t5: number; win_rate: number }>,
      competitorTop: [] as Array<{ domain: string; count: number; keywords: string[] }>,
      publishedCount: 0,
      publishedContents: [] as Array<{ id: number; title: string; slug: string | null; cover_image_url: string | null; channel: string | null; published_at: string | null; ai_cited: boolean }>,
      citedContentCount: 0,
      medimapCitedUrls: [] as string[],
    };
  }

  const { data: queriesThis } = await sb
    .from('queries')
    .select('id, keyword_id, requested_at')
    .in('keyword_id', allKwIds)
    .neq('engine', 'stub')
    .gte('requested_at', cutoffThisMonth);
  const { data: queriesPrev } = await sb
    .from('queries')
    .select('id, keyword_id, requested_at')
    .in('keyword_id', allKwIds)
    .neq('engine', 'stub')
    .gte('requested_at', cutoffPrev)
    .lt('requested_at', cutoffThisMonth);

  const queryThisToKw = new Map<number, number>();
  (queriesThis ?? []).forEach((q: { id: number; keyword_id: number }) => queryThisToKw.set(q.id, q.keyword_id));
  const queryPrevToKw = new Map<number, number>();
  (queriesPrev ?? []).forEach((q: { id: number; keyword_id: number }) => queryPrevToKw.set(q.id, q.keyword_id));

  const queryThisIds = Array.from(queryThisToKw.keys());
  const queryPrevIds = Array.from(queryPrevToKw.keys());

  const respsThis = queryThisIds.length > 0
    ? (await sb.from('responses').select('query_id, source_domains, created_at').in('query_id', queryThisIds)).data ?? []
    : [];
  const respsPrev = queryPrevIds.length > 0
    ? (await sb.from('responses').select('query_id, source_domains, created_at').in('query_id', queryPrevIds)).data ?? []
    : [];

  // 4. 집계 — tier 분포 + 일자별 + 키워드별
  const kwTextMap = new Map<number, string>();
  (kws ?? []).forEach((k: { id: number; text: string }) => kwTextMap.set(k.id, k.text));

  const tierCountThis = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 };
  const tierCountPrev = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 };
  const dailyMap = new Map<string, { t1: number; total: number }>();
  const kwStats = new Map<number, { citations: number; t1: number; t5: number }>();
  const competitorDomainMap = new Map<string, { count: number; keywords: Set<string> }>();
  const medimapUrls = new Set<string>();

  const processResp = (
    rows: Array<{ query_id: number; source_domains: Array<{ domain: string; final_url?: string | null }> | null; created_at: string }>,
    queryMap: Map<number, number>,
    tierCount: typeof tierCountThis,
    isThisMonth: boolean
  ) => {
    rows.forEach((r) => {
      const kwId = queryMap.get(r.query_id);
      if (!kwId) return;
      const dateKey = r.created_at.slice(5, 10);
      if (isThisMonth && !dailyMap.has(dateKey)) dailyMap.set(dateKey, { t1: 0, total: 0 });
      const bucket = isThisMonth ? dailyMap.get(dateKey)! : null;
      if (isThisMonth && !kwStats.has(kwId)) kwStats.set(kwId, { citations: 0, t1: 0, t5: 0 });
      const kwBucket = isThisMonth ? kwStats.get(kwId)! : null;

      (r.source_domains ?? []).forEach((sd) => {
        const tier = classifyDomain(sd.domain, sd.final_url ?? null, clientDomains, classifierSets);
        if (tier === 'NOISE') return;
        if (tier in tierCount) tierCount[tier as keyof typeof tierCount]++;
        if (bucket) {
          bucket.total++;
          if (tier === 'T1') bucket.t1++;
        }
        if (kwBucket) {
          kwBucket.citations++;
          if (tier === 'T1') kwBucket.t1++;
          if (tier === 'T5') kwBucket.t5++;
        }
        if (isThisMonth) {
          if (tier === 'T1' && sd.final_url) medimapUrls.add(sd.final_url);
          if (tier === 'T5' && sd.domain) {
            const d = sd.domain.toLowerCase();
            if (!competitorDomainMap.has(d)) {
              competitorDomainMap.set(d, { count: 0, keywords: new Set() });
            }
            const cd = competitorDomainMap.get(d)!;
            cd.count++;
            const kt = kwTextMap.get(kwId);
            if (kt) cd.keywords.add(kt);
          }
        }
      });
    });
  };
  processResp(respsThis, queryThisToKw, tierCountThis, true);
  processResp(respsPrev, queryPrevToKw, tierCountPrev, false);

  const totalThis = Object.values(tierCountThis).reduce((a, b) => a + b, 0);
  const totalPrev = Object.values(tierCountPrev).reduce((a, b) => a + b, 0);
  const t1ShareThis = totalThis > 0 ? tierCountThis.T1 / totalThis : 0;
  const t1SharePrev = totalPrev > 0 ? tierCountPrev.T1 / totalPrev : 0;
  const t1ShareDelta = t1ShareThis - t1SharePrev;

  // 일자별 fill (이번 달 1일부터 오늘까지)
  const dailyTrend: DailyPoint[] = [];
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    const k = d.toISOString().slice(5, 10);
    const b = dailyMap.get(k) ?? { t1: 0, total: 0 };
    dailyTrend.push({ date: k, t1: b.t1, total: b.total, t1_share: b.total > 0 ? b.t1 / b.total : 0 });
  }

  // 키워드 성과
  const kwPerformance = Array.from(kwStats.entries())
    .map(([id, v]) => ({
      keyword: kwTextMap.get(id) ?? `#${id}`,
      citations: v.citations,
      t1: v.t1,
      t5: v.t5,
      win_rate: v.citations > 0 ? v.t1 / v.citations : 0,
    }))
    .sort((a, b) => b.citations - a.citations);
  const topKeywords = kwPerformance.slice(0, 5);
  const weakKeywords = kwPerformance.filter((k) => k.citations > 0 && k.win_rate < 0.2).slice(0, 5);

  // 경쟁사
  const competitorTop = Array.from(competitorDomainMap.entries())
    .map(([domain, v]) => ({ domain, count: v.count, keywords: Array.from(v.keywords).slice(0, 3) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 발행 콘텐츠 + 효과 매칭
  const { data: contents } = await sb
    .from('generated_contents')
    .select('id, title, status, slug, cover_image_url, channel, created_at, published_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', cutoffThisMonth)
    .order('published_at', { ascending: false, nullsFirst: false });
  const publishedThis = (contents ?? []).filter((c: { status: string }) => c.status === 'published');

  // 각 글의 AI 인용 효과 매칭 — slug 가 medimapCitedUrls 에 포함되는지
  const citedSlugs = new Set<string>();
  Array.from(medimapUrls).forEach((url) => {
    // /blog/{slug} 또는 /with-partners/{cat}/{slug} 패턴
    const m = url.match(/\/(?:blog|with-partners\/[^/]+\/[^/]+)\/([^/?#]+)/);
    if (m) citedSlugs.add(m[1]);
  });
  const publishedWithEffect = publishedThis.map((c: { id: number; title: string; slug: string | null; cover_image_url: string | null; channel: string | null; published_at: string | null }) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    cover_image_url: c.cover_image_url,
    channel: c.channel,
    published_at: c.published_at,
    ai_cited: c.slug ? citedSlugs.has(c.slug) : false,
  }));
  const citedCount = publishedWithEffect.filter((c) => c.ai_cited).length;

  return {
    tenant,
    hasData: true,
    ownKeywords,
    competitorKeywords,
    tierThis: tierCountThis,
    tierPrev: tierCountPrev,
    totalThis,
    totalPrev,
    t1ShareThis,
    t1SharePrev,
    t1ShareDelta,
    dailyTrend,
    topKeywords,
    weakKeywords,
    competitorTop,
    publishedCount: publishedThis.length,
    publishedContents: publishedWithEffect,
    citedContentCount: citedCount,
    medimapCitedUrls: Array.from(medimapUrls).slice(0, 8),
  };
}

export default async function TenantReportPage({ params }: { params: { tenantId: string } }) {
  const data = await fetchReportData(params.tenantId);
  if (!data) {
    return <div className="p-10 text-center text-ink-muted">테넌트를 찾을 수 없습니다.</div>;
  }
  const { tenant } = data;
  const period = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  if (!data.hasData) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-10">
        <h1 className="text-xl font-bold text-ink">월간 보고서 — {tenant.name}</h1>
        <div className="mt-6 rounded-lg border border-border bg-surface-base p-8 text-center text-sm text-ink-muted">
          아직 측정 데이터 없음. <br />
          /admin/keywords 에서 키워드 등록 → 다음 cron 후 보고서 채워짐.
        </div>
      </div>
    );
  }

  const t1SharePct = Math.round(data.t1ShareThis * 100);
  const deltaPct = Math.round(data.t1ShareDelta * 100);
  const totalDelta = data.totalThis - data.totalPrev;
  const totalDeltaPct = data.totalPrev > 0
    ? Math.round((totalDelta / data.totalPrev) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10 print:px-0 print:py-0 print:max-w-none">
      {/* 인쇄용 안내 (화면만) */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-ink">월간 보고서 미리보기</h1>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            {tenant.name} · {period} · 클라이언트 전달용 PDF
          </p>
        </div>
        <PrintButton />
      </div>

      {/* 보고서 본문 */}
      <article className="card overflow-hidden print:border-0 print:shadow-none">
        {/* === 1. 표지/헤더 === */}
        <header className="bg-gradient-to-br from-brand-50 via-surface-base to-surface-base px-6 py-8 md:px-10 print:bg-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-700">
                WECIRCLE GEO · Monthly Report
              </div>
              <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">{tenant.name}</h1>
              <p className="mt-1 text-sm text-ink-muted">{period} · 월간 AI 검색 노출 성과 보고</p>
            </div>
            <div className="text-right text-[10px] text-ink-muted">
              <div>{tenant.domain_category ?? ''}</div>
              {tenant.region && <div className="mt-0.5">{tenant.region}</div>}
            </div>
          </div>
        </header>

        {/* === 2. Executive Summary === */}
        <section className="border-t border-border px-6 py-6 md:px-10">
          <h2 className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-700">
            <Award className="h-3 w-3" />
            EXECUTIVE SUMMARY
          </h2>
          <p className="text-base font-semibold leading-relaxed text-ink md:text-lg">
            {data.totalThis > 0 ? (
              <>
                이번 달 AI 검색 모니터링 결과,{' '}
                <span className="text-brand">{tenant.name}</span>의 키워드에서 총{' '}
                <span className="text-brand">{data.totalThis}건</span>의 AI 인용이 발생했습니다.{' '}
                {data.t1ShareDelta > 0.02 && (
                  <>위서클 도메인 점유율이 지난 달 대비 <span className="text-status-success">+{deltaPct}%p</span> 상승했습니다.</>
                )}
                {data.t1ShareDelta < -0.02 && (
                  <>위서클 점유율은 지난 달 대비 {deltaPct}%p 변동했습니다 — 콘텐츠 보강이 필요합니다.</>
                )}
                {Math.abs(data.t1ShareDelta) <= 0.02 && (
                  <>위서클 점유율은 안정적으로 유지되고 있습니다 ({t1SharePct}%).</>
                )}
              </>
            ) : (
              <>이번 달 측정 데이터 누적 중 — 다음 보고서에서 본격 추이 확인 가능</>
            )}
          </p>
        </section>

        {/* === 3. 핵심 KPI 3개 === */}
        <section className="grid grid-cols-1 gap-3 border-t border-border bg-surface-subtle px-6 py-5 md:grid-cols-3 md:px-10">
          <KpiBox
            icon={Zap}
            label="총 AI 인용 수"
            value={`${data.totalThis}`}
            unit="건"
            delta={totalDeltaPct}
            note={`전월 ${data.totalPrev}건`}
          />
          <KpiBox
            icon={TrendingUp}
            label="위서클 점유율"
            value={`${t1SharePct}`}
            unit="%"
            delta={deltaPct}
            isPercentDelta
            note={`전월 ${Math.round(data.t1SharePrev * 100)}%`}
            highlight
          />
          <KpiBox
            icon={FileText}
            label="발행 콘텐츠"
            value={`${data.publishedCount}`}
            unit="편"
            note="이번 달 위서클 발행"
          />
        </section>

        {/* === 4. AI 인용 추이 차트 === */}
        <section className="border-t border-border px-6 py-6 md:px-10">
          <h2 className="mb-1 text-base font-bold text-ink">📊 AI 검색 노출 추이</h2>
          <p className="mb-4 text-[12px] text-ink-muted">
            이번 달 일자별 인용 수 + 위서클 도메인 점유율 — SaaS 누적 효과
          </p>
          <ReportTrendChart data={data.dailyTrend} />
        </section>

        {/* === 5. 키워드 성과 === */}
        <section className="border-t border-border px-6 py-6 md:px-10">
          <h2 className="mb-1 text-base font-bold text-ink">🎯 키워드 성과 Top 5</h2>
          <p className="mb-4 text-[12px] text-ink-muted">
            가장 많이 인용된 키워드 — 강한 키워드 우선 콘텐츠 확장 권장
          </p>
          {data.topKeywords.length === 0 ? (
            <div className="text-[12px] text-ink-muted">이번 달 인용 데이터 없음</div>
          ) : (
            <table className="w-full text-[12px]">
              <thead className="bg-surface-subtle text-[10px] font-bold uppercase text-ink-muted">
                <tr>
                  <th className="px-3 py-2 text-left">키워드</th>
                  <th className="px-3 py-2 text-right">인용 수</th>
                  <th className="px-3 py-2 text-right">위서클</th>
                  <th className="px-3 py-2 text-right">경쟁사</th>
                  <th className="px-3 py-2 text-right">win rate</th>
                </tr>
              </thead>
              <tbody>
                {data.topKeywords.map((k) => (
                  <tr key={k.keyword} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold text-ink">{k.keyword}</td>
                    <td className="px-3 py-2 text-right">{k.citations}</td>
                    <td className="px-3 py-2 text-right text-brand">{k.t1}</td>
                    <td className="px-3 py-2 text-right text-status-warning">{k.t5}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      <span className={k.win_rate >= 0.3 ? 'text-status-success' : 'text-ink-muted'}>
                        {Math.round(k.win_rate * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {data.weakKeywords.length > 0 && (
            <div className="mt-4 rounded-lg border border-status-warning/30 bg-status-warningSoft/30 p-3">
              <h3 className="mb-1 flex items-center gap-1 text-[12px] font-bold text-status-warning">
                <AlertCircle className="h-3 w-3" />
                보강 필요 키워드 ({data.weakKeywords.length})
              </h3>
              <p className="mb-2 text-[10px] text-ink-muted">
                인용은 발생하지만 위서클 점유율 20% 미만 — 다음 달 콘텐츠 생성 우선순위
              </p>
              <div className="flex flex-wrap gap-1">
                {data.weakKeywords.map((k) => (
                  <span key={k.keyword} className="rounded bg-surface-base px-2 py-0.5 text-[11px]">
                    <strong>{k.keyword}</strong>{' '}
                    <span className="text-ink-muted">({Math.round(k.win_rate * 100)}%)</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* === 6. 경쟁사 분석 === */}
        <section className="border-t border-border px-6 py-6 md:px-10">
          <h2 className="mb-1 text-base font-bold text-ink">🔍 경쟁사 노출 현황</h2>
          <p className="mb-4 text-[12px] text-ink-muted">
            이번 달 동일 키워드에서 AI 가 인용한 외부 도메인 Top 5 — 시장 점유 추적
          </p>
          {data.competitorTop.length === 0 ? (
            <div className="text-[12px] text-ink-muted">경쟁사 인용 데이터 없음 — 시장 선점 중</div>
          ) : (
            <ul className="space-y-1.5 text-[12px]">
              {data.competitorTop.map((c, i) => (
                <li key={c.domain} className="flex items-center justify-between rounded border border-border bg-surface-subtle px-3 py-2">
                  <div>
                    <strong className="text-ink">{i + 1}. {c.domain}</strong>
                    <div className="mt-0.5 text-[10px] text-ink-muted">
                      인용 키워드: {c.keywords.join(', ')}
                    </div>
                  </div>
                  <span className="rounded bg-status-warning/15 px-2 py-0.5 text-[10px] font-bold text-status-warning">
                    {c.count}회
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* === 7. 발행 콘텐츠 + 효과 — 위서클에 돈 쓴 직접 결과물 === */}
        <section className="border-t border-border px-6 py-6 md:px-10">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-ink">📝 위서클 발행 콘텐츠 ({data.publishedCount}편)</h2>
            {data.citedContentCount > 0 && (
              <span className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand">
                AI 인용 활용: <strong>{data.citedContentCount}편</strong> / {data.publishedCount}편 ({Math.round((data.citedContentCount / Math.max(1, data.publishedCount)) * 100)}%)
              </span>
            )}
          </div>
          <p className="mb-4 text-[12px] text-ink-muted">
            이번 달 위서클이 {tenant.name}을 위해 발행한 콘텐츠 list — 각 글의 AI 검색 인용 활용 여부 표시.
            <strong className="ml-1 text-brand">AI 인용</strong> 표시 글이 클라이언트의 grounding 성과
          </p>
          {data.publishedContents.length === 0 ? (
            <div className="rounded border border-dashed border-border bg-surface-subtle p-4 text-center text-[12px] text-ink-muted">
              이번 달 발행 콘텐츠 없음 — 다음 cron 부터 누적
            </div>
          ) : (
            <div className="space-y-2">
              {data.publishedContents.slice(0, 8).map((c) => (
                <article
                  key={c.id}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-[12px] ${
                    c.ai_cited
                      ? 'border-brand/30 bg-brand-50/40'
                      : 'border-border bg-surface-base'
                  }`}
                >
                  {c.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.cover_image_url}
                      alt=""
                      className="h-12 w-16 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-surface-subtle text-ink-faint">
                      <FileText className="h-4 w-4" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-[13px] font-semibold text-ink">
                        {c.title}
                      </h3>
                      {c.ai_cited && (
                        <span className="shrink-0 rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">
                          ✓ AI 인용
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-ink-muted">
                      {c.channel && <span>{c.channel}</span>}
                      {c.published_at && (
                        <span>{new Date(c.published_at).toLocaleDateString('ko-KR')}</span>
                      )}
                      {c.slug && (
                        <a
                          href={`https://wecircle.co.kr/blog/${c.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-brand-700 underline decoration-dotted hover:text-brand"
                        >
                          /blog/{c.slug}
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
              {data.publishedContents.length > 8 && (
                <div className="text-center text-[10px] text-ink-faint">
                  외 {data.publishedContents.length - 8}편
                </div>
              )}
            </div>
          )}

          {data.publishedContents.length > 0 && (
            <div className="mt-4 rounded-lg bg-surface-subtle p-3 text-[11px] text-ink-soft">
              <strong className="text-ink">💡 ROI 인사이트:</strong>{' '}
              {data.citedContentCount > 0 ? (
                <>
                  발행 {data.publishedCount}편 중 <strong className="text-brand">{data.citedContentCount}편</strong>이 AI 검색 답변의 출처로 사용됨.{' '}
                  위서클 SaaS 의 직접 효과 = 잠재 환자가 AI 에 질문할 때 {tenant.name} 콘텐츠가 출처로 노출되는 것.
                </>
              ) : (
                <>
                  이번 달 발행 콘텐츠가 아직 AI grounding 에 진입 못함. 발행 후 1~3개월 누적 효과 — 다음 보고서에서 본격 확인 예상.
                </>
              )}
            </div>
          )}
        </section>

        {/* === 8. 위서클 인용 URL === */}
        {data.medimapCitedUrls.length > 0 && (
          <section className="border-t border-border bg-brand-50/30 px-6 py-6 md:px-10">
            <h2 className="mb-1 text-base font-bold text-ink">✨ AI 가 인용한 위서클 콘텐츠 ({data.medimapCitedUrls.length})</h2>
            <p className="mb-3 text-[12px] text-ink-muted">
              아래 URL 이 AI 검색 답변의 출처로 사용됨 — SaaS 가치의 직접 증거
            </p>
            <ul className="space-y-1 text-[11px]">
              {data.medimapCitedUrls.map((url) => (
                <li key={url} className="truncate">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-700 underline decoration-dotted hover:text-brand"
                  >
                    {decodeURIComponent(url).slice(0, 100)}
                    {url.length > 100 && '…'}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* === 8. 다음 달 액션 플랜 === */}
        <section className="border-t border-border px-6 py-6 md:px-10">
          <h2 className="mb-1 text-base font-bold text-ink">📋 다음 달 액션 플랜</h2>
          <p className="mb-4 text-[12px] text-ink-muted">
            데이터 기반 권장 — 위서클이 자동 실행 / 클라이언트 검토 후 확정
          </p>
          <ol className="space-y-2 text-[12px] text-ink-soft">
            <li className="flex gap-2">
              <span className="font-bold text-brand">1.</span>
              <div>
                <strong className="text-ink">보강 키워드 콘텐츠 ({Math.min(data.weakKeywords.length, 3)}편)</strong>
                {data.weakKeywords.length > 0 && (
                  <div className="mt-0.5 text-ink-muted">
                    {data.weakKeywords.slice(0, 3).map((k) => k.keyword).join(', ')} — 위서클 콘텐츠 가이드 v4 적용
                  </div>
                )}
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand">2.</span>
              <div>
                <strong className="text-ink">강한 키워드 확장 ({Math.min(data.topKeywords.length, 2)}편)</strong>
                {data.topKeywords.length > 0 && (
                  <div className="mt-0.5 text-ink-muted">
                    {data.topKeywords.slice(0, 2).map((k) => k.keyword).join(', ')} 의 변형 키워드 추가 측정
                  </div>
                )}
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand">3.</span>
              <div>
                <strong className="text-ink">경쟁사 학습 분석</strong>
                {data.competitorTop.length > 0 && (
                  <div className="mt-0.5 text-ink-muted">
                    Top 경쟁사 ({data.competitorTop[0].domain}) 의 콘텐츠 구조 학습 → 위서클 가이드 v5 반영
                  </div>
                )}
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-brand">4.</span>
              <div>
                <strong className="text-ink">월간 영업 인사이트</strong>
                <div className="mt-0.5 text-ink-muted">
                  {data.t1ShareDelta >= 0
                    ? `${tenant.name}의 AI 검색 노출이 ${deltaPct >= 0 ? '+' : ''}${deltaPct}%p 변화 — 다음 달 콘텐츠 발행 유지`
                    : `${tenant.name}의 위서클 점유율 ${deltaPct}%p 변동 — 콘텐츠 빈도 증가 권장`}
                </div>
              </div>
            </li>
          </ol>
        </section>

        {/* === Footer === */}
        <footer className="border-t border-border bg-surface-subtle px-6 py-4 text-center text-[10px] text-ink-muted md:px-10">
          <div className="font-semibold text-ink">WECIRCLE GEO/AEO SaaS</div>
          <div className="mt-0.5">
            AI 검색 시대 의료 마케팅 솔루션 · wecircle.co.kr
          </div>
          <div className="mt-2 text-[9px] text-ink-faint">
            이 보고서는 4대 AI 엔진 (Gemini · Claude · Perplexity · OpenAI) 의 grounding 데이터를 기반으로 자동 생성됩니다.
          </div>
        </footer>
      </article>
    </div>
  );
}

function KpiBox({
  icon: Icon,
  label,
  value,
  unit,
  delta,
  isPercentDelta,
  note,
  highlight,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  unit?: string;
  delta?: number;
  isPercentDelta?: boolean;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-brand bg-brand-50/30' : 'border-border bg-surface-base'}`}>
      <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-ink-muted">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${highlight ? 'text-brand' : 'text-ink'}`}>{value}</span>
        {unit && <span className="text-sm font-semibold text-ink-muted">{unit}</span>}
      </div>
      {delta !== undefined && delta !== 0 && (
        <div className={`mt-1 flex items-center gap-0.5 text-[10px] font-semibold ${delta > 0 ? 'text-status-success' : 'text-status-danger'}`}>
          {delta > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
          {delta > 0 ? '+' : ''}{delta}{isPercentDelta ? '%p' : '%'}
        </div>
      )}
      {note && <div className="mt-0.5 text-[10px] text-ink-faint">{note}</div>}
    </div>
  );
}
