/**
 * Round 32 (2026-05-30) — AI 인용 분석 API.
 *
 * 5-Tier source 분류:
 *   T1 = 메디맵 자체 (medi-map.co.kr, medimap-blog-phi.vercel.app, pf.kakao.com/_xnWQkG)
 *        → SaaS 직접 효과 (영업 핵심 KPI)
 *   T2 = 클라이언트 자체 (tenant.homepage)
 *        → 클라이언트 baseline (메디맵과 무관)
 *   T3 = 권위/공식 (msdmanuals, amc.seoul.kr, 종합병원 등)
 *   T4 = 의료 플랫폼 (modoodoc, gangnamunni, 강남언니 등)
 *   T5 = 기타 (경쟁사 + 노이즈)
 *
 * 응답 구조:
 *   {
 *     mention_trend: [{date, count}, ...30일],
 *     source_tier: {T1, T2, T3, T4, T5, total},
 *     top_domains: [{domain, count, tier}, ...10],
 *     medimap_share_trend: [{date, share_pct}, ...30일]
 *   }
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// T1 — 메디맵 자체 (hard-coded)
const MEDIMAP_DOMAINS = new Set<string>([
  'medi-map.co.kr',
  'www.medi-map.co.kr',
  'medimap-blog-phi.vercel.app',
  'geo-v2-beta.vercel.app',
  'geo-v2-git-main-medimaps-projects.vercel.app',
]);

// 메디맵 카톡 채널 (특정 URL path)
const MEDIMAP_KAKAO_PATHS = ['_xnWQkG'];

// T3 — 권위/공식 사이트
const AUTHORITY_DOMAINS = new Set<string>([
  'www.msdmanuals.com',
  'msdmanuals.com',
  'www.amc.seoul.kr',
  'amc.seoul.kr',
  'www.samsunghospital.com',
  'samsunghospital.com',
  'www.snuh.org',
  'snuh.org',
  'sev.iseverance.com',
  'www.snubh.org',
  'snubh.org',
  'www.cha.ac.kr',
]);

// T4 — 의료 플랫폼
const PLATFORM_DOMAINS = new Set<string>([
  'www.modoodoc.com',
  'modoodoc.com',
  'www.ddmdandy.com',
  'ddmdandy.com',
  'www.gangnam-unni.com',
  'gangnamunni.com',
  'www.babitalk.com',
  'babitalk.com',
  'strawberry-ent.co.kr',
  'www.strawberry-ent.co.kr',
]);

// 노이즈 도메인 (T5 에서 제외)
const NOISE_DOMAINS = new Set<string>([
  'www.google.com',
  'google.com',
  'www.youtube.com',
  'youtube.com',
]);

function classifyDomain(
  domain: string | null,
  finalUrl: string | null,
  clientHomepageDomain: string | null
): 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'NOISE' {
  if (!domain) return 'NOISE';
  const d = domain.toLowerCase();

  // T1 — 메디맵 자체
  if (MEDIMAP_DOMAINS.has(d)) return 'T1';
  if (d === 'pf.kakao.com' && finalUrl) {
    if (MEDIMAP_KAKAO_PATHS.some((p) => finalUrl.includes(p))) return 'T1';
  }

  // T2 — 클라이언트 자체
  if (clientHomepageDomain && d.endsWith(clientHomepageDomain)) return 'T2';

  // T3 — 권위
  if (AUTHORITY_DOMAINS.has(d)) return 'T3';

  // T4 — 플랫폼
  if (PLATFORM_DOMAINS.has(d)) return 'T4';

  // 노이즈 — 통계에서 제외 (또는 T5 로)
  if (NOISE_DOMAINS.has(d)) return 'NOISE';

  // T5 — 기타 (경쟁사 가능성 높음)
  return 'T5';
}

function extractDomainFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  }

  // 30일 전 cutoff
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. 모든 tenants 의 homepage → 도메인 매핑 (T2 용)
  const { data: tenants } = await sb
    .from('tenants')
    .select('id, name, homepage');
  const tenantDomainMap = new Map<number, string>();
  (tenants ?? []).forEach((t: { id: number; homepage: string | null }) => {
    const d = extractDomainFromUrl(t.homepage);
    if (d) tenantDomainMap.set(t.id, d);
  });

  // 2. 30일 mentions trend (일별 count)
  const { data: mentionRows } = await sb
    .from('mentions')
    .select('created_at, tenant_id, is_target')
    .gte('created_at', cutoff)
    .eq('is_target', true);

  const mentionByDate = new Map<string, number>();
  (mentionRows ?? []).forEach((m: { created_at: string }) => {
    const date = m.created_at.slice(0, 10);
    mentionByDate.set(date, (mentionByDate.get(date) ?? 0) + 1);
  });
  // 30일 채우기 (0 포함)
  const today = new Date();
  const mentionTrend: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const ds = d.toISOString().slice(0, 10);
    mentionTrend.push({ date: ds.slice(5), count: mentionByDate.get(ds) ?? 0 });
  }

  // 3. responses 의 source_domains 집계
  const { data: respRows } = await sb
    .from('responses')
    .select('id, query_id, source_domains, created_at')
    .gte('created_at', cutoff)
    .not('source_domains', 'is', null);

  // query_id → tenant_id 매핑 (T2 분류용)
  const queryIds = Array.from(
    new Set((respRows ?? []).map((r: { query_id: number }) => r.query_id))
  );
  const queryTenantMap = new Map<number, number>();
  if (queryIds.length > 0) {
    const { data: queries } = await sb
      .from('queries')
      .select('id, tenant_id')
      .in('id', queryIds);
    (queries ?? []).forEach((q: { id: number; tenant_id: number }) => {
      queryTenantMap.set(q.id, q.tenant_id);
    });
  }

  // source domain 집계 + tier 분류
  const tierCount = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 };
  const domainCount = new Map<string, { count: number; tier: string }>();
  const shareByDate = new Map<string, { total: number; t1: number }>();

  (respRows ?? []).forEach(
    (r: {
      id: number;
      query_id: number;
      source_domains: Array<{
        domain: string;
        final_url: string | null;
        is_self: boolean;
      }> | null;
      created_at: string;
    }) => {
      const tenantId = queryTenantMap.get(r.query_id);
      const clientDomain = tenantId ? tenantDomainMap.get(tenantId) ?? null : null;
      const date = r.created_at.slice(0, 10);
      if (!shareByDate.has(date)) shareByDate.set(date, { total: 0, t1: 0 });
      const dateBucket = shareByDate.get(date)!;

      (r.source_domains ?? []).forEach((sd) => {
        const tier = classifyDomain(sd.domain, sd.final_url, clientDomain);
        if (tier === 'NOISE') return;
        tierCount[tier]++;
        const key = sd.domain;
        if (key) {
          const existing = domainCount.get(key);
          if (existing) {
            existing.count++;
          } else {
            domainCount.set(key, { count: 1, tier });
          }
        }
        dateBucket.total++;
        if (tier === 'T1') dateBucket.t1++;
      });
    }
  );

  const totalTier = Object.values(tierCount).reduce((a, b) => a + b, 0);

  // 4. top 10 domains
  const topDomains = Array.from(domainCount.entries())
    .map(([domain, { count, tier }]) => ({ domain, count, tier }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 5. 메디맵 share trend (30일)
  const medimapShareTrend: Array<{ date: string; share_pct: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const ds = d.toISOString().slice(0, 10);
    const bucket = shareByDate.get(ds);
    const share =
      bucket && bucket.total > 0 ? Math.round((bucket.t1 / bucket.total) * 1000) / 10 : 0;
    medimapShareTrend.push({ date: ds.slice(5), share_pct: share });
  }

  return NextResponse.json({
    ok: true,
    mention_trend: mentionTrend,
    source_tier: { ...tierCount, total: totalTier },
    top_domains: topDomains,
    medimap_share_trend: medimapShareTrend,
  });
}
