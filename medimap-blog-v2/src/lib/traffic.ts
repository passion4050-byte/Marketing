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
}

export interface TrafficDashboard {
  series: DailyPoint[];
  tenants: TenantTraffic[];
  contents: ContentTraffic[];
  queries: QueryTraffic[];
  sources: SourceTraffic[];
  totals: {
    gscClicks: number;
    gscImpressions: number;
    ga4Sessions: number;
    aiSessions: number;
    gscDays: number;
    ga4Days: number;
  };
  errors: string[];
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
    gscClicks: 0, gscImpressions: 0, ga4Sessions: 0, aiSessions: 0, gscDays: 0, ga4Days: 0,
  };
  const sb = getServerClient();
  if (!sb) {
    return {
      series: [], tenants: [], contents: [], queries: [], sources: [],
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
  }));

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
    totals,
    errors,
  };
}
