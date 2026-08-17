/**
 * Round 104 (2026-06-29) — 인용 세부경로(Cited Content Path) 추적 API.
 *
 * GET /api/admin/citation-paths?tenantId=N&domain=example.com&days=30
 *   응답: {
 *     ok, tenant_id, domain, days,
 *     total_cites,                 // 그 도메인의 30일 총 인용 수
 *     paths: [                     // AI 가 실제 인용한 "세부 URL(콘텐츠 경로)" 별 집계
 *       { url, path, cites, engines:[...], keywords:[...] }
 *     ]
 *   }
 *
 * 도메인 점유(횟수)뿐 아니라 "어떤 콘텐츠(URL 경로)가, 어떤 키워드에서, 어떤 엔진으로
 * 인용됐는지"를 펼쳐 보여준다. responses.source_domains[].final_url 기반 — 새 측정 불필요.
 * 자사/경쟁사 무관 (도메인만 지정). 자동학습(경쟁사 인용 콘텐츠 구조 학습)의 입력.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SourceDomain {
  domain: string | null;
  final_url: string | null;
  is_self?: boolean;
}

/**
 * Round 121 (2026-07-03) — 도메인 정규화.
 *   근본 원인: responses.source_domains 는 `www.modoodoc.com` 으로 저장되는데
 *   대시보드 Top10 은 www. 를 뗀 `modoodoc.com` 을 넘겨 exact match 가 0건
 *   → "세부 인용 URL이 아직 없습니다" 오탐. (실데이터: modoodoc 130건 전부 final_url 보유)
 *   양쪽 모두 lowercase + www. 제거 후 비교.
 */
function normDomain(s: string | null | undefined): string {
  return (s || '').trim().toLowerCase().replace(/^www\./, '');
}

function safePath(url: string): string {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname + u.search).slice(0, 120) || '/';
  } catch {
    return url.slice(0, 120);
  }
}

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const url = new URL(req.url);
  const tenantId = Number(url.searchParams.get('tenantId'));
  const domain = normDomain(url.searchParams.get('domain'));
  const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 30, 1), 90);

  // domain 만 필수. tenantId 없으면 전사(global) 집계 — 홈 대시보드 도메인 Top10 용.
  if (!domain) {
    return NextResponse.json({ ok: false, error: 'domain required' }, { status: 400 });
  }

  // 1) 키워드 (id → text). tenantId 있으면 해당 tenant, 없으면 전체.
  let kwQuery = sb.from('keywords').select('id, text');
  if (tenantId) kwQuery = kwQuery.eq('tenant_id', tenantId);
  const { data: kws } = await kwQuery;
  const kwText = new Map<number, string>();
  (kws ?? []).forEach((k: { id: number; text: string }) => kwText.set(k.id, k.text));
  const kwIds = Array.from(kwText.keys());
  if (tenantId && kwIds.length === 0) {
    return NextResponse.json({ ok: true, tenant_id: tenantId, domain, days, total_cites: 0, paths: [] });
  }

  // 2) queries (id → engine, keyword text). global 이면 keyword_id 필터 생략.
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  // Round 163b — 1,000행 캡 대응
  const queries = await fetchAllRows<{ id: number; engine: string; keyword_id: number }>(
    (from, to) => {
      let q = sb
        .from('queries')
        .select('id, engine, keyword_id')
        .neq('engine', 'stub')
        .gte('requested_at', cutoff)
        .order('id')
        .range(from, to);
      if (tenantId) q = q.in('keyword_id', kwIds);
      return q;
    }
  );
  const qMeta = new Map<number, { engine: string; keyword: string }>();
  (queries ?? []).forEach((q: { id: number; engine: string; keyword_id: number }) => {
    qMeta.set(q.id, { engine: q.engine, keyword: kwText.get(q.keyword_id) ?? '' });
  });
  const queryIds = Array.from(qMeta.keys());
  if (queryIds.length === 0) {
    return NextResponse.json({ ok: true, tenant_id: tenantId, domain, days, total_cites: 0, paths: [] });
  }

  // 3) responses.source_domains (chunked IN — query id 가 많을 수 있음)
  const agg = new Map<string, { cites: number; engines: Set<string>; keywords: Set<string> }>();
  let totalCites = 0;
  const CHUNK = 500;
  for (let i = 0; i < queryIds.length; i += CHUNK) {
    const slice = queryIds.slice(i, i + CHUNK);
    const { data: resps } = await sb
      .from('responses')
      .select('query_id, source_domains')
      .in('query_id', slice)
      .not('source_domains', 'is', null);
    (resps ?? []).forEach((r: { query_id: number; source_domains: SourceDomain[] | null }) => {
      const meta = qMeta.get(r.query_id);
      (r.source_domains ?? []).forEach((sd) => {
        if (!sd || !sd.final_url || normDomain(sd.domain) !== domain) return;
        totalCites += 1;
        const key = sd.final_url;
        let entry = agg.get(key);
        if (!entry) {
          entry = { cites: 0, engines: new Set(), keywords: new Set() };
          agg.set(key, entry);
        }
        entry.cites += 1;
        if (meta?.engine) entry.engines.add(meta.engine);
        if (meta?.keyword) entry.keywords.add(meta.keyword);
      });
    });
  }

  const paths = Array.from(agg.entries())
    .map(([u, v]) => ({
      url: u,
      path: safePath(u),
      cites: v.cites,
      engines: Array.from(v.engines).sort(),
      keywords: Array.from(v.keywords).sort(),
    }))
    .sort((a, b) => b.cites - a.cites)
    .slice(0, 50);

  return NextResponse.json({
    ok: true,
    tenant_id: tenantId,
    domain,
    days,
    total_cites: totalCites,
    paths,
  });
}
