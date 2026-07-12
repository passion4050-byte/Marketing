/**
 * Round 73 (2026-06-22) — A/B 테스트 실데이터 API (mock 대체).
 *
 * ab_tests + generated_contents(변형 제목/slug/상태) + tenants(이름) 조인.
 * 변형별 AI 인용 수는 run_ab_analysis.py 가 일일 갱신.
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { scoreAeo } from '@/lib/aeoScore';

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

type ContentRow = {
  id: number;
  title: string | null;
  slug: string | null;
  status: string | null;
  tenant_id: number | null;
  is_partner_content: boolean | null;
  partner_category: string | null;
  body: string | null;
  raw_qa_pairs: unknown;
  published_at: string | null;
};

// Round 102: wecircle.co.kr 커스텀 도메인 (이전 medimap-blog-phi.vercel.app)
const SITE = process.env.NEXT_PUBLIC_PUBLIC_BLOG_URL ?? 'https://wecircle.co.kr';

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
    // Round 86 (2026-06-28) — partner 글이면 /with-partners 라우트 필요 (함정 CV 재발).
    // is_partner_content + partner_category 추가 SELECT.
    const { data: contents } = await sb
      .from('generated_contents')
      .select('id, title, slug, status, tenant_id, is_partner_content, partner_category, body, raw_qa_pairs, published_at')
      .in('id', contentIds);
    ((contents ?? []) as ContentRow[]).forEach((c) => contentMap.set(c.id, c));
  }

  // Round 86 — tenant 의 partner_slug 도 같이 (URL 생성용)
  const { data: tenantsRaw } = await sb.from('tenants').select('id, name, partner_slug');
  const tenantMap = new Map<number, string>();
  const tenantSlugMap = new Map<number, string | null>();
  ((tenantsRaw ?? []) as Array<{ id: number; name: string; partner_slug: string | null }>).forEach((t) => {
    tenantMap.set(t.id, t.name);
    tenantSlugMap.set(t.id, t.partner_slug);
  });

  const variant = (cid: number | null, citations: number, mentions: number) => {
    const c = cid != null ? contentMap.get(cid) : undefined;
    // AEO 점수 — 콘텐츠 구조가 AI 인용에 얼마나 유리한지(리서치 기반). 인용수와 병기해 원인 설명.
    let aeo: number | null = null;
    let aeoGrade: string | null = null;
    if (c?.body) {
      const faqCount = Array.isArray(c.raw_qa_pairs) ? c.raw_qa_pairs.length : 0;
      const r = scoreAeo({
        body: c.body,
        faqCount,
        publishedAt: c.published_at,
        hasFaqSchema: faqCount > 0,
        hasMedicalSchema: c.is_partner_content === true,
      });
      aeo = r.score;
      aeoGrade = r.grade;
    }
    // Round 86 — URL 분기: partner 글이면 /with-partners/{cat}/{partner_slug}/{slug}, 아니면 /blog/{slug}
    let url: string | null = null;
    if (c?.slug) {
      const isPartner =
        c.is_partner_content === true && !!c.partner_category &&
        c.tenant_id != null && !!tenantSlugMap.get(c.tenant_id);
      if (isPartner) {
        const pslug = tenantSlugMap.get(c.tenant_id!)!;
        url = `${SITE}/with-partners/${c.partner_category}/${pslug}/${c.slug}`;
      } else {
        url = `${SITE}/blog/${c.slug}`;
      }
    }
    return {
      content_id: cid,
      title: c?.title ?? null,
      slug: c?.slug ?? null,
      url,
      content_status: c?.status ?? null,
      citations,
      mentions,
      aeo,
      aeoGrade,
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
