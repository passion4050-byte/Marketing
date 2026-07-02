/**
 * Round 30 (2026-05-30) — 어드민 운영 대시보드.
 *
 * 옛 코드는 mock data (adminTenants, contentQueue, citationEvents, costDaily) 사용.
 * 이번 라운드에서 server component 로 전환 + Supabase 실데이터 직접 query.
 *
 * 표시 데이터:
 *   - 활성 클라이언트 = 자사 제외 tenants 카운트
 *   - 검수 대기 = generated_contents WHERE status IN ('draft', 'pending')
 *   - 오늘 LLM 비용 = llm_call_logs 합산 (미수집 시 — 표시)
 *   - 24h AI 인용 = citations 미구현 → "Round 31 활성 예정" placeholder
 *   - 최근 검수 대기 Top 3 = draft/pending top 3 + tenant 이름 (별도 fetch — fix 12 패턴)
 *   - 최근 AI 인용 = 미구현 → 빈 상태 메시지
 */
import nextDynamic from 'next/dynamic';
import { ArrowUpRight, ClipboardCheck, DollarSign, Users, Zap, FileText, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { getServerClient } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { ActionRecommendations } from '@/components/admin/ActionRecommendations';
import { ContentCompetitiveness } from '@/components/admin/ContentCompetitiveness';
import { MarketShareDiagnosis } from '@/components/admin/MarketShareDiagnosis';
import { PartnerLeaderboard } from '@/components/admin/PartnerLeaderboard';
import { CrawlerLogWidget } from '@/components/admin/CrawlerLogWidget';
import { KakaoFunnelWidget } from '@/components/admin/KakaoFunnelWidget';
import { ContentPatternStats } from '@/components/admin/ContentPatternStats';
import { DashboardChartsTabbed } from '@/components/admin/DashboardChartsTabbed';
import type {
  TierTrendPoint,
  ClientRankingItem,
  KeywordGroundingItem,
  NewDomainItem,
} from '@/components/admin/DashboardCharts';
import { DashboardFilters } from '@/components/admin/DashboardFilters';

// Round 57 (2026-05-31) — recharts 번들 lazy load. KPI 카드는 즉시, 차트는 비동기.
const DashboardCharts = nextDynamic(
  () => import('@/components/admin/DashboardCharts').then((m) => m.DashboardCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card flex h-64 items-center justify-center text-[12px] text-ink-muted">차트 로딩 중…</div>
        <div className="card flex h-64 items-center justify-center text-[12px] text-ink-muted">차트 로딩 중…</div>
      </div>
    ),
  }
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type DraftRow = {
  id: number;
  tenant_id: number;
  title: string | null;
  keyword_text: string | null;
  llm_provider: string | null;
  compliance_status: string | null;
};

type TenantRow = { id: number; name: string | null };

async function fetchDashboardData(opts: {
  periodDays: number;
  tenantId?: number | null;
  fromDate?: string;
  toDate?: string;
} = { periodDays: 30 }) {
  const { tenantId = null, fromDate, toDate } = opts;
  let { periodDays } = opts;
  // 사용자 지정 기간 — fromDate/toDate 가 있으면 우선
  let useCustomRange = false;
  let customCutoff: string | null = null;
  let customEnd: string | null = null;
  if (fromDate && toDate) {
    useCustomRange = true;
    customCutoff = new Date(`${fromDate}T00:00:00Z`).toISOString();
    customEnd = new Date(`${toDate}T23:59:59Z`).toISOString();
    // periodDays 추정 — 차트 fill 용
    const ms = new Date(customEnd).getTime() - new Date(customCutoff).getTime();
    periodDays = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  }

  const sb = getServerClient();
  if (!sb) {
    return {
      activeTenants: 0,
      pendingQueue: 0,
      todayCost: 0,
      yesterdayCost: 0,
      cost14d: 0,
      citations24h: 0,
      recentDrafts: [] as Array<DraftRow & { tenant_name: string }>,
      recentCitations: [] as Array<{
        id: string;
        query: string;
        tenantName: string;
        engine: string;
        citedAt: string;
      }>,
      tierTrend: [] as TierTrendPoint[],
      clientRanking: [] as ClientRankingItem[],
      keywordGrounding: [] as KeywordGroundingItem[],
      newDomains: [] as NewDomainItem[],
      // Round 86/87/88 — null branch 누락 필드 보강 (Vercel TypeScript build fix)
      citations30d: 0,
      publishedThisMonth: 0,
      lastCronAt: null as string | null,
      topContents: [] as Array<{
        id: number; title: string; slug: string;
        tenantName: string; tenantId: number; publishedAt: string;
        keyword: string; mentionsForKeyword: number;
        isPartner: boolean; partnerCategory: string | null;
      }>,
      domainDistribution: [] as Array<{ domain: string; citations: number; isOwn?: boolean; isCompetitor?: boolean }>,
      medimapDomainCitations: 0,
      totalDomainCitations: 0,
      structureStats: {
        totalCount: 0, avgBodyLen: 0, avgH2: 0, avgTable: 0, avgList: 0, avgImg: 0,
        faqSchemaPct: 0, topPattern: null as null | {
          avgH2: number; avgTable: number; avgList: number; avgImg: number;
          avgBodyLen: number; faqSchemaPct: number;
        },
      },
      error: 'supabase not configured',
    };
  }

  // 1. 활성 클라이언트 — 자사 제외 tenants 카운트
  const { count: clientCount } = await sb
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .neq('business_model', 'self')
    .neq('partner_slug', 'medimap-self');

  // 2. 검수 대기 — draft + pending COUNT
  const { count: pendingCount } = await sb
    .from('generated_contents')
    .select('id', { count: 'exact', head: true })
    .in('status', ['draft', 'pending']);

  // 3. LLM 비용 — llm_call_logs 합산 (오늘·어제·최근 14일 3-tier)
  // Round 116 Phase 5 (2026-07-02): 오늘 값만 노출 시 cron 미실행 시간대 $0.00 착시.
  //   → 어제 + 14일 누적 병기해 실 미터링 상태를 항상 유의미하게 표시.
  let todayCost = 0;
  let yesterdayCost = 0;
  let cost14d = 0;
  let costError: string | null = null;
  try {
    const since14dIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: costRows, error: costErr } = await sb
      .from('llm_call_logs')
      .select('cost_usd, called_at')
      .gte('called_at', since14dIso)
      .limit(20000);
    if (costErr) {
      costError = costErr.message;
    } else {
      // KST 기준 오늘/어제 판정 (UTC+9)
      const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
      const todayKst = kstNow.toISOString().slice(0, 10);
      const yestKst = new Date(kstNow.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      for (const r of (costRows ?? []) as { cost_usd: number | null; called_at: string }[]) {
        const usd = r.cost_usd ?? 0;
        cost14d += usd;
        const kstDay = new Date(new Date(r.called_at).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
        if (kstDay === todayKst) todayCost += usd;
        else if (kstDay === yestKst) yesterdayCost += usd;
      }
    }
  } catch (e) {
    costError = e instanceof Error ? e.message : String(e);
  }

  // Round 31 (2026-05-30): mentions 테이블에서 24h 인용 카운트.
  // measure-ai-mentions.yml cron 이 매일 07:00 KST 에 4 엔진 호출 → mentions INSERT.
  // is_target=true 인 mention 만 카운트 (위서클 또는 자사 tenant 가 직접 mentioned).
  let citations24h = 0;
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: mentionCount } = await sb
      .from('mentions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yesterday)
      .eq('is_target', true);
    citations24h = mentionCount ?? 0;
  } catch {
    // mentions 테이블 query 실패 시 0 표시 (graceful)
  }

  // Round 86 (2026-06-28) — KPI 확장: 30일 누적 멘션 + 이번 달 발행 + cron 헬스
  let citations30d = 0;
  let publishedThisMonth = 0;
  let lastCronAt: string | null = null;
  try {
    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: c30 } = await sb
      .from('mentions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cutoff30)
      .eq('is_target', true);
    citations30d = c30 ?? 0;

    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const { count: pubM } = await sb
      .from('generated_contents')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('channel', 'blog_html')
      .gte('published_at', startOfMonth.toISOString());
    publishedThisMonth = pubM ?? 0;

    // 측정 cron 마지막 성공 시각 (운영자 헬스 체크)
    const { data: lastQ } = await sb
      .from('queries')
      .select('requested_at')
      .neq('engine', 'stub')
      .order('requested_at', { ascending: false })
      .limit(1);
    lastCronAt = (lastQ?.[0] as { requested_at?: string })?.requested_at ?? null;
  } catch {
    // graceful
  }

  // 5. 최근 검수 대기 Top 3 — draft/pending top 3 + tenant 이름 (fix 12 패턴: 별도 fetch)
  const { data: draftRows } = await sb
    .from('generated_contents')
    .select('id, tenant_id, title, keyword_text, llm_provider, compliance_status')
    .in('status', ['draft', 'pending'])
    .order('created_at', { ascending: false })
    .limit(3);

  const tenantIds = Array.from(
    new Set((draftRows ?? []).map((r: DraftRow) => r.tenant_id).filter((x) => x != null))
  );
  const tenantMap = new Map<number, string>();
  if (tenantIds.length > 0) {
    const { data: tenantsData } = await sb
      .from('tenants')
      .select('id, name')
      .in('id', tenantIds);
    (tenantsData ?? []).forEach((t: TenantRow) => {
      tenantMap.set(t.id, t.name ?? '(unknown)');
    });
  }

  const recentDrafts = (draftRows ?? []).map((r: DraftRow) => ({
    ...r,
    tenant_name: tenantMap.get(r.tenant_id) ?? '(unknown)',
  }));

  // Round 31 (2026-05-30): 최근 AI 인용 (24h) 실데이터.
  // mentions + responses + queries JOIN — engine, prompt, created_at + tenant_name.
  type RecentCitation = {
    id: string;
    query: string;
    tenantName: string;
    engine: string;
    citedAt: string;
  };
  let recentCitations: RecentCitation[] = [];
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // mentions → responses → queries 별도 fetch (fix 12 패턴)
    const { data: mentions } = await sb
      .from('mentions')
      .select('id, response_id, tenant_id, brand, created_at')
      .gte('created_at', yesterday)
      .eq('is_target', true)
      .order('created_at', { ascending: false })
      .limit(3);
    if (mentions && mentions.length > 0) {
      const respIds = Array.from(new Set(mentions.map((m: { response_id: number }) => m.response_id)));
      const { data: responses } = await sb
        .from('responses')
        .select('id, query_id')
        .in('id', respIds);
      const respMap = new Map<number, number>(
        (responses ?? []).map((r: { id: number; query_id: number }) => [r.id, r.query_id])
      );
      const queryIds = Array.from(new Set(Array.from(respMap.values())));
      const { data: queries } = await sb
        .from('queries')
        .select('id, prompt, engine')
        .in('id', queryIds);
      const queryMap = new Map<number, { prompt: string; engine: string }>(
        (queries ?? []).map((q: { id: number; prompt: string; engine: string }) => [
          q.id,
          { prompt: q.prompt, engine: q.engine },
        ])
      );
      recentCitations = mentions.map((m: {
        id: number;
        response_id: number;
        tenant_id: number;
        created_at: string;
      }) => {
        const qid = respMap.get(m.response_id);
        const qInfo = qid ? queryMap.get(qid) : undefined;
        return {
          id: String(m.id),
          query: qInfo?.prompt ?? '(query 미발견)',
          tenantName: tenantMap.get(m.tenant_id) ?? '(unknown)',
          engine: qInfo?.engine ?? '?',
          citedAt: m.created_at,
        };
      });
    }
  } catch {
    // mentions/queries query 실패 시 빈 list (graceful)
  }

  // Round 37 H (2026-05-31) — 차트 3개 데이터 server-side 집계.
  // 1. tier_trend: 일자별 T1/T3/T4/T5/NOISE 카운트 (30일)
  // 2. client_ranking: 클라이언트별 총 인용 source Top 5
  let tierTrend: TierTrendPoint[] = [];
  let clientRanking: ClientRankingItem[] = [];
  try {
    // 분류 사전 로드
    const { data: domainClassRows } = await sb
      .from('domain_classifications')
      .select('domain, tier')
      .eq('is_active', true);
    const classMap = new Map<string, string>();
    (domainClassRows ?? []).forEach((r: { domain: string; tier: string }) => {
      classMap.set(r.domain.toLowerCase(), r.tier);
    });

    // 최근 30일 responses (production 측정만, source_domains 있는 것)
    const thirtyDaysAgo = useCustomRange && customCutoff ? customCutoff : new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
    const { data: respRows } = await sb
      .from('responses')
      .select('id, query_id, source_domains, created_at')
      .gte('created_at', thirtyDaysAgo)
      .not('source_domains', 'is', null);

    // query_id → tenant_id, engine
    const queryIdSet = Array.from(
      new Set((respRows ?? []).map((r: { query_id: number }) => r.query_id))
    );
    const queryTenantMap = new Map<number, number>();
    if (queryIdSet.length > 0) {
      // Round 39 — tenantId 필터링
      let qq = sb
        .from('queries')
        .select('id, tenant_id, engine')
        .in('id', queryIdSet)
        .neq('engine', 'stub');
      if (tenantId) qq = qq.eq('tenant_id', tenantId);
      const { data: queryRows } = await qq;
      (queryRows ?? []).forEach((q: { id: number; tenant_id: number }) => {
        queryTenantMap.set(q.id, q.tenant_id);
      });
    }

    // tenant_id → name
    const tenantIdsAll = Array.from(new Set(Array.from(queryTenantMap.values())));
    const tenantNameMap = new Map<number, string>();
    if (tenantIdsAll.length > 0) {
      const { data: tenantsAll } = await sb
        .from('tenants')
        .select('id, name')
        .in('id', tenantIdsAll);
      (tenantsAll ?? []).forEach((t: { id: number; name: string }) => {
        tenantNameMap.set(t.id, t.name);
      });
    }

    // 일자별 집계 + 클라이언트별 집계
    const trendMap = new Map<
      string,
      { t1: number; t3: number; t4: number; t5: number; noise: number; total: number }
    >();
    const clientMap = new Map<number, { total: number; t1: number; t5: number }>();

    (respRows ?? []).forEach(
      (r: {
        query_id: number;
        source_domains: Array<{ domain: string }> | null;
        created_at: string;
      }) => {
        const tenantId = queryTenantMap.get(r.query_id);
        if (!tenantId) return; // stub engine 또는 누락
        const dateKey = r.created_at.slice(5, 10); // 'MM-DD'

        if (!trendMap.has(dateKey)) {
          trendMap.set(dateKey, { t1: 0, t3: 0, t4: 0, t5: 0, noise: 0, total: 0 });
        }
        const bucket = trendMap.get(dateKey)!;

        if (!clientMap.has(tenantId)) {
          clientMap.set(tenantId, { total: 0, t1: 0, t5: 0 });
        }
        const cbucket = clientMap.get(tenantId)!;

        (r.source_domains ?? []).forEach((sd: { domain: string }) => {
          if (!sd.domain) return;
          const d = sd.domain.toLowerCase();
          const cls = classMap.get(d) ?? 'T5'; // unknown → T5 default
          bucket.total++;
          cbucket.total++;
          if (cls === 'T1') {
            bucket.t1++;
            cbucket.t1++;
          } else if (cls === 'T3') bucket.t3++;
          else if (cls === 'T4') bucket.t4++;
          else if (cls === 'NOISE') bucket.noise++;
          else {
            bucket.t5++;
            cbucket.t5++;
          }
        });
      }
    );

    // tier_trend — periodDays 치 채움 (없는 날 0)
    const allDays: string[] = [];
    for (let i = periodDays - 1; i >= 0; i--) {
      const dt = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      allDays.push(dt.toISOString().slice(5, 10));
    }
    tierTrend = allDays.map((d) => {
      const b = trendMap.get(d) ?? { t1: 0, t3: 0, t4: 0, t5: 0, noise: 0, total: 0 };
      return {
        date: d,
        ...b,
        t1_share: b.total > 0 ? b.t1 / b.total : 0,
      };
    });

    // client_ranking — Top 5 by total
    clientRanking = Array.from(clientMap.entries())
      .map(([tid, v]) => ({
        tenant_name: tenantNameMap.get(tid) ?? `tenant#${tid}`,
        total: v.total,
        t1: v.t1,
        t5: v.t5,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  } catch {
    /* 차트 데이터 실패 시 빈 array — 컴포넌트가 graceful 표시 */
  }

  // Round 38 B (2026-05-31) — 추가 차트 2개 데이터.
  // 4) Top 키워드 grounding rate (30일)
  // 5) 신규 등장 도메인 (최근 7일, 분류 사전 안 등록된 것 위주)
  let keywordGrounding: KeywordGroundingItem[] = [];
  let newDomains: NewDomainItem[] = [];
  try {
    const thirtyDaysAgo = useCustomRange && customCutoff ? customCutoff : new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();

    // 4) keyword grounding — queries 와 responses 30일치 join, keyword_id 별 group
    // Round 39 — tenantId 필터링
    let qa = sb
      .from('queries')
      .select('id, keyword_id, tenant_id')
      .neq('engine', 'stub')
      .gte('requested_at', thirtyDaysAgo);
    if (tenantId) qa = qa.eq('tenant_id', tenantId);
    const { data: queriesAll } = await qa;
    const queryIdToKw = new Map<number, { keyword_id: number; tenant_id: number }>();
    (queriesAll ?? []).forEach((q: { id: number; keyword_id: number; tenant_id: number }) => {
      queryIdToKw.set(q.id, { keyword_id: q.keyword_id, tenant_id: q.tenant_id });
    });

    const queryIds30d = Array.from(queryIdToKw.keys());
    const { data: respsAll } = await sb
      .from('responses')
      .select('id, query_id, source_domains, created_at')
      .gte('created_at', thirtyDaysAgo);

    // keyword_id 별 — 시도 횟수 + grounding (source_domains 있는) 횟수
    const kwStats = new Map<number, { tenant_id: number; queries: number; grounded: number }>();
    (queriesAll ?? []).forEach((q: { id: number; keyword_id: number; tenant_id: number }) => {
      if (!kwStats.has(q.keyword_id)) {
        kwStats.set(q.keyword_id, { tenant_id: q.tenant_id, queries: 0, grounded: 0 });
      }
      kwStats.get(q.keyword_id)!.queries++;
    });
    (respsAll ?? []).forEach(
      (r: { query_id: number; source_domains: unknown[] | null }) => {
        const meta = queryIdToKw.get(r.query_id);
        if (!meta) return;
        if (r.source_domains && Array.isArray(r.source_domains) && r.source_domains.length > 0) {
          const s = kwStats.get(meta.keyword_id);
          if (s) s.grounded++;
        }
      }
    );

    // keyword text + tenant name fetch
    const kwIds = Array.from(kwStats.keys());
    if (kwIds.length > 0) {
      const { data: kwsAll } = await sb
        .from('keywords')
        .select('id, text, tenant_id')
        .in('id', kwIds);
      const kwTextMap = new Map<number, string>();
      const kwTenantMap = new Map<number, number>();
      (kwsAll ?? []).forEach((k: { id: number; text: string; tenant_id: number }) => {
        kwTextMap.set(k.id, k.text);
        kwTenantMap.set(k.id, k.tenant_id);
      });

      const tenantIdsKw = Array.from(new Set(Array.from(kwTenantMap.values())));
      const tenantNameMap2 = new Map<number, string>();
      if (tenantIdsKw.length > 0) {
        const { data: tenantsKw } = await sb
          .from('tenants')
          .select('id, name')
          .in('id', tenantIdsKw);
        (tenantsKw ?? []).forEach((t: { id: number; name: string }) =>
          tenantNameMap2.set(t.id, t.name)
        );
      }

      keywordGrounding = Array.from(kwStats.entries())
        .map(([kwId, v]) => ({
          keyword: kwTextMap.get(kwId) ?? `#${kwId}`,
          tenant_name: tenantNameMap2.get(kwTenantMap.get(kwId) ?? -1) ?? '?',
          queries: v.queries,
          grounded: v.grounded,
          rate: v.queries > 0 ? v.grounded / v.queries : 0,
        }))
        .filter((r) => r.queries >= 1)
        .sort((a, b) => b.queries - a.queries)
        .slice(0, 10);
    }

    // 5) 신규 도메인 — 최근 7일 등장 hostname 중 그 이전 30일에는 안 등장한 것
    // Round 39 — tenantId 필터 + 세부 URL + 키워드 추가
    let rrq = sb
      .from('responses')
      .select('id, query_id, source_domains, created_at')
      .gte('created_at', sevenDaysAgo)
      .not('source_domains', 'is', null);
    const { data: respRecent } = await rrq;

    const { data: respPrior } = await sb
      .from('responses')
      .select('source_domains')
      .gte('created_at', fortyDaysAgo)
      .lt('created_at', sevenDaysAgo)
      .not('source_domains', 'is', null);

    const priorDomains = new Set<string>();
    (respPrior ?? []).forEach(
      (r: { source_domains: Array<{ domain: string }> | null }) => {
        (r.source_domains ?? []).forEach((sd: { domain: string }) => {
          if (sd.domain) priorDomains.add(sd.domain.toLowerCase());
        });
      }
    );

    // Round 39 — 최근 7일 queries 정보 (tenantId 필터 적용)
    const recentQueryIds = Array.from(
      new Set((respRecent ?? []).map((r: { query_id: number }) => r.query_id))
    );
    const queryDetailMap = new Map<number, { tenant_id: number; keyword_id: number }>();
    if (recentQueryIds.length > 0) {
      let qd = sb
        .from('queries')
        .select('id, tenant_id, keyword_id')
        .in('id', recentQueryIds)
        .neq('engine', 'stub');
      if (tenantId) qd = qd.eq('tenant_id', tenantId);
      const { data: qrows } = await qd;
      (qrows ?? []).forEach((q: { id: number; tenant_id: number; keyword_id: number }) => {
        queryDetailMap.set(q.id, { tenant_id: q.tenant_id, keyword_id: q.keyword_id });
      });
    }

    // 키워드 + tenant name 매핑
    const kwIdsForDomain = Array.from(new Set(Array.from(queryDetailMap.values()).map((v) => v.keyword_id)));
    const kwTextMapForDomain = new Map<number, string>();
    if (kwIdsForDomain.length > 0) {
      const { data: kws } = await sb.from('keywords').select('id, text').in('id', kwIdsForDomain);
      (kws ?? []).forEach((k: { id: number; text: string }) => kwTextMapForDomain.set(k.id, k.text));
    }
    const tenantIdsForDomain = Array.from(new Set(Array.from(queryDetailMap.values()).map((v) => v.tenant_id)));
    const tenantNameMapForDomain = new Map<number, string>();
    if (tenantIdsForDomain.length > 0) {
      const { data: ts } = await sb.from('tenants').select('id, name').in('id', tenantIdsForDomain);
      (ts ?? []).forEach((t: { id: number; name: string }) => tenantNameMapForDomain.set(t.id, t.name));
    }

    const recentFirstSeen = new Map<
      string,
      {
        first: string;
        count: number;
        urls: Set<string>;
        keywords: Set<string>;
        tenants: Set<string>;
      }
    >();
    (respRecent ?? []).forEach(
      (r: {
        query_id: number;
        source_domains: Array<{ domain: string; final_url?: string | null }> | null;
        created_at: string;
      }) => {
        const day = r.created_at.slice(5, 10);
        const meta = queryDetailMap.get(r.query_id);
        if (tenantId && !meta) return; // tenantId 필터 적용 시 query 없는 건 skip
        (r.source_domains ?? []).forEach((sd: { domain: string; final_url?: string | null }) => {
          if (!sd.domain) return;
          const d = sd.domain.toLowerCase();
          if (priorDomains.has(d)) return;
          if (!recentFirstSeen.has(d)) {
            recentFirstSeen.set(d, {
              first: day,
              count: 0,
              urls: new Set(),
              keywords: new Set(),
              tenants: new Set(),
            });
          }
          const entry = recentFirstSeen.get(d)!;
          entry.count++;
          if (sd.final_url) entry.urls.add(sd.final_url);
          if (meta) {
            const kwText = kwTextMapForDomain.get(meta.keyword_id);
            const tName = tenantNameMapForDomain.get(meta.tenant_id);
            if (kwText) entry.keywords.add(kwText);
            if (tName) entry.tenants.add(tName);
          }
        });
      }
    );

    // tier 분류 lookup
    const { data: classRows } = await sb
      .from('domain_classifications')
      .select('domain, tier')
      .eq('is_active', true);
    const classifyMap = new Map<string, string>();
    (classRows ?? []).forEach((r: { domain: string; tier: string }) => {
      classifyMap.set(r.domain.toLowerCase(), r.tier);
    });

    newDomains = Array.from(recentFirstSeen.entries())
      .map(([domain, info]) => ({
        domain,
        tier: classifyMap.get(domain) ?? 'T5',
        first_seen: info.first,
        occurrences: info.count,
        sample_urls: Array.from(info.urls).slice(0, 3),
        keywords: Array.from(info.keywords).slice(0, 3),
        tenants: Array.from(info.tenants).slice(0, 3),
      }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 8);
  } catch {
    /* 신규 차트 실패 시 빈 array */
  }

  // Round 87 (2026-06-28) — 콘텐츠 경쟁력 분석.
  //   비즈니스 핵심: "위서클 콘텐츠가 AI 에 자주 인용되도록".
  //   각 발행 글의 키워드 → 그 키워드의 mention 카운트 = 콘텐츠 "노출 영향력" proxy
  //   (정확한 content_id↔mention 매핑은 Round 88 스키마 변경에서. 지금은 keyword 기반.)
  let topContents: Array<{
    id: number;
    title: string;
    slug: string;
    tenantName: string;
    tenantId: number;
    publishedAt: string;
    keyword: string;
    mentionsForKeyword: number;
    isPartner: boolean;
    partnerCategory: string | null;
  }> = [];
  try {
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: pubContents } = await sb
      .from('generated_contents')
      .select('id, title, slug, tenant_id, published_at, keyword_text, is_partner_content, partner_category')
      .eq('status', 'published')
      .eq('channel', 'blog_html')
      .gte('published_at', since30)
      .order('published_at', { ascending: false })
      .limit(50);
    const pubList = (pubContents ?? []) as Array<{
      id: number; title: string; slug: string; tenant_id: number;
      published_at: string; keyword_text: string;
      is_partner_content: boolean; partner_category: string | null;
    }>;

    // 키워드별 mention 카운트 (30일)
    const keywordSet = Array.from(new Set(pubList.map((p) => p.keyword_text).filter(Boolean)));
    const kwMentionMap = new Map<string, number>();
    if (keywordSet.length > 0) {
      // queries(keyword) ← responses ← mentions(is_target=true) 체인
      const { data: kwRows } = await sb
        .from('keywords')
        .select('id, text')
        .in('text', keywordSet);
      const kwIdToText = new Map<number, string>(
        ((kwRows ?? []) as Array<{ id: number; text: string }>).map((k) => [k.id, k.text])
      );
      const kwIds = Array.from(kwIdToText.keys());
      if (kwIds.length > 0) {
        const { data: qRows } = await sb
          .from('queries')
          .select('id, keyword_id')
          .in('keyword_id', kwIds)
          .gte('requested_at', since30);
        const qIdToKw = new Map<number, number>();
        ((qRows ?? []) as Array<{ id: number; keyword_id: number }>).forEach((q) => qIdToKw.set(q.id, q.keyword_id));
        if (qIdToKw.size > 0) {
          // responses 거쳐서 mentions 카운트 — 큰 query 라 page 단위
          const { data: rRows } = await sb
            .from('responses')
            .select('id, query_id')
            .in('query_id', Array.from(qIdToKw.keys()));
          const rIdToKw = new Map<number, string>();
          ((rRows ?? []) as Array<{ id: number; query_id: number }>).forEach((r) => {
            const kid = qIdToKw.get(r.query_id);
            const ktext = kid ? kwIdToText.get(kid) : undefined;
            if (ktext) rIdToKw.set(r.id, ktext);
          });
          if (rIdToKw.size > 0) {
            const { data: mRows } = await sb
              .from('mentions')
              .select('response_id, is_target')
              .in('response_id', Array.from(rIdToKw.keys()))
              .eq('is_target', true);
            ((mRows ?? []) as Array<{ response_id: number }>).forEach((m) => {
              const kw = rIdToKw.get(m.response_id);
              if (kw) kwMentionMap.set(kw, (kwMentionMap.get(kw) ?? 0) + 1);
            });
          }
        }
      }
    }

    const tenantNameMapLocal = new Map<number, string>();
    if (pubList.length > 0) {
      const tIds = Array.from(new Set(pubList.map((p) => p.tenant_id)));
      const { data: tRows } = await sb.from('tenants').select('id, name').in('id', tIds);
      ((tRows ?? []) as Array<{ id: number; name: string }>).forEach((t) =>
        tenantNameMapLocal.set(t.id, t.name)
      );
    }

    topContents = pubList
      .map((p) => ({
        id: p.id,
        title: p.title || p.keyword_text || '(제목 없음)',
        slug: p.slug,
        tenantName: tenantNameMapLocal.get(p.tenant_id) ?? `#${p.tenant_id}`,
        tenantId: p.tenant_id,
        publishedAt: p.published_at,
        keyword: p.keyword_text,
        mentionsForKeyword: kwMentionMap.get(p.keyword_text) ?? 0,
        isPartner: p.is_partner_content,
        partnerCategory: p.partner_category,
      }))
      .sort((a, b) => b.mentionsForKeyword - a.mentionsForKeyword);
  } catch {
    /* graceful */
  }

  // Round 89 (2026-06-28) — 콘텐츠 구조 자동 분석.
  //   "어떤 구조가 AI 인용 잘 받는지" 패턴 발견.
  //   body 의 HTML 파싱 (서버에서 regex 로 H2/표/목록/이미지 카운트) → 평균 vs Top 비교.
  let structureStats: {
    totalCount: number;
    avgBodyLen: number;
    avgH2: number;
    avgTable: number;
    avgList: number;
    avgImg: number;
    faqSchemaPct: number;
    topPattern: {
      avgH2: number; avgTable: number; avgList: number; avgImg: number;
      avgBodyLen: number; faqSchemaPct: number;
    } | null;
  } = {
    totalCount: 0, avgBodyLen: 0, avgH2: 0, avgTable: 0, avgList: 0, avgImg: 0,
    faqSchemaPct: 0, topPattern: null,
  };
  try {
    // 발행 콘텐츠 body 가져와서 구조 카운트 (server-side regex)
    const { data: bodies } = await sb
      .from('generated_contents')
      .select('id, body, keyword_text')
      .eq('status', 'published')
      .eq('channel', 'blog_html')
      .not('body', 'is', null)
      .limit(200);
    const list = (bodies ?? []) as Array<{ id: number; body: string; keyword_text: string }>;
    if (list.length > 0) {
      const countMatches = (text: string, re: RegExp) => (text.match(re) || []).length;
      const metrics = list.map((c) => ({
        id: c.id,
        keyword: c.keyword_text,
        bodyLen: (c.body || '').length,
        h2: countMatches(c.body || '', /<h2[\s>]/g),
        table: countMatches(c.body || '', /<table[\s>]/g),
        list: countMatches(c.body || '', /<(ul|ol)[\s>]/g),
        img: countMatches(c.body || '', /<img[\s>]/g),
        hasFaq: (c.body || '').includes('FAQPage'),
      }));
      const avg = (arr: number[]) => arr.reduce((s, n) => s + n, 0) / Math.max(arr.length, 1);
      const faqCount = metrics.filter((m) => m.hasFaq).length;

      // Top 패턴 — keyword 별 mention 카운트 매핑해서 인용 많은 글 추출
      const kwMap = new Map<string, number>(); // 위에서 만든 kwMentionMap 활용 (closure)
      try {
        const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: kRows } = await sb.from('keywords').select('id, text');
        const kwIdToText = new Map<number, string>(
          ((kRows ?? []) as Array<{ id: number; text: string }>).map((k) => [k.id, k.text])
        );
        const { data: qR } = await sb
          .from('queries')
          .select('id, keyword_id')
          .gte('requested_at', since30);
        const qToKw = new Map<number, string>();
        ((qR ?? []) as Array<{ id: number; keyword_id: number }>).forEach((q) => {
          const t = kwIdToText.get(q.keyword_id);
          if (t) qToKw.set(q.id, t);
        });
        if (qToKw.size > 0) {
          const { data: rR } = await sb
            .from('responses')
            .select('id, query_id')
            .in('query_id', Array.from(qToKw.keys()));
          const rToKw = new Map<number, string>();
          ((rR ?? []) as Array<{ id: number; query_id: number }>).forEach((r) => {
            const k = qToKw.get(r.query_id);
            if (k) rToKw.set(r.id, k);
          });
          if (rToKw.size > 0) {
            const { data: mR } = await sb
              .from('mentions')
              .select('response_id, is_target')
              .in('response_id', Array.from(rToKw.keys()))
              .eq('is_target', true);
            ((mR ?? []) as Array<{ response_id: number }>).forEach((m) => {
              const k = rToKw.get(m.response_id);
              if (k) kwMap.set(k, (kwMap.get(k) ?? 0) + 1);
            });
          }
        }
      } catch { /* graceful */ }

      const withMentions = metrics
        .map((m) => ({ ...m, mentions: kwMap.get(m.keyword) ?? 0 }))
        .sort((a, b) => b.mentions - a.mentions);
      const top10 = withMentions.slice(0, Math.max(5, Math.floor(withMentions.length * 0.2)));
      const topFaq = top10.filter((m) => m.hasFaq).length;

      structureStats = {
        totalCount: metrics.length,
        avgBodyLen: Math.round(avg(metrics.map((m) => m.bodyLen))),
        avgH2: Math.round(avg(metrics.map((m) => m.h2)) * 10) / 10,
        avgTable: Math.round(avg(metrics.map((m) => m.table)) * 10) / 10,
        avgList: Math.round(avg(metrics.map((m) => m.list)) * 10) / 10,
        avgImg: Math.round(avg(metrics.map((m) => m.img)) * 10) / 10,
        faqSchemaPct: Math.round((faqCount / metrics.length) * 100),
        topPattern: top10.length > 0 ? {
          avgBodyLen: Math.round(avg(top10.map((m) => m.bodyLen))),
          avgH2: Math.round(avg(top10.map((m) => m.h2)) * 10) / 10,
          avgTable: Math.round(avg(top10.map((m) => m.table)) * 10) / 10,
          avgList: Math.round(avg(top10.map((m) => m.list)) * 10) / 10,
          avgImg: Math.round(avg(top10.map((m) => m.img)) * 10) / 10,
          faqSchemaPct: Math.round((topFaq / top10.length) * 100),
        } : null,
      };
    }
  } catch { /* graceful */ }

  // Round 88 (2026-06-28) — AI 시장 점유 진단.
  //   비즈니스 본질: medimap-blog 가 AI source 에 실제 인용되는지.
  //   진단 결과 (2026-06-28): 30일간 medimap-blog = 0회 인용. 경쟁사(sueye/bnviit/bgneye) 200+.
  //   원인: vercel.app 무료 서브도메인 + 새 사이트 + AI 학습 cutoff.
  let domainDistribution: Array<{ domain: string; citations: number; isOwn?: boolean; isCompetitor?: boolean }> = [];
  let medimapDomainCitations = 0;
  let totalDomainCitations = 0;
  try {
    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: respRows } = await sb
      .from('responses')
      .select('source_domains')
      .gte('created_at', cutoff30)
      .not('source_domains', 'is', null)
      .limit(5000);
    const domainCount = new Map<string, number>();
    let totalCount = 0;
    let medimapCount = 0;
    ((respRows ?? []) as Array<{ source_domains: Array<{ domain: string }> | null }>).forEach((r) => {
      (r.source_domains ?? []).forEach((sd) => {
        const dom = (sd.domain || '').toLowerCase().replace(/^www\./, '');
        if (!dom) return;
        domainCount.set(dom, (domainCount.get(dom) ?? 0) + 1);
        totalCount++;
        if (dom.includes('medimap')) medimapCount++;
      });
    });

    // 경쟁사 도메인 (수기 + 위서클 클라이언트 도메인 제외 + 권위 제외)
    const COMPETITOR_PATTERNS = ['eye', 'clinic', 'hospital', 'medic', '안과', 'derm', 'plastic', 'hair'];
    const AUTHORITY = new Set(['namu.wiki', 'youtube.com', 'modoodoc.com', 'hidoc.co.kr', 'news.hidoc.co.kr', 'v.daum.net', 'edu.donga.com', 'news.naver.com']);
    domainDistribution = Array.from(domainCount.entries())
      .map(([domain, citations]) => {
        const isOwn = domain.includes('medimap') || domain.includes('medi-map');
        const isAuth = AUTHORITY.has(domain);
        const isCompetitor =
          !isOwn && !isAuth &&
          COMPETITOR_PATTERNS.some((p) => domain.includes(p));
        return { domain, citations, isOwn, isCompetitor };
      })
      .sort((a, b) => b.citations - a.citations);
    medimapDomainCitations = medimapCount;
    totalDomainCitations = totalCount;
  } catch {
    /* graceful */
  }

  return {
    activeTenants: clientCount ?? 0,
    pendingQueue: pendingCount ?? 0,
    todayCost,
    yesterdayCost,
    cost14d,
    citations24h,
    citations30d,
    publishedThisMonth,
    lastCronAt,
    recentDrafts,
    recentCitations,
    tierTrend,
    clientRanking,
    keywordGrounding,
    newDomains,
    topContents,
    domainDistribution,
    medimapDomainCitations,
    totalDomainCitations,
    structureStats,
    error: costError,
  };
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: { period?: string; from?: string; to?: string; tenantId?: string };
}) {
  // Round 38/39 — 기간 + 클라이언트 컨텍스트
  const isCustom = searchParams?.period === 'custom' && searchParams?.from && searchParams?.to;
  const periodDays = (() => {
    const v = Number(searchParams?.period);
    if (v === 7 || v === 30 || v === 90) return v;
    return 30;
  })();
  const tenantId = (() => {
    const v = Number(searchParams?.tenantId);
    return v > 0 ? v : null;
  })();
  const fromDate = isCustom ? searchParams?.from : undefined;
  const toDate = isCustom ? searchParams?.to : undefined;
  const d = await fetchDashboardData({ periodDays, tenantId, fromDate, toDate });

  // tenants list (selector 용)
  const sbForTenants = getServerClient();
  let tenantsList: Array<{ id: number; name: string }> = [];
  if (sbForTenants) {
    const { data } = await sbForTenants.from('tenants').select('id, name').order('name');
    tenantsList = data ?? [];
  }

  // Round 86/87 — KPI 4 → 6 확장. 운영자가 매일 보는 핵심 메트릭 우선.
  //   추가: 30일 누적 멘션 (성과) · 이번 달 발행 (생산성).
  //   24h 인용은 작은 표본 부족 → 30일 누적이 더 의미 있음.
  const KPIS = [
    {
      label: '활성 클라이언트',
      value: d.activeTenants,
      suffix: '개',
      href: '/admin/tenants',
      icon: Users,
      hint: '월 청구 대상',
    },
    {
      label: '검수 대기',
      value: d.pendingQueue,
      suffix: '건',
      href: '/admin/content-queue',
      icon: ClipboardCheck,
      hint: d.pendingQueue > 5 ? '⚠ 누적 — 검수 필요' : '정상',
    },
    {
      label: '30일 누적 인용',
      value: (d.citations30d ?? 0).toLocaleString(),
      suffix: '건',
      href: '/admin/citations',
      icon: Zap,
      hint: `24h ${d.citations24h ?? 0}건`,
    },
    {
      label: '이번 달 발행',
      value: d.publishedThisMonth ?? 0,
      suffix: '편',
      href: '/admin/content-queue',
      icon: FileText,
      hint: 'blog_html published',
    },
    {
      // Round 116 Phase 5 (2026-07-02): 오늘값이 0이면 어제/14일 노출로 실미터링 상태 명시.
      label: d.todayCost > 0 ? '오늘 LLM 비용' : '어제 LLM 비용',
      value: d.todayCost > 0 ? `$${d.todayCost.toFixed(2)}` : `$${d.yesterdayCost.toFixed(2)}`,
      suffix: '',
      href: '/admin/cost',
      icon: DollarSign,
      hint: `14일 $${d.cost14d.toFixed(2)} · 한도 $5/일`,
    },
    {
      label: '측정 cron 상태',
      value: d.lastCronAt
        ? (() => {
            const hoursAgo = (Date.now() - new Date(d.lastCronAt).getTime()) / 3600000;
            return hoursAgo < 26 ? '정상' : '⚠ 지연';
          })()
        : '데이터 없음',
      suffix: '',
      href: '/admin/citations',
      icon: TrendingUp,
      hint: d.lastCronAt
        ? `최종: ${new Date(d.lastCronAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: 'numeric' })}`
        : 'Run workflow 필요',
    },
  ];

  // Round 104 ④ — 좌측 빈 영역 채움용 측정 상태 요약값.
  const cronStatusText = d.lastCronAt
    ? (Date.now() - new Date(d.lastCronAt).getTime()) / 3600000 < 26
      ? '정상'
      : '⚠ 지연'
    : '데이터 없음';

  return (
    <div className="px-8 py-6">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">운영 대시보드</h1>
          <p className="admin-page-desc">전체 클라이언트의 KPI · 발행 추이 · AI 인용 점유율을 한눈에 확인합니다</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <Link
              key={k.label}
              href={k.href}
              className="card card-pad transition hover:border-brand-200"
            >
              <div className="flex items-start justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{k.label}</div>
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                  <Icon className="h-3 w-3" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <div className="text-xl font-bold text-ink">{k.value}</div>
                <span className="text-xs text-ink-muted">{k.suffix}</span>
              </div>
              <div className="mt-1 text-[10px] text-ink-faint">{k.hint}</div>
            </Link>
          );
        })}
      </section>

      {/* Round 92 (2026-06-28) — 정보 위계 재구성.
          Tier 1: 즉시 행동 필요 (액션 권고 + 시장 점유 알림) — 2-column grid
          Tier 2: 콘텐츠 분석 (Top 인용 + 구조 패턴)
          Tier 3: 운영 차트 (5-tier / ranking / grounding)
          Tier 4: 운영 리스트 (검수 대기 / AI 인용 / 신규 도메인) */}

      {/* === Tier 1: 즉시 행동 필요 (좌: 액션 권고 / 우: 시장 진단) === */}
      <div className="mt-6">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-danger" />
          즉시 행동 필요
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="contents xl:block [&_section]:!mt-0">
            <ActionRecommendations
              keywordGrounding={d.keywordGrounding}
              pendingQueue={d.pendingQueue}
              lastCronAt={d.lastCronAt}
              citations30d={d.citations30d}
              publishedThisMonth={d.publishedThisMonth}
            />
            {/* Round 104 ④ — 좌측 빈 영역 채움: 측정·엔진 현황 (xl 2단에서만 노출) */}
            <div className="mt-4 hidden xl:block">
              <section className="card">
                <header className="border-b border-border px-4 py-3">
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <TrendingUp className="h-4 w-4 text-brand" />
                    측정·엔진 현황
                  </h2>
                  <div className="mt-0.5 text-[11px] text-ink-muted">AI 인용 측정 파이프라인 상태</div>
                </header>
                <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                  <div className="px-3 py-3 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-ink-muted">측정 cron</div>
                    <div className="mt-1 text-sm font-bold text-ink">{cronStatusText}</div>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-ink-muted">30일 인용</div>
                    <div className="mt-1 text-sm font-bold text-ink">{(d.citations30d ?? 0).toLocaleString()}</div>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <div className="text-[10px] uppercase tracking-wider text-ink-muted">14일 비용</div>
                    <div className="mt-1 text-sm font-bold text-ink">${d.cost14d.toFixed(2)}</div>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="mb-1.5 text-[10px] uppercase tracking-wider text-ink-muted">웹검색 측정 엔진</div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded px-2 py-0.5 text-[11px] font-bold bg-engine-gemini/10 text-engine-gemini">Gemini ✓</span>
                    <span className="rounded px-2 py-0.5 text-[11px] font-bold bg-engine-claude/10 text-engine-claude">Claude ✓</span>
                    <span className="rounded px-2 py-0.5 text-[11px] font-bold bg-engine-chatgpt/10 text-engine-chatgpt">ChatGPT ✓</span>
                  </div>
                  <div className="mt-2 text-[10px] text-ink-muted">
                    3엔진 모두 웹검색으로 source URL 수집 — 도메인 인용 누적 중 (다음 cron부터 Claude/ChatGPT 경로 채워짐)
                  </div>
                </div>
              </section>
            </div>
          </div>
          <div className="contents xl:block [&_section]:!mt-0">
            <MarketShareDiagnosis
              domains={d.domainDistribution ?? []}
              medimapCitations={d.medimapDomainCitations ?? 0}
              totalCitations={d.totalDomainCitations ?? 0}
              daysWindow={30}
            />
          </div>
        </div>
      </div>

      {/* === Tier 2: 콘텐츠 분석 (위서클 콘텐츠가 AI 에 자주 인용되도록) === */}
      <div className="mt-8">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
          콘텐츠 경쟁력 분석
        </div>
        <div className="space-y-4 [&>section]:!mt-0">
          <ContentCompetitiveness contents={d.topContents ?? []} />
          <ContentPatternStats stats={d.structureStats} />
        </div>
      </div>

      {/* === Tier 2.5 (Round 109-A): 파트너별 AI 인용 리더보드 (영업 무기) === */}
      <div className="mt-8">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
          파트너 성과 실측
        </div>
        <PartnerLeaderboard />
      </div>

      {/* === Tier 2.6 (Round 110-B/C): AI 크롤러 방문 + 카카오톡 유입 트래킹 === */}
      <div className="mt-8">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          유입·크롤 실측 (Round 110)
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <CrawlerLogWidget />
          <KakaoFunnelWidget />
        </div>
      </div>

      {/* === Tier 3: 운영 차트 (탭 통합) === */}
      <div className="mt-8">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-success" />
          운영 차트 — 측정 추이
        </div>
        <DashboardChartsTabbed
          tierTrend={d.tierTrend}
          clientRanking={d.clientRanking}
          keywordGrounding={d.keywordGrounding}
        />
      </div>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="section-title">최근 검수 대기 (Top 3)</h2>
            <Link
              href="/admin/content-queue"
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              전체 보기 <ArrowUpRight className="inline h-3 w-3" />
            </Link>
          </header>
          {d.recentDrafts.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink-muted">
              검수 대기 글이 없습니다. 다음 cron 사이클까지 대기.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {d.recentDrafts.map((q) => (
                <li key={q.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">
                        {q.title || '(제목 없음)'}
                      </div>
                      <div className="mt-1 text-[11px] text-ink-muted">
                        {q.tenant_name}
                        {q.keyword_text ? ` · ${q.keyword_text}` : ''}
                        {q.llm_provider ? ` · ${q.llm_provider}` : ''}
                      </div>
                    </div>
                    {q.compliance_status && (
                      <span
                        className={cn(
                          'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold',
                          q.compliance_status === 'pass'
                            ? 'bg-status-successSoft text-status-success'
                            : q.compliance_status === 'warn'
                              ? 'bg-status-warningSoft text-status-warning'
                              : 'bg-status-dangerSoft text-status-danger'
                        )}
                      >
                        의료법 {q.compliance_status.toUpperCase()}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="section-title">최근 AI 인용 (24h)</h2>
            <Link
              href="/admin/citations"
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              전체 보기 <ArrowUpRight className="inline h-3 w-3" />
            </Link>
          </header>
          {d.recentCitations.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink-muted">
              <Zap className="mx-auto mb-2 h-6 w-6 text-ink-faint" />
              <div>최근 24시간 AI 인용 0건</div>
              <div className="mt-1 text-[11px] text-ink-faint">
                measure-ai-mentions cron (매일 07:00 KST) 가 4 엔진 측정 후 표시
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {d.recentCitations.map((c) => (
                <li key={c.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{c.query}</div>
                      <div className="mt-1 text-[11px] text-ink-muted">
                        {c.tenantName} · {c.engine} · {new Date(c.citedAt).toLocaleString('ko-KR')}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'inline-flex h-2 w-2 shrink-0 rounded-full',
                        c.engine === 'chatgpt' || c.engine === 'openai'
                          ? 'bg-engine-chatgpt'
                          : c.engine === 'claude' || c.engine === 'anthropic'
                            ? 'bg-engine-claude'
                            : c.engine === 'gemini'
                              ? 'bg-engine-gemini'
                              : c.engine === 'perplexity'
                                ? 'bg-engine-perplexity'
                                : 'bg-ink-faint'
                      )}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Round 39 — 클라이언트 selector + 기간 토글 + 사용자 지정 */}
      <DashboardFilters
        tenants={tenantsList}
        currentTenantId={tenantId}
        currentPeriod={isCustom ? 'custom' : String(periodDays)}
        currentFrom={fromDate}
        currentTo={toDate}
      />

      {/* Round 93 (2026-06-28) — 차트 3개는 Tier 3 의 DashboardChartsTabbed 로 이동.
          여기서는 신규 등장 도메인만 표시. */}
      <section className="mt-3">
        <DashboardCharts
          tierTrend={d.tierTrend}
          clientRanking={d.clientRanking}
          keywordGrounding={d.keywordGrounding}
          newDomains={d.newDomains}
          showTierAndRankingCharts={false}
        />
      </section>

      {d.error && (
        <div className="mt-6 rounded-md border border-status-warningSoft bg-status-warningSoft/30 px-4 py-3 text-xs text-status-warning">
          ⚠️ 일부 데이터 fetch 에러: {d.error}
        </div>
      )}
    </div>
  );
}
