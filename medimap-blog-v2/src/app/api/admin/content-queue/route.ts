/**
 * GET /api/admin/content-queue
 *
 * Supabase `generated_contents` 에서 status='pending' (검수 대기) row 를 조회.
 * 자동발행 파이프라인이 INSERT 한 row + 사용자가 manual 로 넣은 row 모두 표시.
 *
 * tenants JOIN 으로 tenant_name + partner_slug + domain_category 까지 끌어옴 —
 * 발행 승인 시 partner_category 자동 매핑에 사용.
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: 'supabase not configured' },
      { status: 503 }
    );
  }

  // PostgREST 식 nested select — tenants(*) 를 펼쳐서 받음
  const { data, error } = await sb
    .from('generated_contents')
    .select(`
      id, tenant_id, channel, keyword_text, body, title, excerpt, slug,
      status, compliance_status, compliance_report, llm_provider,
      cover_image_url, cover_image_alt,
      is_partner_content, partner_category,
      created_at, updated_at,
      tenants:tenant_id ( id, name, partner_slug, domain_category )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // 응답 정리 — UI 가 다루기 쉬운 flat 형태
  type Row = (NonNullable<typeof data>)[number];
  const items = (data ?? []).map((r: Row) => {
    const t = (r as unknown as { tenants: { id: number; name: string; partner_slug: string | null; domain_category: string | null } | null }).tenants;
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
      updated_at: r.updated_at
    };
  });

  return NextResponse.json({ ok: true, items });
}
