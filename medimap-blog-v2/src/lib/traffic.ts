/**
 * Round 157 (2026-08-16) — 유입 분석 (/admin/traffic) 데이터 계층.
 *
 * 원천: search-traffic-sync cron 이 적재한 gsc_daily / gsc_query_daily /
 * ga4_daily / ga4_source_daily. 집계는 SQL RPC (traffic_* — supabase-js 의
 * 1000행 캡·group by 불가 회피), 콘텐츠·병원 귀속은 여기서 수행.
 *
 * URL 귀속 규칙 (실측 경로 구조):
 *   /with-partners/{category}/{partnerSlug}/{contentSlug} → 파트너 콘텐츠
 *   /blog/{slug}                                          → 자사 블로그 콘텐츠
 *   /en|/ja|/zh/... 마지막 세그먼트가 slug 면 해외 콘텐츠
 *   GSC page 는 풀 URL + 한글 슬러그 percent-encoding → decodeURIComponent 필수
 *   (Round 148 교훈: 한글 슬러그는 인코딩/디코딩 양쪽 다 대비)
 */
import { getServerClient } from '@/lib/supabase';

export interface DailyPoint {
  d: string;
  gscClicks: number;
  gscImpressions: number;
  ga4Sessions: number;
  aiSessions: number;
}

export interface TenantTraffic {
  tenantId: number;
  tenantName: string;
  contents: number; // 유입 잡힌 콘텐츠 수
  gscClicks: number;
  gscImpressions: number;
  ga4Sessions: number;
}

export interface ContentTraffic {
  path: string;
  title: string | null;
  tenantName: string | null;
  keyword: string | null;
  gscClicks: number;
  gscImpressions: number;
  avgPosition: number | null;
  ga4Sessions: number;
}

export interface QueryTraffic {
  query: string;
  clicks: number;
  impressions: number;
  avgPosition: number;
  matchedKeyword: string | null; // 측정 키워드 풀과 매칭되면 그 키워드
}

export interface SourceTraffic {
  source: string;
  medium: string;
  sessions: number;
  isAi: boolean;
  /** Round 158 — direct·vercel·GSC 콘솔 클릭 등 운영/개발 추정 트래픽. 실질 외부 유입에서 제외. */
  isInternal: boolean;
}

/** Round 158 — 1페이지 직전 순위 레버 (analyze_rank_levers.py 와 동일 기준) */
export interface LeverQuery {
  query: string;
  impressions: number;
  clicks: number;
  avgPosition: number;
  matchedKeyword: string | null; // 측정 키워드 풀 매칭 → 커버 중
}

export interface TrafficDashboard {
  series: DailyPoint[];
  tenants: TenantTraffic[];
  contents: ContentTraffic[];
  queries: QueryTraffic[];
  sources: SourceTraffic[];
  levers: LeverQuery[];
  totals: {
    gscClicks: number;
    gscImpressions: number;
    ga4Sessions: number;
    aiSessions: number;
    /** 내부·개발 추정 트래픽 제외 세션 (Round 158) */
    externalSessions: number;
    gscDays: number;
    ga4Days: number;
  };
  errors: string[];
}

/** 운영자 direct·개발(vercel)·GSC 콘솔 경유 등 — 실질 외부 유입이 아닌 소스 */
export function isInternalSource(source: string, medium: string): boolean {
  const s = (source || '').toLowerCase();
  if (s === '(direct)' && (medium || '(none)') === '(none)') return true;
  if (s.includes('vercel.')) return true;
  if (s === 'search.google.com') return true; // GSC 콘솔에서 운영자가 클릭한 것
  if (s.includes('localhost')) return true;
  return false;
}

interface ContentRow {
  id: number;
  slug: string | null;
  title: string | null;
  tenant_id: number | null;
  keyword_text: string | null;
  lang: string | null;
}

/** URL 또는 path → 정규화된 path (decode + trailing slash 제거) */
function normalizePath(raw: string): string {
  let p = raw;
  if (/^https?:\/\//i.test(p)) {
    try {
      p = new URL(p).pathname;
    } catch {
      /* 그대로 진행 */
    }
  }
  const q = p.indexOf('?');
  if (q >= 0) p = p.slice(0, q);
  try {
    p = decodeURIComponent(p);
  } catch {
    /* 잘못된 인코딩은 원문 유지 */
  }
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p || '/';
}

function pathLang(path: string): string {
  if (path.startsWith('/en/') || path === '/en') return 'en';
  if (path.startsWith('/ja/') || path === '/ja') return 'ja';
  if (path.startsWith('/zh/') || path === '/zh') return 'zh-Hans';
  return 'ko';
}

/** 콘텐츠 귀속: path → generated_contents (slug 우선, 언어 프리픽스로 변형 구분) */
function buildResolver(contents: ContentRow[], partnerSlugToTenant: Map<string, number>) {
  const bySlug = new Map<string, ContentRow[]>();
  contents.forEach((c) => {
    if (!c.slug) return;
    const key = c.slug.toLowerCase();
    const arr = bySlug.get(key) ?? [];
    arr.push(c);
    bySlug.set(key, arr);
  });

  return function resolve(path: string): { content: ContentRow | null; tenantId: number | null } {
    const segs = path.split('/').filter(Boolean);
    if (segs.length === 0) return { content: null, tenantId: null };

    const last = segs[segs.length - 1].toLowerCase();
    const candidates = bySlug.get(last);
    if (candidates && candidates.length > 0) {
      const lang = pathLang(path);
      const match = candidates.find((c) => (c.lang ?? 'ko') === lang) ?? candidates[0];
      return { content: match, tenantId: match.tenant_id };
    }
    // 콘텐츠 slug 미일치 — 파트너 경로면 병원 단위로만 귀속
    if (segs[0] === 'with-partners' && segs.length >= 3) {
      const tid = partnerSlugToTenant.get(segs[2].toLowerCase());
      if (tid !== undefined) return { content: null, tenantId: tid };
    }
    return { content: null, tenantId: null };
  };
}

export async function fetchTrafficDashboard(days = 28): Promise<TrafficDashboard> {
  const errors: string[] = [];
  const emptyTotals = {
    gscClicks: 0, gscImpressions: 0, ga4Sessions: 0, aiSessions: 0, externalSessions: 0, gscDays: 0, ga4Days: 0,
  };
  const sb = getServerClient();
  if (!sb) {
    return {
      series: [], tenants: [], contents: [], queries: [], sources: [], levers: [],
      totals: emptyTotals, errors: ['Supabase 미연결'],
    };
  }

  // 🔴 Round 153 교훈 — error 를 버리면 빈 화면으로 위장한다. 전부 표면화.
  const [seriesRes, gscPagesRes, ga4PagesRes, queriesRes, sourcesRes, contentsRes, tenantsRes, keywordsRes] =
    await Promise.all([
      sb.rpc('traffic_daily_series', { p_days: 90 }),
      sb.rpc('traffic_gsc_pages', { p_days: days, p_limit: 500 }),
      sb.rpc('traffic_ga4_pages', { p_days: days, p_limit: 500 }),
      sb.rpc('traffic_gsc_queries', { p_days: days, p_limit: 100 }),
      sb.rpc('traffic_ga4_sources', { p_days: days, p_limit: 50 }),
      sb.from('generated_contents')
        .select('id, slug, title, tenant_id, keyword_text, lang')
        .eq('status', 'published'),
      sb.from('tenants').select('id, name, partner_slug'),
      sb.from('keywords').select('text').eq('is_active', true),
    ]);

  const collect = (label: string, e: { message: string } | null) => {
    if (e) errors.push(`${label}: ${e.message}`);
  };
  collect('daily_series', seriesRes.error);
  collect('gsc_pages', gscPagesRes.error);
  collect('ga4_pages', ga4PagesRes.error);
  collect('gsc_queries', queriesRes.error);
  collect('ga4_sources', sourcesRes.error);
  collect('contents', contentsRes.error);
  collect('tenants', tenantsRes.error);
  collect('keywords', keywordsRes.error);

  const contents = (contentsRes.data ?? []) as ContentRow[];
  const tenants = (tenantsRes.data ?? []) as { id: number; name: string; partner_slug: string | null }[];
  const keywordPool = ((keywordsRes.data ?? []) as { text: string | null }[])
    .map((k) => (k.text ?? '').trim())
    .filter((t) => t.length >= 2);

  const tenantName = new Map<number, string>(tenants.map((t) => [t.id, t.name]));
  const partnerSlugToTenant = new Map<string, number>();
  tenants.forEach((t) => {
    if (t.partner_slug) partnerSlugToTenant.set(t.partner_slug.toLowerCase(), t.id);
  });
  const resolve = buildResolver(contents, partnerSlugToTenant);

  // ---- path 단위 병합 (GSC + GA4) → 콘텐츠·병원 귀속
  interface PathAgg {
    path: string;
    gscClicks: number;
    gscImpressions: number;
    posWeighted: number;
    ga4Sessions: number;
  }
  const byPath = new Map<string, PathAgg>();
  const touch = (path: string): PathAgg => {
    const found = byPath.get(path);
    if (found) return found;
    const fresh: PathAgg = { path, gscClicks: 0, gscImpressions: 0, posWeighted: 0, ga4Sessions: 0 };
    byPath.set(path, fresh);
    return fresh;
  };

  ((gscPagesRes.data ?? []) as { page: string; clicks: number; impressions: number; avg_position: number | null }[])
    .forEach((r) => {
      const agg = touch(normalizePath(r.page));
      agg.gscClicks += Number(r.clicks) || 0;
      agg.gscImpressions += Number(r.impressions) || 0;
      agg.posWeighted += (Number(r.avg_position) || 0) * (Number(r.impressions) || 0);
    });
  ((ga4PagesRes.data ?? []) as { page_path: string; sessions: number }[]).forEach((r) => {
    const agg = touch(normalizePath(r.page_path));
    agg.ga4Sessions += Number(r.sessions) || 0;
  });

  const tenantAgg = new Map<number, TenantTraffic>();
  const contentRows: ContentTraffic[] = [];
  byPath.forEach((agg) => {
    const { content, tenantId } = resolve(agg.path);
    if (tenantId !== null && tenantName.has(tenantId)) {
      const t = tenantAgg.get(tenantId) ?? {
        tenantId,
        tenantName: tenantName.get(tenantId) ?? `#${tenantId}`,
        contents: 0,
        gscClicks: 0,
        gscImpressions: 0,
        ga4Sessions: 0,
      };
      t.gscClicks += agg.gscClicks;
      t.gscImpressions += agg.gscImpressions;
      t.ga4Sessions += agg.ga4Sessions;
      if (content) t.contents += 1;
      tenantAgg.set(tenantId, t);
    }
    contentRows.push({
      path: agg.path,
      title: content?.title ?? null,
      tenantName: tenantId !== null ? tenantName.get(tenantId) ?? null : null,
      keyword: content?.keyword_text ?? null,
      gscClicks: agg.gscClicks,
      gscImpressions: agg.gscImpressions,
      avgPosition: agg.gscImpressions > 0 ? agg.posWeighted / agg.gscImpressions : null,
      ga4Sessions: agg.ga4Sessions,
    });
  });

  contentRows.sort(
    (a, b) => b.gscClicks - a.gscClicks || b.ga4Sessions - a.ga4Sessions || b.gscImpressions - a.gscImpressions
  );

  // ---- 검색어 × 측정 키워드 매칭
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  const normalizedPool = keywordPool.map((k) => ({ raw: k, norm: normalize(k) }));
  const queries: QueryTraffic[] = (
    (queriesRes.data ?? []) as { query: string; clicks: number; impressions: number; avg_position: number | null }[]
  ).map((r) => {
    const qn = normalize(r.query);
    const matched = normalizedPool.find((k) => qn.includes(k.norm) || k.norm.includes(qn));
    return {
      query: r.query,
      clicks: Number(r.clicks) || 0,
      impressions: Number(r.impressions) || 0,
      avgPosition: Number(r.avg_position) || 0,
      matchedKeyword: matched?.raw ?? null,
    };
  });

  const sources: SourceTraffic[] = (
    (sourcesRes.data ?? []) as { source: string; medium: string; sessions: number; is_ai: boolean }[]
  ).map((r) => ({
    source: r.source,
    medium: r.medium,
    sessions: Number(r.sessions) || 0,
    isAi: Boolean(r.is_ai),
    isInternal: isInternalSource(r.source, r.medium),
  }));
  const externalSessions = sources.filter((s) => !s.isInternal).reduce((a, s) => a + s.sessions, 0);

  // Round 158 — 1페이지 직전 레버 (4~20위 & 노출 3+). 노출 많은 순.
  const levers: LeverQuery[] = queries
    .filter((q) => q.avgPosition >= 4 && q.avgPosition <= 20 && q.impressions >= 3)
    .map((q) => ({
      query: q.query,
      impressions: q.impressions,
      clicks: q.clicks,
      avgPosition: q.avgPosition,
      matchedKeyword: q.matchedKeyword,
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);

  const series: DailyPoint[] = (
    (seriesRes.data ?? []) as {
      d: string; gsc_clicks: number; gsc_impressions: number; ga4_sessions: number; ai_sessions: number;
    }[]
  ).map((r) => ({
    d: r.d,
    gscClicks: Number(r.gsc_clicks) || 0,
    gscImpressions: Number(r.gsc_impressions) || 0,
    ga4Sessions: Number(r.ga4_sessions) || 0,
    aiSessions: Number(r.ai_sessions) || 0,
  }));

  // 최근 days 만으로 합계 (series 는 90일 추이용)
  const windowStart = series.length > days ? series.slice(-days) : series;
  const totals = {
    gscClicks: windowStart.reduce((a, p) => a + p.gscClicks, 0),
    gscImpressions: windowStart.reduce((a, p) => a + p.gscImpressions, 0),
    ga4Sessions: windowStart.reduce((a, p) => a + p.ga4Sessions, 0),
    aiSessions: windowStart.reduce((a, p) => a + p.aiSessions, 0),
    externalSessions,
    gscDays: windowStart.filter((p) => p.gscClicks > 0 || p.gscImpressions > 0).length,
    ga4Days: windowStart.filter((p) => p.ga4Sessions > 0).length,
  };

  const tenantList = Array.from(tenantAgg.values()).sort(
    (a, b) => b.gscClicks - a.gscClicks || b.ga4Sessions - a.ga4Sessions
  );

  return {
    series,
    tenants: tenantList,
    contents: contentRows.slice(0, 30),
    queries: queries.slice(0, 30),
    sources,
    levers,
    totals,
    errors,
  };
}

// ─────────────────────────────────────────────────────────────
// Round 158 — 병원(클라이언트 포털) 스코프 유입 데이터
// ─────────────────────────────────────────────────────────────

/**
 * analyze_rank_levers.py GENERIC_TOKENS 와 동기 유지 —
 * 진료과명·지역명은 병원 alias 가 아니다 (Round 153 측정 alias 오염 실사고).
 */
const GENERIC_TOKENS = new Set([
  '잠실', '서울', '강남', '부산', '분당', '송파', '용산', '신촌',
  '병원', '의원', '클리닉', '센터', '본점', '지점', '강남구', '송파구',
  '피부과', '안과', '성형외과', '치과', '내과', '외과', '정형외과', '산부인과',
  '한의원', '한방병원', '이비인후과', '비뇨기과', '신경외과', '가정의학과',
  'clinic', 'hospital', 'korea', 'seoul', 'gangnam', 'busan',
]);

function normQuery(s: string): string {
  return (s || '').toLowerCase().replace(/\s+/g, '');
}

/** tenant name/partner_slug → 브랜드 alias (2자+ 토큰, generic 제외) */
export function buildTenantAliases(name: string, partnerSlug: string | null): string[] {
  const out = new Set<string>();
  const full = normQuery(name);
  if (full.length >= 2) out.add(full);
  (name || '').split(/[\s\-_/·]+/).forEach((tok) => {
    const t = normQuery(tok);
    if (t.length >= 2 && !GENERIC_TOKENS.has(t)) out.add(t);
  });
  if (partnerSlug && partnerSlug.length >= 3) out.add(normQuery(partnerSlug));
  return Array.from(out).sort((a, b) => b.length - a.length);
}

export interface TenantQueryRow {
  query: string;
  impressions: number;
  clicks: number;
  avgPosition: number;
}

export interface TenantContentRow {
  path: string;
  title: string | null;
  gscClicks: number;
  gscImpressions: number;
  avgPosition: number | null;
  ga4Sessions: number;
}

export interface TenantTrafficData {
  brandQueries: TenantQueryRow[];    // 검색어에 병원명(alias) 포함 — "우리 병원을 찾아본 검색"
  procedureQueries: TenantQueryRow[]; // 이 병원의 측정 키워드와 매칭 — "시술 수요 검색"
  contents: TenantContentRow[];       // 이 병원 콘텐츠 페이지 유입
  totals: {
    brandImpressions: number;
    brandClicks: number;
    contentSessions: number;
    contentClicks: number;
    contentImpressions: number;
  };
  hasGsc: boolean; // GSC 적재 자체가 있는지 (없으면 "수집 준비 중" 안내)
  errors: string[];
}

export async function fetchTenantTraffic(tenantId: number, days = 28): Promise<TenantTrafficData> {
  const empty: TenantTrafficData = {
    brandQueries: [], procedureQueries: [], contents: [],
    totals: { brandImpressions: 0, brandClicks: 0, contentSessions: 0, contentClicks: 0, contentImpressions: 0 },
    hasGsc: false,
    errors: [],
  };
  const sb = getServerClient();
  if (!sb) return { ...empty, errors: ['Supabase 미연결'] };
  const errors: string[] = [];

  const [tenantRes, keywordsRes, contentsRes, queriesRes, gscPagesRes, ga4PagesRes] = await Promise.all([
    sb.from('tenants').select('id, name, partner_slug').eq('id', tenantId).maybeSingle(),
    sb.from('keywords').select('text').eq('tenant_id', tenantId).eq('is_active', true),
    sb.from('generated_contents')
      .select('id, slug, title, tenant_id, keyword_text, lang')
      .eq('tenant_id', tenantId)
      .eq('status', 'published'),
    sb.rpc('traffic_gsc_queries', { p_days: days, p_limit: 2000 }),
    sb.rpc('traffic_gsc_pages', { p_days: days, p_limit: 2000 }),
    sb.rpc('traffic_ga4_pages', { p_days: days, p_limit: 2000 }),
  ]);
  // 🔴 Round 153 교훈 — error 표면화
  if (tenantRes.error) errors.push(`tenant: ${tenantRes.error.message}`);
  if (keywordsRes.error) errors.push(`keywords: ${keywordsRes.error.message}`);
  if (contentsRes.error) errors.push(`contents: ${contentsRes.error.message}`);
  if (queriesRes.error) errors.push(`queries: ${queriesRes.error.message}`);
  if (gscPagesRes.error) errors.push(`gsc_pages: ${gscPagesRes.error.message}`);
  if (ga4PagesRes.error) errors.push(`ga4_pages: ${ga4PagesRes.error.message}`);

  const tenant = tenantRes.data as { id: number; name: string; partner_slug: string | null } | null;
  if (!tenant) return { ...empty, errors: [...errors, '병원 정보를 찾을 수 없습니다'] };

  const aliases = buildTenantAliases(tenant.name ?? '', tenant.partner_slug);
  const kwNorms = ((keywordsRes.data ?? []) as { text: string | null }[])
    .map((k) => normQuery(k.text ?? ''))
    .filter((t) => t.length >= 2);

  const allQueries = ((queriesRes.data ?? []) as {
    query: string; clicks: number; impressions: number; avg_position: number | null;
  }[]).map((r) => ({
    query: r.query,
    clicks: Number(r.clicks) || 0,
    impressions: Number(r.impressions) || 0,
    avgPosition: Number(r.avg_position) || 0,
  }));
  const hasGsc = allQueries.length > 0 || ((gscPagesRes.data ?? []) as unknown[]).length > 0;

  const brandQueries = allQueries.filter((q) => {
    const qn = normQuery(q.query);
    return aliases.some((a) => qn.includes(a));
  });
  const brandSet = new Set(brandQueries.map((q) => q.query));
  const procedureQueries = allQueries.filter((q) => {
    if (brandSet.has(q.query)) return false;
    const qn = normQuery(q.query);
    return kwNorms.some((k) => qn.includes(k) || k.includes(qn));
  });

  // 이 병원 콘텐츠 페이지 유입 — 전역 resolver 재사용
  const contentRows = (contentsRes.data ?? []) as ContentRow[];
  const partnerMap = new Map<string, number>();
  if (tenant.partner_slug) partnerMap.set(tenant.partner_slug.toLowerCase(), tenant.id);
  const resolve = buildResolver(contentRows, partnerMap);

  interface Agg { path: string; title: string | null; gscClicks: number; gscImpressions: number; posWeighted: number; ga4Sessions: number; }
  const byPath = new Map<string, Agg>();
  const touch = (path: string, title: string | null): Agg => {
    const found = byPath.get(path);
    if (found) { if (!found.title && title) found.title = title; return found; }
    const fresh: Agg = { path, title, gscClicks: 0, gscImpressions: 0, posWeighted: 0, ga4Sessions: 0 };
    byPath.set(path, fresh);
    return fresh;
  };
  ((gscPagesRes.data ?? []) as { page: string; clicks: number; impressions: number; avg_position: number | null }[])
    .forEach((r) => {
      const path = normalizePath(r.page);
      const { content, tenantId: tid } = resolve(path);
      if (tid !== tenant.id) return;
      const agg = touch(path, content?.title ?? null);
      agg.gscClicks += Number(r.clicks) || 0;
      agg.gscImpressions += Number(r.impressions) || 0;
      agg.posWeighted += (Number(r.avg_position) || 0) * (Number(r.impressions) || 0);
    });
  ((ga4PagesRes.data ?? []) as { page_path: string; sessions: number }[]).forEach((r) => {
    const path = normalizePath(r.page_path);
    const { content, tenantId: tid } = resolve(path);
    if (tid !== tenant.id) return;
    const agg = touch(path, content?.title ?? null);
    agg.ga4Sessions += Number(r.sessions) || 0;
  });

  const contents: TenantContentRow[] = Array.from(byPath.values())
    .map((a) => ({
      path: a.path,
      title: a.title,
      gscClicks: a.gscClicks,
      gscImpressions: a.gscImpressions,
      avgPosition: a.gscImpressions > 0 ? a.posWeighted / a.gscImpressions : null,
      ga4Sessions: a.ga4Sessions,
    }))
    .sort((a, b) => b.gscClicks - a.gscClicks || b.ga4Sessions - a.ga4Sessions || b.gscImpressions - a.gscImpressions)
    .slice(0, 20);

  return {
    brandQueries: brandQueries.sort((a, b) => b.impressions - a.impressions).slice(0, 20),
    procedureQueries: procedureQueries.sort((a, b) => b.impressions - a.impressions).slice(0, 20),
    contents,
    totals: {
      brandImpressions: brandQueries.reduce((a, q) => a + q.impressions, 0),
      brandClicks: brandQueries.reduce((a, q) => a + q.clicks, 0),
      contentSessions: contents.reduce((a, c) => a + c.ga4Sessions, 0),
      contentClicks: contents.reduce((a, c) => a + c.gscClicks, 0),
      contentImpressions: contents.reduce((a, c) => a + c.gscImpressions, 0),
    },
    hasGsc,
    errors,
  };
}
