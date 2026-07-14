/**
 * Round 143 (2026-07-14) — 추이 분석 일별 인용 드릴다운.
 *
 * 추이 차트에서 특정 날짜(점)를 클릭하면 "그날 어떤 콘텐츠/URL 이 인용됐는지" 반환.
 *   - ours: 자사(위서클 T1) + 선택 클라이언트(T2) 로 인용된 실제 URL
 *   - competitors: 경쟁사 도메인/URL
 * trends/route.ts 와 동일한 keywords→queries→responses→source_domains 경로.
 *
 * Query: ?tenantId=17&date=07-14&scope=en&engine=gemini&keyword=...&days=30
 *   date 는 차트 x축 라벨(MM-DD). days 윈도우로 연도까지 복원.
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

interface CiteItem {
  tier: Tier;
  label: string;   // 자사/클라이언트/경쟁사
  domain: string;
  url: string | null;
  engine: string;
  keyword: string;
}

export async function GET(req: Request) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const url = new URL(req.url);
  const tenantIdParam = url.searchParams.get('tenantId');
  const tenantIdFilter = tenantIdParam ? Number(tenantIdParam) : null;
  const keywordFilter = url.searchParams.get('keyword')?.trim() || null;
  const engineFilter = url.searchParams.get('engine')?.trim().toLowerCase() || null;
  const dateLabel = url.searchParams.get('date')?.trim() || null; // MM-DD
  const scopeParam = url.searchParams.get('scope')?.trim() || null;
  const scopeLang =
    scopeParam === 'ko' ? 'ko'
    : scopeParam === 'en' ? 'en'
    : scopeParam === 'ja' ? 'ja'
    : scopeParam === 'zh' ? 'zh-Hant'
    : null;
  const daysParam = url.searchParams.get('days');
  const DAYS = daysParam ? Math.max(1, Math.min(365, Number(daysParam) || 30)) : 30;

  if (!dateLabel) return NextResponse.json({ ok: false, error: 'date required' }, { status: 400 });

  // MM-DD → 전체 ISO 날짜 복원 (days 윈도우에서 일치하는 날 찾기)
  const today = new Date();
  let fullDate: string | null = null;
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (d.slice(5) === dateLabel) { fullDate = d; break; }
  }
  if (!fullDate) return NextResponse.json({ ok: false, error: 'date out of range' }, { status: 400 });
  const dayStart = `${fullDate}T00:00:00.000Z`;
  const dayEnd = `${fullDate}T23:59:59.999Z`;

  const classifierSets = await loadClassifierSets();

  // tenants (자사 도메인 판별)
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
  const clientLabel = tenantIdFilter ? tenantNameMap.get(tenantIdFilter) ?? '클라이언트' : '클라이언트';

  const selRow = tenantIdFilter
    ? (tenantsAll ?? []).find((t: { id: number }) => t.id === tenantIdFilter)
    : null;
  const isSelfTenant =
    !!selRow &&
    ((selRow as { business_model?: string }).business_model === 'self' ||
      (selRow as { partner_slug?: string }).partner_slug === 'medimap-self');

  // keywords (scope-filtered)
  let kwQuery = sb.from('keywords').select('id, text, tenant_id, lang').eq('is_active', true);
  kwQuery = isSelfTenant
    ? kwQuery.or('purpose.eq.own,purpose.is.null')
    : kwQuery.or('purpose.eq.competitor_landscape,purpose.eq.own,purpose.is.null');
  if (tenantIdFilter) kwQuery = kwQuery.eq('tenant_id', tenantIdFilter);
  if (scopeLang) kwQuery = kwQuery.eq('lang', scopeLang);
  const { data: kws } = await kwQuery;
  const kwTextById = new Map<number, string>();
  (kws ?? []).forEach((k: { id: number; text: string }) => kwTextById.set(k.id, k.text));
  const targetKwIds = new Set<number>();
  kwTextById.forEach((text, id) => {
    if (!keywordFilter || text === keywordFilter) targetKwIds.add(id);
  });

  // responses of the day
  const { data: respRows } = await sb
    .from('responses')
    .select('id, query_id, source_domains, created_at')
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd)
    .order('id')
    .limit(2000);

  const qIds = Array.from(new Set((respRows ?? []).map((r: { query_id: number }) => r.query_id)));
  const qMeta = new Map<number, { tenant: number; engine: string; keyword: string }>();
  for (let i = 0; i < qIds.length; i += 300) {
    const chunk = qIds.slice(i, i + 300);
    const { data: qs } = await sb
      .from('queries')
      .select('id, tenant_id, keyword_id, engine')
      .in('id', chunk);
    (qs ?? []).forEach((q: { id: number; tenant_id: number; keyword_id: number; engine: string }) => {
      if (!targetKwIds.has(q.keyword_id)) return;
      if (tenantIdFilter && q.tenant_id !== tenantIdFilter) return;
      qMeta.set(q.id, {
        tenant: q.tenant_id,
        engine: (q.engine || '?').toLowerCase(),
        keyword: kwTextById.get(q.keyword_id) ?? '',
      });
    });
  }

  const ours: CiteItem[] = [];
  const competitors: CiteItem[] = [];
  const seen = new Set<string>();

  (respRows ?? []).forEach(
    (r: { id: number; query_id: number; source_domains: Array<{ domain: string; final_url: string | null }> | null }) => {
      const meta = qMeta.get(r.query_id);
      if (!meta) return;
      if (engineFilter && meta.engine !== engineFilter) return;
      const clientDomains =
        selectedClientDomains ?? (meta.tenant ? tenantDomainsMap.get(meta.tenant) ?? null : null);
      (r.source_domains ?? []).forEach((sd) => {
        const tier: Tier = classifyDomain(sd.domain, sd.final_url ?? null, clientDomains, classifierSets);
        if (tier === 'NOISE') return;
        const key = `${tier}|${sd.final_url ?? sd.domain}|${meta.engine}|${meta.keyword}`;
        if (seen.has(key)) return;
        seen.add(key);
        const item: CiteItem = {
          tier,
          label: tier === 'T1' ? '위서클' : tier === 'T2' ? clientLabel : '경쟁사',
          domain: sd.domain,
          url: sd.final_url ?? null,
          engine: meta.engine,
          keyword: meta.keyword,
        };
        if (tier === 'T1' || tier === 'T2') ours.push(item);
        else competitors.push(item);
      });
    }
  );

  return NextResponse.json(
    {
      ok: true,
      date: fullDate,
      ours,
      competitors,
      totals: { ours: ours.length, competitors: competitors.length },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
