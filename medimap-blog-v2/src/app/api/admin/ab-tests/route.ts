/**
 * Round 73 (2026-06-22) — A/B 테스트 실데이터 API (mock 대체).
 *
 * ab_tests + generated_contents(변형 제목/slug/상태) + tenants(이름) 조인.
 * 변형별 AI 인용 수는 run_ab_analysis.py 가 일일 갱신.
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AbTestRow = {
  id: number;
  tenant_id: number;
  keyword: string;
  hypothesis: string | null;
  status: string;
  winner: string | null;
  metric: string;
  variant_a_content_id: number | null;
  variant_b_content_id: number | null;
  variant_a_citations: number;
  variant_b_citations: number;
  variant_a_mentions: number;
  variant_b_mentions: number;
  last_measured_at: string | null;
  started_at: string;
};

type ContentRow = { id: number; title: string | null; slug: string | null; status: string | null };

const SITE = 'https://medimap-blog-phi.vercel.app';

export async function GET() {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const { data: testsRaw } = await sb
    .from('ab_tests')
    .select('*')
    .order('created_at', { ascending: false });
  const tests = (testsRaw ?? []) as AbTestRow[];

  const contentIds = Array.from(
    new Set(
      tests
        .flatMap((t) => [t.variant_a_content_id, t.variant_b_content_id])
        .filter((x): x is number => x != null)
    )
  );
  const contentMap = new Map<number, ContentRow>();
  if (contentIds.length > 0) {
    const { data: contents } = await sb
      .from('generated_contents')
      .select('id, title, slug, status')
      .in('id', contentIds);
    ((contents ?? []) as ContentRow[]).forEach((c) => contentMap.set(c.id, c));
  }

  const { data: tenantsRaw } = await sb.from('tenants').select('id, name');
  const tenantMap = new Map<number, string>(
    ((tenantsRaw ?? []) as Array<{ id: number; name: string }>).map((t) => [t.id, t.name])
  );

  const variant = (cid: number | null, citations: number, mentions: number) => {
    const c = cid != null ? contentMap.get(cid) : undefined;
    return {
      content_id: cid,
      title: c?.title ?? null,
      slug: c?.slug ?? null,
      url: c?.slug ? `${SITE}/blog/${c.slug}` : null,
      content_status: c?.status ?? null,
      citations,
      mentions,
    };
  };

  const result = tests.map((t) => ({
    id: t.id,
    tenant_name: tenantMap.get(t.tenant_id) ?? `#${t.tenant_id}`,
    keyword: t.keyword,
    hypothesis: t.hypothesis,
    status: t.status,
    winner: t.winner,
    metric: t.metric,
    variant_a: variant(t.variant_a_content_id, t.variant_a_citations, t.variant_a_mentions),
    variant_b: variant(t.variant_b_content_id, t.variant_b_citations, t.variant_b_mentions),
    last_measured_at: t.last_measured_at,
    started_at: t.started_at,
  }));

  return NextResponse.json({ ok: true, tests: result });
}
