/**
 * GET /api/admin/content-queue?status=pending|published
 *
 * - status=pending (default) → 검수 대기 큐
 * - status=published        → 발행 완료 + 파트너 콘텐츠 (콘텐츠 완료 탭용)
 *
 * tenants JOIN 으로 tenant_name + partner_slug + domain_category 까지 가져옴.
 * 조회수 / 인용횟수는 prod 데이터 소스 부재 — UI 에서 placeholder.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLIC_BLOG_BASE =
  process.env.NEXT_PUBLIC_PUBLIC_BLOG_URL ?? 'https://medimap-blog-phi.vercel.app';

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'pending';
  const allowed = new Set(['pending', 'published', 'rejected']);
  if (!allowed.has(status)) {
    return NextResponse.json({ ok: false, error: 'invalid status' }, { status: 400 });
  }

  let query = sb
    .from('generated_contents')
    .select(`
      id, tenant_id, channel, keyword_text, body, title, excerpt, slug,
      status, compliance_status, compliance_report, llm_provider,
      cover_image_url, cover_image_alt,
      is_partner_content, partner_category,
      created_at, updated_at, published_at,
      tenants:tenant_id ( id, name, partner_slug, domain_category )
    `)
    .eq('status', status);

  // 완료 탭에서는 파트너 콘텐츠만 (with-partners 라우트에 노출되는 것)
  if (status === 'published') {
    query = query.eq('is_partner_content', true);
  }

  const { data, error } = await query
    .order(status === 'published' ? 'published_at' : 'created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  type Row = (NonNullable<typeof data>)[number];
  const items = (data ?? []).map((r: Row) => {
    const t = (r as unknown as {
      tenants: { id: number; name: string; partner_slug: string | null; domain_category: string | null } | null;
    }).tenants;
    const liveUrl =
      r.status === 'published' && r.is_partner_content && r.partner_category && t?.partner_slug && r.slug
        ? `${PUBLIC_BLOG_BASE}/with-partners/${r.partner_category}/${t.partner_slug}/${r.slug}`
        : null;
    return {
      id: r.id,
      tenant_id: r.tenant_id,
      tenant_name: t?.name ?? '(unknown)',
      partner_slug: t?.partner_slug ?? null,
      domain_category: t?.domain_category ?? null,
      channel: r.channel,
      keyword_text: r.keyword_text,
      title: r.title,
      excerpt: r.excerpt,
      body: r.body,
      slug: r.slug,
      status: r.status,
      compliance_status: r.compliance_status,
      llm_provider: r.llm_provider,
      cover_image_url: r.cover_image_url,
      cover_image_alt: r.cover_image_alt,
      is_partner_content: r.is_partner_content,
      partner_category: r.partner_category,
      created_at: r.created_at,
      updated_at: r.updated_at,
      published_at: r.published_at ?? null,
      live_url: liveUrl,
      // 조회수 / 인용횟수 — 데이터 파이프라인 부재. UI 에서 placeholder.
      view_count: null as number | null,
      citation_count: null as number | null
    };
  });

  return NextResponse.json({ ok: true, items });
}
