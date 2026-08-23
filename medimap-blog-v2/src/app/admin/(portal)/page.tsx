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
import { ArrowUpRight, ChevronDown, ClipboardCheck, DollarSign, Users, Zap, FileText, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { getServerClient } from '@/lib/supabase';
import { getScopeServer, scopeToKeywordLang, scopeToContentLang } from '@/lib/scope';
import { fetchAllRows, fetchByIdChunks } from '@/lib/fetchAllRows';
import { loadClassifierSets, classifyDomain } from '@/lib/domain-classifier';
import { cn } from '@/lib/cn';
import { ActionRecommendations } from '@/components/admin/ActionRecommendations';
import { ContentCompetitivenessScoped } from '@/components/admin/ContentCompetitivenessScoped';
import { MarketShareDiagnosisScoped } from '@/components/admin/MarketShareDiagnosisScoped';
import { PartnerLeaderboard } from '@/components/admin/PartnerLeaderboard';
import { ContentPatternStats } from '@/components/admin/ContentPatternStats';
import { CohortAnalysis } from '@/components/admin/CohortAnalysis';
import { SlugRivalry } from '@/components/admin/SlugRivalry';
import { DashboardSection } from '@/components/admin/DashboardSection';
import { CcsTrend } from '@/components/admin/CcsTrend';
import { CitationProof } from '@/components/admin/CitationProof';
import type {
  TierTrendPoint,
  ClientRankingItem,
  KeywordGroundingItem,
  NewDomainItem,
} from '@/components/admin/DashboardCharts';
import { DashboardFilters } from '@/components/admin/DashboardFilters';

/*
 * Round 169 (2026-08-20) — 모바일: DashboardChartsTabbed lazy 복구.
 * 정적 import 로 되돌아가 있어 recharts(≈120KB gzip)가 첫 페인트 경로에 다시 들어와 있었다.
 * 02 성과 분석은 기본 접힘이므로 모바일에선 대부분 아예 로드할 필요가 없다.
 */
const DashboardChartsTabbed = nextDynamic(
  () => import('@/components/admin/DashboardChartsTabbed').then((m) => m.DashboardChartsTabbed),
  {
    ssr: false,
    loading: () => (
      <div className="card flex h-56 items-center justify-center text-[12px] text-ink-muted md:h-64">
        차트 로딩 중…
      </div>
    ),
  }
);

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

type RecentCitation = {
  id: string;
  query: string;
  tenantName: string;
  engine: string;
  citedAt: string;
};

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
      // Round 169 (2026-08-20) — 모바일: '오늘 발행' KPI 신설에 따른 null 분기 보강
      publishedToday: 0,
      avg7d: 0,
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

  // 언어 스코프 (쿠키). scope≠all 이면 KPI 를 언어별로 필터.
  // 측정=keywords.lang(zh-Hant) / 콘텐츠=generated_contents.lang(zh-Hans) 분리.
  const scope = getScopeServer();
  const kwLang = scopeToKeywordLang(scope);
  const contentLang = scopeToContentLang(scope);

  // 스코프가 언어별이면 해당 lang 의 keyword_id 집합을 미리 계산.
  // 모든 측정(mentions/queries) 패널에 `.in('keyword_id', langKwIds)` 로 연쇄 필터.
  // (빈 배열이면 해당 언어 데이터 없음 → 패널 빈 값. null = 통합, 필터 없음.)
  // Round 165 — 다국어 시딩 후 keywords 가 1,000행 캡을 넘을 수 있어 페이지네이션.
  let langKwIds: number[] | null = null;
  if (kwLang) {
    const kwRows = await fetchAllRows<{ id: number }>((from, to) =>
      sb.from('keywords').select('id').eq('lang', kwLang).order('id').range(from, to)
    );
    langKwIds = kwRows.map((k) => k.id);
  }
  const langKwSet = langKwIds ? new Set(langKwIds) : null;

  // ────────────────────────────────────────────────────────────────────────
  // Round 165 (2026-08-18) — 대시보드 로딩속도 수술.
  //   기존: 최상단부터 ~35회의 supabase 왕복이 전부 직렬 (왕복당 50~150ms → TTFB 수 초).
  //   + responses/queries 대량 fetch 여러 곳이 1,000행 서버 캡에 조용히 잘려
  //   차트(티어 추이·클라이언트 랭킹·grounding·신규 도메인·시장 점유)가 최신
  //   1,000행만으로 계산되고 있었음 (30일 원본 ~4천 행 — Round 163 캡 실사고와 동일 계열).
  //   수술:
  //   ① 섹션별 async 함수로 묶어 Promise.all 병렬 실행 (직렬 의존은 섹션 내부에만)
  //   ② 대량 fetch 전부 fetchAllRows / fetchByIdChunks 로 전량 수집
  //   ③ 키워드별 멘션 집계를 mentions→responses→queries→keywords 역방향 단일
  //      체인으로 공용화 — 기존엔 topContents 와 structureStats 가 같은 집계를
  //      각자 keywords/queries 전방향 전체 스캔으로 중복 수행했음
  // ────────────────────────────────────────────────────────────────────────

  // 공유: domain_classifications (S7 tier 추이 · S8 신규 도메인 tier 라벨)
  const domainClassPromise = (async () => {
    const { data } = await sb
      .from('domain_classifications')
      .select('domain, tier')
      .eq('is_active', true);
    const m = new Map<string, string>();
    ((data ?? []) as Array<{ domain: string; tier: string }>).forEach((r) =>
      m.set(r.domain.toLowerCase(), r.tier)
    );
    return m;
  })();

  // 공유: 30일 키워드별 브랜드 멘션 수 (S9 topContents · S10 structureStats)
  const kwMentionCountPromise = (async (): Promise<Map<string, number>> => {
    const map = new Map<string, number>();
    try {
      const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const mentionRows = await fetchAllRows<{ response_id: number }>((from, to) =>
        sb
          .from('mentions')
          .select('response_id')
          .eq('is_target', true)
          .gte('created_at', since30)
          .order('id')
          .range(from, to)
      );
      if (mentionRows.length === 0) return map;
      const respCount = new Map<number, number>();
      mentionRows.forEach((m) =>
        respCount.set(m.response_id, (respCount.get(m.response_id) ?? 0) + 1)
      );
      const respRows = await fetchByIdChunks(Array.from(respCount.keys()), (chunk) =>
        sb.from('responses').select('id, query_id').in('id', chunk)
      );
      const respToQ = new Map<number, number>(
        (respRows as Array<{ id: number; query_id: number }>).map((r) => [r.id, r.query_id])
      );
      const qIds = Array.from(new Set(Array.from(respToQ.values())));
      const qRows = await fetchByIdChunks(qIds, (chunk) =>
        sb.from('queries').select('id, keyword_id').in('id', chunk)
      );
      const qToKwId = new Map<number, number>(
        (qRows as Array<{ id: number; keyword_id: number }>).map((q) => [q.id, q.keyword_id])
      );
      const kwIds = Array.from(new Set(Array.from(qToKwId.values())));
      const kwRows = await fetchByIdChunks(kwIds, (chunk) =>
        sb.from('keywords').select('id, text').in('id', chunk)
      );
      const kwIdToText = new Map<number, string>(
        (kwRows as Array<{ id: number; text: string }>).map((k) => [k.id, k.text])
      );
      respCount.forEach((cnt, respId) => {
        const qid = respToQ.get(respId);
        const kid = qid != null ? qToKwId.get(qid) : undefined;
        const text = kid != null ? kwIdToText.get(kid) : undefined;
        if (text) map.set(text, (map.get(text) ?? 0) + cnt);
      });
    } catch {
      /* graceful — 빈 맵이면 멘션 0 으로 표기 */
    }
    return map;
  })();

  // S1. 활성 클라이언트 — 자사 제외 tenants 카운트 (스코프 인지, Round 143h 분기 유지)
  const sectionClientCount = async (): Promise<number> => {
    if (!kwLang) {
      const { count } = await sb
        .from('tenants')
        .select('id', { count: 'exact', head: true })
        .neq('business_model', 'self')
        .neq('partner_slug', 'medimap-self');
      return count ?? 0;
    }
    if (kwLang === 'ko') {
      const { data: koTenantRows } = await sb
        .from('keywords')
        .select('tenant_id')
        .eq('lang', 'ko')
        .eq('is_active', true);
      return Array.from(
        new Set((koTenantRows ?? []).map((r: { tenant_id: number }) => r.tenant_id))
      ).length;
    }
    const { data: tpRows } = await sb
      .from('tenant_products')
      .select('tenant_id')
      .eq('lang', kwLang)
      .eq('status', 'active');
    return Array.from(new Set((tpRows ?? []).map((r: { tenant_id: number }) => r.tenant_id)))
      .length;
  };

  // S2. 검수 대기 — draft + pending COUNT (스코프: 콘텐츠 lang)
  const sectionPending = async (): Promise<number> => {
    let pendingQ = sb
      .from('generated_contents')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'pending']);
    if (contentLang) pendingQ = pendingQ.eq('lang', contentLang);
    const { count } = await pendingQ;
    return count ?? 0;
  };

  // S3. LLM 비용 — 오늘·어제·14일 (Round 116 Phase 5 3-tier 유지).
  //   기존 .limit(20000) 도 서버 캡(1,000)에 잘렸음 → 전량 수집.
  const sectionCost = async () => {
    let todayCost = 0;
    let yesterdayCost = 0;
    let cost14d = 0;
    let costError: string | null = null;
    try {
      const since14dIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const costRows = await fetchAllRows<{ cost_usd: number | null; called_at: string }>(
        (from, to) =>
          sb
            .from('llm_call_logs')
            .select('cost_usd, called_at')
            .gte('called_at', since14dIso)
            .order('id')
            .range(from, to)
      );
      // KST 기준 오늘/어제 판정 (UTC+9)
      const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
      const todayKst = kstNow.toISOString().slice(0, 10);
      const yestKst = new Date(kstNow.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      for (const r of costRows) {
        const usd = r.cost_usd ?? 0;
        cost14d += usd;
        const kstDay = new Date(new Date(r.called_at).getTime() + 9 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        if (kstDay === todayKst) todayCost += usd;
        else if (kstDay === yestKst) yesterdayCost += usd;
      }
    } catch (e) {
      costError = e instanceof Error ? e.message : String(e);
    }
    return { todayCost, yesterdayCost, cost14d, costError };
  };

  // S4. KPI 확장 — 24h/30일 브랜드 등장 · 오늘/이번 달 발행 · 측정 cron 헬스 (내부 병렬)
  const sectionKpi = async () => {
    let citations24h = 0;
    let citations30d = 0;
    let publishedThisMonth = 0;
    let publishedToday = 0;
    let published7d = 0;
    let lastCronAt: string | null = null;
    try {
      /*
       * Round 169 (2026-08-20) — 모바일: KST 월/일 경계 버그 수정 + '오늘 발행' 신설.
       *
       * 이전: startOfMonth.setUTCDate(1) — UTC 기준 월초라 매월 1일 00:00~08:59 KST
       *   에 발행된 글이 전월로 새어 "이번 달 발행"이 며칠간 과소 집계됐다.
       *   (운영자는 KST 로 일하고, published_at 은 UTC 저장)
       * 이제: 현재 시각을 +9h 시프트해 KST 달력상의 연/월/일을 얻고,
       *   그 KST 자정을 다시 -9h 해 UTC 경계값으로 되돌린다.
       */
      const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
      const kstNow = new Date(Date.now() + KST_OFFSET_MS);
      const kstY = kstNow.getUTCFullYear();
      const kstM = kstNow.getUTCMonth();
      const kstD = kstNow.getUTCDate();
      /** KST 이번 달 1일 00:00 → UTC ISO */
      const startOfMonth = new Date(Date.UTC(kstY, kstM, 1, 0, 0, 0, 0) - KST_OFFSET_MS);
      /** KST 오늘 00:00 → UTC ISO */
      const startOfToday = new Date(Date.UTC(kstY, kstM, kstD, 0, 0, 0, 0) - KST_OFFSET_MS);
      /** 직전 7일(오늘 제외) 시작 — 평균 발행량 기준선 */
      const start7d = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

      const pubBase = () => {
        let q = sb
          .from('generated_contents')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published')
          .eq('channel', 'blog_html');
        if (contentLang) q = q.eq('lang', contentLang);
        return q;
      };
      const pubQ = pubBase().gte('published_at', startOfMonth.toISOString());
      const pubTodayQ = pubBase().gte('published_at', startOfToday.toISOString());
      const pub7dQ = pubBase()
        .gte('published_at', start7d.toISOString())
        .lt('published_at', startOfToday.toISOString());
      // 세 카운트를 한 묶음으로 — 아래 분기의 Promise.all 안에서 그대로 병렬 실행된다.
      const pubsP = Promise.all([pubQ, pubTodayQ, pub7dQ]);
      let lastCronQ = sb
        .from('queries')
        .select('requested_at')
        .neq('engine', 'stub')
        .order('requested_at', { ascending: false })
        .limit(1);
      if (langKwIds && langKwIds.length > 0) {
        lastCronQ = lastCronQ.in('keyword_id', langKwIds);
      }
      if (kwLang) {
        const [c24r, c30r, pubs, lastR] = await Promise.all([
          sb.rpc('citation_count', { _hours: 24, _kw_lang: kwLang }),
          sb.rpc('citation_count', { _hours: 720, _kw_lang: kwLang }),
          pubsP,
          lastCronQ,
        ]);
        citations24h = Number(c24r.data) || 0;
        citations30d = Number(c30r.data) || 0;
        publishedThisMonth = pubs[0].count ?? 0;
        publishedToday = pubs[1].count ?? 0;
        published7d = pubs[2].count ?? 0;
        lastCronAt =
          (lastR.data?.[0] as { requested_at?: string } | undefined)?.requested_at ?? null;
      } else {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const [c24r, c30r, pubs, lastR] = await Promise.all([
          sb
            .from('mentions')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', yesterday)
            .eq('is_target', true),
          sb
            .from('mentions')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', cutoff30)
            .eq('is_target', true),
          pubsP,
          lastCronQ,
        ]);
        citations24h = c24r.count ?? 0;
        citations30d = c30r.count ?? 0;
        publishedThisMonth = pubs[0].count ?? 0;
        publishedToday = pubs[1].count ?? 0;
        published7d = pubs[2].count ?? 0;
        lastCronAt =
          (lastR.data?.[0] as { requested_at?: string } | undefined)?.requested_at ?? null;
      }
    } catch {
      /* graceful */
    }
    // Round 169 — 직전 7일 일평균. '오늘 발행'이 많은지 적은지 판단할 기준선.
    const avg7d = published7d / 7;
    return { citations24h, citations30d, publishedThisMonth, publishedToday, avg7d, lastCronAt };
  };

  // S5+S6. 최근 검수 대기 Top 3 + 최근 AI 인용(24h).
  //   Round 165 — recentCitations 의 tenantName 이 검수대기 테넌트 맵을 재사용하다
  //   맵에 없으면 '(unknown)' 으로 뜨던 것 수정: 멘션 테넌트 이름을 직접 fetch.
  const sectionDraftsAndRecent = async () => {
    let draftQ = sb
      .from('generated_contents')
      .select('id, tenant_id, title, keyword_text, llm_provider, compliance_status')
      .in('status', ['draft', 'pending'])
      .order('created_at', { ascending: false })
      .limit(3);
    if (contentLang) draftQ = draftQ.eq('lang', contentLang);
    const { data: draftRows } = await draftQ;

    const tenantIds = Array.from(
      new Set((draftRows ?? []).map((r: DraftRow) => r.tenant_id).filter((x) => x != null))
    );
    const tenantMap = new Map<number, string>();
    if (tenantIds.length > 0) {
      const { data: tenantsData } = await sb.from('tenants').select('id, name').in('id', tenantIds);
      (tenantsData ?? []).forEach((t: TenantRow) => {
        tenantMap.set(t.id, t.name ?? '(unknown)');
      });
    }
    const recentDrafts = (draftRows ?? []).map((r: DraftRow) => ({
      ...r,
      tenant_name: tenantMap.get(r.tenant_id) ?? '(unknown)',
    }));

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
        .limit(langKwIds ? 60 : 3);
      if (mentions && mentions.length > 0) {
        const respIds = Array.from(
          new Set(mentions.map((m: { response_id: number }) => m.response_id))
        );
        const mTenantIds = Array.from(
          new Set(mentions.map((m: { tenant_id: number }) => m.tenant_id))
        );
        const [respRes, mTenantsRes] = await Promise.all([
          sb.from('responses').select('id, query_id').in('id', respIds),
          sb.from('tenants').select('id, name').in('id', mTenantIds),
        ]);
        const mTenantMap = new Map<number, string>();
        (mTenantsRes.data ?? []).forEach((t: TenantRow) =>
          mTenantMap.set(t.id, t.name ?? '(unknown)')
        );
        const respMap = new Map<number, number>(
          (respRes.data ?? []).map((r: { id: number; query_id: number }) => [r.id, r.query_id])
        );
        const queryIds = Array.from(new Set(Array.from(respMap.values())));
        const { data: queries } = await sb
          .from('queries')
          .select('id, prompt, engine, keyword_id')
          .in('id', queryIds);
        const queryMap = new Map<number, { prompt: string; engine: string; keyword_id: number }>(
          (queries ?? []).map(
            (q: { id: number; prompt: string; engine: string; keyword_id: number }) => [
              q.id,
              { prompt: q.prompt, engine: q.engine, keyword_id: q.keyword_id },
            ]
          )
        );
        recentCitations = mentions
          .filter((m: { response_id: number }) => {
            if (!langKwSet) return true;
            const qid = respMap.get(m.response_id);
            const kwId = qid ? queryMap.get(qid)?.keyword_id : undefined;
            return kwId != null && langKwSet.has(kwId);
          })
          .slice(0, 3)
          .map(
            (m: { id: number; response_id: number; tenant_id: number; created_at: string }) => {
              const qid = respMap.get(m.response_id);
              const qInfo = qid ? queryMap.get(qid) : undefined;
              return {
                id: String(m.id),
                query: qInfo?.prompt ?? '(query 미발견)',
                tenantName: mTenantMap.get(m.tenant_id) ?? '(unknown)',
                engine: qInfo?.engine ?? '?',
                citedAt: m.created_at,
              };
            }
          );
      }
    } catch {
      /* mentions/queries query 실패 시 빈 list (graceful) */
    }
    return { recentDrafts, recentCitations };
  };

  // S7. 차트 — tier_trend (일자별 T1/T3/T4/T5/NOISE) + client_ranking (Top 5)
  const sectionCharts = async () => {
    let tierTrend: TierTrendPoint[] = [];
    let clientRanking: ClientRankingItem[] = [];
    try {
      const classMap = await domainClassPromise;

      // 최근 30일 responses (production 측정만, source_domains 있는 것) — 전량 수집
      const thirtyDaysAgo =
        useCustomRange && customCutoff
          ? customCutoff
          : new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
      const respRows = await fetchAllRows<{
        id: number;
        query_id: number;
        source_domains: Array<{ domain: string }> | null;
        created_at: string;
      }>((from, to) =>
        sb
          .from('responses')
          .select('id, query_id, source_domains, created_at')
          .gte('created_at', thirtyDaysAgo)
          .not('source_domains', 'is', null)
          .order('id')
          .range(from, to)
      );

      // query_id → tenant_id (tenantId/언어 스코프 필터는 JS 에서 — 청크 URL 길이 안전)
      const queryIdSet = Array.from(new Set(respRows.map((r) => r.query_id)));
      const queryTenantMap = new Map<number, number>();
      if (queryIdSet.length > 0) {
        const queryRows = await fetchByIdChunks(queryIdSet, (chunk) => {
          let qq = sb
            .from('queries')
            .select('id, tenant_id, keyword_id')
            .in('id', chunk)
            .neq('engine', 'stub');
          if (tenantId) qq = qq.eq('tenant_id', tenantId);
          return qq;
        });
        (queryRows as Array<{ id: number; tenant_id: number; keyword_id: number }>).forEach(
          (q) => {
            if (langKwSet && !langKwSet.has(q.keyword_id)) return;
            queryTenantMap.set(q.id, q.tenant_id);
          }
        );
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

      respRows.forEach((r) => {
        const rowTenantId = queryTenantMap.get(r.query_id);
        if (!rowTenantId) return; // stub engine, 스코프 밖 또는 누락
        const dateKey = r.created_at.slice(5, 10); // 'MM-DD'

        if (!trendMap.has(dateKey)) {
          trendMap.set(dateKey, { t1: 0, t3: 0, t4: 0, t5: 0, noise: 0, total: 0 });
        }
        const bucket = trendMap.get(dateKey)!;

        if (!clientMap.has(rowTenantId)) {
          clientMap.set(rowTenantId, { total: 0, t1: 0, t5: 0 });
        }
        const cbucket = clientMap.get(rowTenantId)!;

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
      });

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
    return { tierTrend, clientRanking };
  };

  // S8. Top 키워드 grounding rate + 신규 등장 도메인
  //
  // 🔴 Round 174 (2026-08-23) — fetchAllRows 3연발 → 단일 RPC.
  //   이전 구현은 responses.source_domains(jsonb)를 30일·7일·40~7일 세 창으로 끌어와
  //   JS 에서 집계했다. 실측: 30일 1,715행 3.4MB + 40~7일 2,072행 약 4MB + 7일 337행
  //   → 한 번 로드에 약 8MB, PostgREST 1,000행 페이지네이션이라 왕복만 6회 이상.
  //   여기에 keywords/tenants 청크 조회가 더 붙었다. force-dynamic 이라 매 조회마다 반복.
  //   테이블은 작다(responses 8,246행) — 인덱스가 아니라 왕복·페이로드 문제였다.
  //   dashboard_grounding() 이 같은 집계를 DB 안에서 끝내고 jsonb 하나만 돌려준다
  //   (실측 240ms). 집계 의미는 기존 JS 와 동일하게 맞췄다 — 숫자가 바뀌면 회귀로 오인된다.
  //   되돌리려면 이 블록을 git 이력의 fetchAllRows 버전으로 교체.
  const sectionGrounding = async () => {
    try {
      const cutoff =
        useCustomRange && customCutoff
          ? customCutoff
          : new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await sb.rpc('dashboard_grounding', {
        p_cutoff: cutoff,
        p_tenant: tenantId ?? null,
        p_kw_lang: kwLang ?? null,
      });
      if (error) throw error;
      const payload = (data ?? {}) as {
        keywordGrounding?: KeywordGroundingItem[];
        newDomains?: NewDomainItem[];
      };
      return {
        keywordGrounding: payload.keywordGrounding ?? [],
        newDomains: payload.newDomains ?? [],
      };
    } catch {
      // 실패해도 대시보드 전체를 죽이지 않는다 — 빈 차트로 graceful degrade (기존 동작).
      return { keywordGrounding: [] as KeywordGroundingItem[], newDomains: [] as NewDomainItem[] };
    }
  };

  // S9. 콘텐츠 경쟁력 (Round 87) — 발행 글의 키워드별 멘션 수 (공유 체인 재사용)
  const sectionTopContents = async () => {
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
      let pubQ2 = sb
        .from('generated_contents')
        .select(
          'id, title, slug, tenant_id, published_at, keyword_text, is_partner_content, partner_category'
        )
        .eq('status', 'published')
        .eq('channel', 'blog_html')
        .gte('published_at', since30)
        .order('published_at', { ascending: false })
        .limit(50);
      if (contentLang) pubQ2 = pubQ2.eq('lang', contentLang);
      const [pubRes, kwMentionMap] = await Promise.all([pubQ2, kwMentionCountPromise]);
      const pubList = (pubRes.data ?? []) as Array<{
        id: number;
        title: string;
        slug: string;
        tenant_id: number;
        published_at: string;
        keyword_text: string;
        is_partner_content: boolean;
        partner_category: string | null;
      }>;

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
    return topContents;
  };

  // S10. 콘텐츠 구조 자동 분석 (Round 89) — 공유 멘션 체인 재사용.
  //   기존엔 keywords 전체 + 30일 queries 전체 + responses 대량 .in 을 이 섹션이
  //   따로 스캔했음 (그마저 1,000행 캡에 잘림) — 페이지에서 가장 비싼 중복이었다.
  const sectionStructure = async () => {
    let structureStats: {
      totalCount: number;
      avgBodyLen: number;
      avgH2: number;
      avgTable: number;
      avgList: number;
      avgImg: number;
      faqSchemaPct: number;
      topPattern: {
        avgH2: number;
        avgTable: number;
        avgList: number;
        avgImg: number;
        avgBodyLen: number;
        faqSchemaPct: number;
      } | null;
    } = {
      totalCount: 0,
      avgBodyLen: 0,
      avgH2: 0,
      avgTable: 0,
      avgList: 0,
      avgImg: 0,
      faqSchemaPct: 0,
      topPattern: null,
    };
    try {
      let bodiesQ = sb
        .from('generated_contents')
        .select('id, body, keyword_text')
        .eq('status', 'published')
        .eq('channel', 'blog_html')
        .not('body', 'is', null)
        .limit(200);
      if (contentLang) bodiesQ = bodiesQ.eq('lang', contentLang);
      const [bodiesRes, kwMap] = await Promise.all([bodiesQ, kwMentionCountPromise]);
      const list = (bodiesRes.data ?? []) as Array<{
        id: number;
        body: string;
        keyword_text: string;
      }>;
      if (list.length > 0) {
        const countMatches = (text: string, re: RegExp) => (text.match(re) || []).length;
        // 🔴 Round 144 (2026-08-02) — 본문 길이 집계 버그 수정 유지: 태그 제거 후 실문자 수.
        const plainLen = (html: string) =>
          (html || '')
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&[a-z]+;/gi, '')
            .replace(/\s+/g, ' ')
            .trim().length;
        const metrics = list.map((c) => ({
          id: c.id,
          keyword: c.keyword_text,
          bodyLen: plainLen(c.body || ''),
          h2: countMatches(c.body || '', /<h2[\s>]/g),
          table: countMatches(c.body || '', /<table[\s>]/g),
          list: countMatches(c.body || '', /<(ul|ol)[\s>]/g),
          img: countMatches(c.body || '', /<img[\s>]/g),
          hasFaq: (c.body || '').includes('FAQPage'),
        }));
        const avg = (arr: number[]) => arr.reduce((s, n) => s + n, 0) / Math.max(arr.length, 1);
        const faqCount = metrics.filter((m) => m.hasFaq).length;

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
          topPattern:
            top10.length > 0
              ? {
                  avgBodyLen: Math.round(avg(top10.map((m) => m.bodyLen))),
                  avgH2: Math.round(avg(top10.map((m) => m.h2)) * 10) / 10,
                  avgTable: Math.round(avg(top10.map((m) => m.table)) * 10) / 10,
                  avgList: Math.round(avg(top10.map((m) => m.list)) * 10) / 10,
                  avgImg: Math.round(avg(top10.map((m) => m.img)) * 10) / 10,
                  faqSchemaPct: Math.round((topFaq / top10.length) * 100),
                }
              : null,
        };
      }
    } catch {
      /* graceful */
    }
    return structureStats;
  };

  // S11. AI 시장 점유 진단 (Round 88) — .limit(5000) 캡 잘림 → 전량 수집
  const sectionDomainDist = async () => {
    let domainDistribution: Array<{
      domain: string;
      citations: number;
      isOwn?: boolean;
      isCompetitor?: boolean;
    }> = [];
    let medimapDomainCitations = 0;
    let totalDomainCitations = 0;
    try {
      const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [respRows, classifierSets] = await Promise.all([
        fetchAllRows<{
          source_domains: Array<{ domain: string; final_url?: string | null }> | null;
        }>((from, to) =>
          sb
            .from('responses')
            .select('source_domains')
            .gte('created_at', cutoff30)
            .not('source_domains', 'is', null)
            .order('id')
            .range(from, to)
        ),
        // 🔴 Round 144 — substring 자사 판정 금지: domain_classifications T1 셋 단일 소스
        loadClassifierSets(),
      ]);
      const domainCount = new Map<string, number>();
      const domainFirstUrl = new Map<string, string | null>();
      let totalCount = 0;
      let medimapCount = 0;
      respRows.forEach((r) => {
        (r.source_domains ?? []).forEach((sd) => {
          const dom = (sd.domain || '').toLowerCase().replace(/^www\./, '');
          if (!dom) return;
          domainCount.set(dom, (domainCount.get(dom) ?? 0) + 1);
          if (!domainFirstUrl.has(dom)) domainFirstUrl.set(dom, sd.final_url ?? null);
          totalCount++;
          if (classifyDomain(sd.domain, sd.final_url ?? null, null, classifierSets) === 'T1') {
            medimapCount++;
          }
        });
      });

      // 경쟁사 도메인 (수기 + 위서클 클라이언트 도메인 제외 + 권위 제외)
      const COMPETITOR_PATTERNS = ['eye', 'clinic', 'hospital', 'medic', '안과', 'derm', 'plastic', 'hair'];
      const AUTHORITY = new Set(['namu.wiki', 'youtube.com', 'modoodoc.com', 'hidoc.co.kr', 'news.hidoc.co.kr', 'v.daum.net', 'edu.donga.com', 'news.naver.com']);
      domainDistribution = Array.from(domainCount.entries())
        .map(([domain, citations]) => {
          const isOwn =
            classifyDomain(domain, domainFirstUrl.get(domain) ?? null, null, classifierSets) ===
            'T1';
          const isAuth = AUTHORITY.has(domain);
          const isCompetitor =
            !isOwn && !isAuth && COMPETITOR_PATTERNS.some((p) => domain.includes(p));
          return { domain, citations, isOwn, isCompetitor };
        })
        .sort((a, b) => b.citations - a.citations);
      medimapDomainCitations = medimapCount;
      totalDomainCitations = totalCount;
    } catch {
      /* graceful */
    }
    return { domainDistribution, medimapDomainCitations, totalDomainCitations };
  };

  // ── 전 섹션 병렬 실행 ──
  const [
    clientCount,
    pendingCount,
    cost,
    kpi,
    draftsAndRecent,
    charts,
    grounding,
    topContents,
    structureStats,
    domainDist,
  ] = await Promise.all([
    sectionClientCount(),
    sectionPending(),
    sectionCost(),
    sectionKpi(),
    sectionDraftsAndRecent(),
    sectionCharts(),
    sectionGrounding(),
    sectionTopContents(),
    sectionStructure(),
    sectionDomainDist(),
  ]);

  return {
    activeTenants: clientCount ?? 0,
    pendingQueue: pendingCount ?? 0,
    todayCost: cost.todayCost,
    yesterdayCost: cost.yesterdayCost,
    cost14d: cost.cost14d,
    citations24h: kpi.citations24h,
    citations30d: kpi.citations30d,
    publishedThisMonth: kpi.publishedThisMonth,
    publishedToday: kpi.publishedToday,
    avg7d: kpi.avg7d,
    lastCronAt: kpi.lastCronAt,
    recentDrafts: draftsAndRecent.recentDrafts,
    recentCitations: draftsAndRecent.recentCitations,
    tierTrend: charts.tierTrend,
    clientRanking: charts.clientRanking,
    keywordGrounding: grounding.keywordGrounding,
    newDomains: grounding.newDomains,
    topContents,
    domainDistribution: domainDist.domainDistribution,
    medimapDomainCitations: domainDist.medimapDomainCitations,
    totalDomainCitations: domainDist.totalDomainCitations,
    structureStats,
    error: cost.costError,
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
  // Round 165 — 셀렉터용 tenants 목록을 대시보드 집계와 병렬로 (직렬 왕복 1회 제거)
  const sbForTenants = getServerClient();
  const [d, tenantsRes] = await Promise.all([
    fetchDashboardData({ periodDays, tenantId, fromDate, toDate }),
    sbForTenants
      ? sbForTenants.from('tenants').select('id, name').order('name')
      : Promise.resolve({ data: null as Array<{ id: number; name: string }> | null }),
  ]);
  const tenantsList: Array<{ id: number; name: string }> = tenantsRes.data ?? [];

  // Round 86/87 — KPI 4 → 6 확장. 운영자가 매일 보는 핵심 메트릭 우선.
  //   추가: 30일 누적 멘션 (성과) · 이번 달 발행 (생산성).
  //   24h 인용은 작은 표본 부족 → 30일 누적이 더 의미 있음.
  /*
   * Round 169 (2026-08-20) — 모바일: KPI 힌트를 '판단 근거가 앞'으로 재작성 + 상태색 연동.
   *
   * 모바일 2열 그리드에서 힌트는 한 줄에 12~16자밖에 안 들어간다. 기존엔
   * `14일 $X · 한도 $5/일` 처럼 판단 기준(한도)이 뒤에 있어 truncate 로 잘려나갔다.
   * → 기준을 앞으로 옮기고 line-clamp-2 로 두 줄까지 허용.
   * 또 숫자만 봐서는 정상/위험을 알 수 없어 tone 으로 값 색상을 연동한다.
   */
  const DAILY_COST_LIMIT = 5; // MAX_DAILY_USD 가드와 동일 기준
  const shownCost = d.todayCost > 0 ? d.todayCost : d.yesterdayCost;
  const cronHoursAgo = d.lastCronAt
    ? (Date.now() - new Date(d.lastCronAt).getTime()) / 3600000
    : null;

  type KpiTone = 'danger' | 'warning' | undefined;
  const KPIS: Array<{
    label: string;
    value: string | number;
    suffix: string;
    href: string;
    icon: typeof Users;
    hint: string;
    tone?: KpiTone;
  }> = [
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
      hint: d.pendingQueue > 5 ? `5건 초과 누적 · 지금 ${d.pendingQueue}건` : `정상 범위 · ${d.pendingQueue}건`,
      tone: d.pendingQueue > 5 ? 'danger' : undefined,
    },
    {
      // Round 144 — 소스가 mentions 테이블(브랜드 언급)이므로 "인용" 라벨 제거.
      //   실제 출처 인용 수는 AI 인용 추적 페이지의 자사 인용 증거(30일 9건)를 볼 것.
      label: '30일 브랜드 등장',
      value: (d.citations30d ?? 0).toLocaleString(),
      suffix: '건',
      href: '/admin/citations',
      icon: Zap,
      hint: `출처 인용 아님 · 24h ${d.citations24h ?? 0}건`,
    },
    {
      // Round 169 — '이번 달 발행' → '오늘 발행'. 매일 보는 화면의 KPI 는
      //   오늘 손댈 거리를 말해야 한다. 이번 달 누계는 힌트로 내린다.
      label: '오늘 발행',
      value: d.publishedToday ?? 0,
      suffix: '편',
      href: '/admin/content-queue',
      icon: FileText,
      hint: `7일 평균 ${(d.avg7d ?? 0).toFixed(1)}편 · 이번 달 ${d.publishedThisMonth ?? 0}편`,
    },
    {
      // Round 116 Phase 5 (2026-07-02): 오늘값이 0이면 어제/14일 노출로 실미터링 상태 명시.
      label: d.todayCost > 0 ? '오늘 LLM 비용' : '어제 LLM 비용',
      value: `$${shownCost.toFixed(2)}`,
      suffix: '',
      href: '/admin/cost',
      icon: DollarSign,
      hint: `한도 $${DAILY_COST_LIMIT}/일 · 14일 $${d.cost14d.toFixed(2)}`,
      tone: shownCost >= DAILY_COST_LIMIT * 0.8 ? 'warning' : undefined,
    },
    {
      label: '측정 cron 상태',
      value: cronHoursAgo === null ? '데이터 없음' : cronHoursAgo < 26 ? '정상' : '지연',
      suffix: '',
      href: '/admin/citations',
      icon: TrendingUp,
      hint:
        d.lastCronAt && cronHoursAgo !== null
          ? `${new Date(d.lastCronAt).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })} 실행 · ${
              cronHoursAgo < 1 ? '방금' : `${Math.floor(cronHoursAgo)}시간 전`
            }`
          : 'Run workflow 필요',
      tone: cronHoursAgo !== null && cronHoursAgo >= 26 ? 'danger' : undefined,
    },
  ];

  // Round 169 (2026-08-20) — 모바일: 필터 접힘 summary 문구 (선택 상태를 접힌 채로 읽게)
  const filterSummary = `${
    tenantId ? tenantsList.find((t) => t.id === tenantId)?.name ?? '선택 클라이언트' : '전체'
  } · ${isCustom ? `${fromDate} ~ ${toDate}` : `${periodDays}일`}`;

  return (
    // Round 169 (2026-08-20) — 모바일: 좌우 여백 px-6 → px-4 (360px 화면에서 본문 폭 +16px)
    <div className="mx-auto max-w-[1536px] px-4 py-5 md:px-6 md:py-6 lg:px-10">
      {/* Round 119 (2026-07-03) — UI/UX 재설계: 3존 재그룹핑.
          헤더(+필터 상단 고정) → KPI 통합 스트립 → 01 지금 봐야 할 것(액션·시장·신규도메인)
          → 02 성과 분석(추이·콘텐츠·패턴·파트너) → 03 운영 로그(검수·인용·크롤러·카카오).
          변경은 조립 마크업만 — fetchDashboardData/위젯 로직 무변경 (design-only 규칙). */}

      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink/90 pb-5">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-faint">
            WECIRCLE GEO · OPERATIONS
          </div>
          <h1 className="admin-page-title mt-1">운영 대시보드</h1>
          <p className="admin-page-desc">
            전체 클라이언트의 KPI · 발행 추이 · AI 인용 점유율을 한눈에 확인합니다
          </p>
        </div>
      </header>

      {/* KPI 통합 스트립 — 6개 낱장 카드 → 단일 카드 + 내부 분할.
          기존 '측정·엔진 현황' 카드(중복: cron/30일 인용/14일 비용)는 여기로 흡수.
          Round 169 (2026-08-20) — 모바일:
            · sticky top-14 (햄버거 헤더 바로 아래) — 아래로 스크롤해도 상태가 따라온다.
            · 숫자 text-[26px] / 힌트 line-clamp-2 text-[11px] — 2열 그리드에서 스캔 가능하게.
            · tone 으로 값 색상 연동 (검수 대기 초과=danger, cron 지연=danger, 비용 80%=warning). */}
      <section className="card sticky top-14 z-10 mt-5 overflow-hidden p-0 md:static md:mt-6">
        <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-3 xl:grid-cols-6">
          {KPIS.map((k) => {
            const Icon = k.icon;
            return (
              <Link
                key={k.label}
                href={k.href}
                className="group bg-surface-base px-3.5 py-3.5 transition hover:bg-surface-subtle md:px-4 md:py-4"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="min-w-0 break-keep text-[10px] font-bold uppercase leading-tight tracking-widest text-ink-muted">
                    {k.label}
                  </span>
                  <Icon className="h-3.5 w-3.5 shrink-0 text-accent-deep/70 transition group-hover:text-accent-deep" />
                </div>
                <div className="mt-2 flex items-baseline gap-1 md:mt-2.5">
                  <span
                    className={cn(
                      'text-[26px] font-black leading-none tabular-nums tracking-tight md:text-2xl md:leading-tight',
                      k.tone === 'danger'
                        ? 'text-status-danger'
                        : k.tone === 'warning'
                        ? 'text-status-warning'
                        : 'text-ink',
                    )}
                  >
                    {k.value}
                  </span>
                  <span className="text-xs font-medium text-ink-muted">{k.suffix}</span>
                </div>
                <div className="mt-1.5 flex items-start gap-1.5">
                  {k.label === '측정 cron 상태' && (
                    <span className="mt-1 flex shrink-0 gap-1" aria-label="측정 엔진: Gemini · Claude · ChatGPT">
                      <span className="h-1.5 w-1.5 rounded-full bg-engine-gemini" />
                      <span className="h-1.5 w-1.5 rounded-full bg-engine-claude" />
                      <span className="h-1.5 w-1.5 rounded-full bg-engine-chatgpt" />
                    </span>
                  )}
                  <span className="line-clamp-2 break-keep text-[11px] leading-snug text-ink-muted">
                    {k.hint}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 기간 · 클라이언트 필터 — Round 169: KPI 스트립 아래로 이동.
          KPI(오늘 상태)가 먼저 보여야 하고, 필터는 그 다음에 조정하는 도구이기 때문.
          모바일은 <details> 로 접고 summary 에 현재 선택을 요약 표시(한 줄 절약). */}
      <div className="mt-4 md:mt-0">
        <details className="group md:hidden">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-border bg-surface-base px-3.5 py-2 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                필터
              </span>
              <span className="truncate text-[13px] font-semibold text-ink">{filterSummary}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
          </summary>
          <DashboardFilters
            tenants={tenantsList}
            currentTenantId={tenantId}
            currentPeriod={isCustom ? 'custom' : String(periodDays)}
            currentFrom={fromDate}
            currentTo={toDate}
          />
        </details>
        <div className="hidden md:block">
          <DashboardFilters
            tenants={tenantsList}
            currentTenantId={tenantId}
            currentPeriod={isCustom ? 'custom' : String(periodDays)}
            currentFrom={fromDate}
            currentTo={toDate}
          />
        </div>
      </div>

      {/* === 01 지금 봐야 할 것 — 액션 권고 · 시장 점유 진단 · 신규 등장 도메인 === */}
      <div className="mt-8">
        <div className="flex items-baseline gap-3 border-b border-border pb-3">
          <span className="font-mono text-[11px] font-black tracking-widest text-iris">01</span>
          <h2 className="text-[15px] font-black tracking-tight text-ink">지금 봐야 할 것</h2>
          <span className="hidden text-[11px] text-ink-muted sm:inline">
            액션 권고 · AI 시장 점유 진단 · 신규 등장 도메인
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          {/* 좌: 액션 권고 + 신규 등장 도메인 스택 — 우측(시장 진단 표)과 높이 균형 (Round 119-b) */}
          <div className="space-y-4 [&_section]:!mt-0">
            <ActionRecommendations
              keywordGrounding={d.keywordGrounding}
              pendingQueue={d.pendingQueue}
              lastCronAt={d.lastCronAt}
              citations30d={d.citations30d}
              publishedThisMonth={d.publishedThisMonth}
            />
            <DashboardCharts
              tierTrend={d.tierTrend}
              clientRanking={d.clientRanking}
              keywordGrounding={d.keywordGrounding}
              newDomains={d.newDomains}
              showTierAndRankingCharts={false}
            />
          </div>
          <div className="[&_section]:!mt-0">
            <MarketShareDiagnosisScoped
              initialDomains={d.domainDistribution ?? []}
              initialMedimap={d.medimapDomainCitations ?? 0}
              initialTotal={d.totalDomainCitations ?? 0}
              daysWindow={30}
            />
          </div>
        </div>
        <div className="mt-4">
          <CcsTrend days={periodDays} />
        </div>
        <div className="mt-4">
          <CitationProof />
        </div>
      </div>

      {/* === 02 성과 분석 — Round 144: 접이식. 매일 보는 화면이 아니라 주간 판단용. === */}
      <DashboardSection
        no="02"
        title="성과 분석"
        desc="코호트 · 주제 경쟁 · 측정 추이 · 파트너 현황"
        storageKey="perf"
        /* Round 169 (2026-08-20) — 모바일: 주석의 원래 의도(주간 판단용)대로 기본 접힘.
           모바일에서 첫 화면 스크롤 길이를 줄이고 recharts 다운로드도 유예된다. */
        defaultCollapsed
      >
        <div className="mt-4 space-y-4 [&>section]:!mt-0 [&>*>section:first-child]:!mt-0">
          <DashboardChartsTabbed
            tierTrend={d.tierTrend}
            clientRanking={d.clientRanking}
            keywordGrounding={d.keywordGrounding}
          />
          {/* Round 144 — 코호트를 구조 통계보다 위에 둔다.
              "인용 0"이 실패인지 미성숙인지 먼저 알아야 구조 통계를 해석할 수 있음. */}
          <CohortAnalysis />
          <SlugRivalry />
          <ContentCompetitivenessScoped initialContents={d.topContents ?? []} />
          <ContentPatternStats stats={d.structureStats} />
          <PartnerLeaderboard />
        </div>
      </DashboardSection>

      {/* === 03 운영 로그 — Round 144: 기본 접힘. 문제가 있을 때만 펼쳐 보는 영역. === */}
      <DashboardSection
        no="03"
        title="운영 로그"
        desc="검수 대기 · 최근 AI 인용 · 유입 실측"
        storageKey="oplog"
        defaultCollapsed
      >
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="section-title">최근 검수 대기 (Top 3)</h2>
            <Link
              href="/admin/content-queue"
              className="text-xs font-semibold text-ink hover:underline"
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
              className="text-xs font-semibold text-ink hover:underline"
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

      {/* 유입·크롤 실측 — 데이터 누적 전이라 운영 로그 존 하단으로 격하 배치 (Round 119).
          데이터가 쌓이면 02 성과 분석 존으로 승격 검토. */}
      {/*
        🔴 Round 144 (2026-08-02) — 빈 위젯 2개(AI CRAWLER RADAR / KAKAO FUNNEL) 제거.
        둘 다 데이터 소스가 연결되지 않아 상시 "로그가 없습니다"만 표시됐음.
        빈 상태 문구는 "아직 없음"이 아니라 "이 제품은 미완성"으로 읽히고,
        클라이언트에게 화면을 공유할 수 없게 만드는 요소였음.
        소스가 실제로 연결되면(미들웨어 크롤러 감지 / /api/track/kakao beacon)
        그때 다시 노출. 컴포넌트는 삭제하지 않고 import 만 해제.
      */}
      <div className="mt-4 rounded-lg border border-border bg-surface-subtle/40 px-4 py-3 text-[11px] text-ink-muted">
        유입·전환 실측(AI 크롤러 방문 · 카카오 CTA 클릭)은 추적 인프라 연결 후 표시됩니다.
        현재 ShortLink 발급 0건 — 발행 콘텐츠의 CTA 가 추적 링크로 변환되지 않은 상태입니다.
      </div>
      </DashboardSection>

      {d.error && (
        <div className="mt-6 rounded-md border border-status-warningSoft bg-status-warningSoft/30 px-4 py-3 text-xs text-status-warning">
          ⚠️ 일부 데이터 fetch 에러: {d.error}
        </div>
      )}
    </div>
  );
}
