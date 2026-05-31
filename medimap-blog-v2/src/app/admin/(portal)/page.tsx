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
import { ArrowUpRight, ClipboardCheck, DollarSign, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { getServerClient } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import {
  DashboardCharts,
  type TierTrendPoint,
  type ClientRankingItem,
  type KeywordGroundingItem,
  type NewDomainItem,
} from '@/components/admin/DashboardCharts';
import { DashboardFilters } from '@/components/admin/DashboardFilters';

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

  // 3. 오늘 LLM 비용 — llm_call_logs 합산 (today UTC)
  // 컬럼 확인 — tokens_input, tokens_output, cost_usd 가 있을 것 (없을 수도)
  let todayCost = 0;
  let costError: string | null = null;
  try {
    const todayUtc = new Date().toISOString().slice(0, 10);
    const { data: costRows, error: costErr } = await sb
      .from('llm_call_logs')
      .select('cost_usd')
      .gte('called_at', `${todayUtc}T00:00:00Z`)
      .lt('called_at', `${todayUtc}T23:59:59Z`);
    if (costErr) {
      costError = costErr.message;
    } else {
      todayCost = (costRows ?? []).reduce(
        (sum, r: { cost_usd: number | null }) => sum + (r.cost_usd ?? 0),
        0
      );
    }
  } catch (e) {
    costError = e instanceof Error ? e.message : String(e);
  }

  // Round 31 (2026-05-30): mentions 테이블에서 24h 인용 카운트.
  // measure-ai-mentions.yml cron 이 매일 07:00 KST 에 4 엔진 호출 → mentions INSERT.
  // is_target=true 인 mention 만 카운트 (메디맵 또는 자사 tenant 가 직접 mentioned).
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

  return {
    activeTenants: clientCount ?? 0,
    pendingQueue: pendingCount ?? 0,
    todayCost,
    citations24h,
    recentDrafts,
    recentCitations,
    tierTrend,
    clientRanking,
    keywordGrounding,
    newDomains,
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

  const KPIS = [
    {
      label: '활성 클라이언트',
      value: d.activeTenants,
      suffix: '개',
      href: '/admin/tenants',
      icon: Users,
    },
    {
      label: '검수 대기',
      value: d.pendingQueue,
      suffix: '건',
      href: '/admin/content-queue',
      icon: ClipboardCheck,
    },
    {
      label: '오늘 LLM 비용',
      value: `$${d.todayCost.toFixed(2)}`,
      suffix: '',
      href: '/admin/cost',
      icon: DollarSign,
    },
    {
      label: '24h AI 인용',
      value: d.citations24h,
      suffix: '건',
      href: '/admin/citations',
      icon: Zap,
    },
  ];

  return (
    <div className="px-8 py-6">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">운영 대시보드</h1>
          <p className="admin-page-desc">전체 클라이언트 KPI 한눈에 · 발행 추이 · AI 인용 share</p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <Link
              key={k.label}
              href={k.href}
              className="card card-pad transition hover:border-brand-200"
            >
              <div className="flex items-start justify-between">
                <div className="kpi-label">{k.label}</div>
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <div className="kpi-value">{k.value}</div>
                <span className="text-sm text-ink-muted">{k.suffix}</span>
              </div>
            </Link>
          );
        })}
      </section>

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

      {/* Round 37 H + Round 38 B (2026-05-31) — KPI 차트 5개 */}
      <section className="mt-3">
        <DashboardCharts
          tierTrend={d.tierTrend}
          clientRanking={d.clientRanking}
          keywordGrounding={d.keywordGrounding}
          newDomains={d.newDomains}
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
