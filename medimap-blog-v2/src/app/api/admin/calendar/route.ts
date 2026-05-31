/**
 * GET /api/admin/calendar?year=YYYY&month=MM
 *
 * generated_contents 를 날짜별로 그룹핑. status='published' 면 published_at 기준,
 * 그 외는 created_at 기준. tenants JOIN 으로 클라이언트 이름 포함.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLIC_BLOG_BASE =
  process.env.NEXT_PUBLIC_PUBLIC_BLOG_URL ?? 'https://medimap-blog-phi.vercel.app';

interface CalRow {
  id: number;
  title: string | null;
  slug: string | null;
  keyword_text: string | null;
  body: string;
  excerpt: string | null;
  status: string;
  compliance_status: string | null;
  is_partner_content: boolean | null;
  partner_category: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  published_at: string | null;
  created_at: string;
  tenant_id: number;
}

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const url = new URL(req.url);
  const now = new Date();
  const year = parseInt(url.searchParams.get('year') ?? String(now.getFullYear()), 10);
  const month = parseInt(url.searchParams.get('month') ?? String(now.getMonth() + 1), 10);
  // 월 경계 (KST 기준 단순 계산)
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const { data, error } = await sb
    .from('generated_contents')
    .select(`
      id, title, slug, keyword_text, body, excerpt,
      status, compliance_status,
      is_partner_content, partner_category,
      cover_image_url, cover_image_alt,
      published_at, created_at, tenant_id,
      tenants:tenant_id ( id, name, partner_slug )
    `)
    .or(`and(published_at.gte.${start.toISOString()},published_at.lt.${end.toISOString()}),and(published_at.is.null,created_at.gte.${start.toISOString()},created_at.lt.${end.toISOString()})`)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const items = (data ?? []).map((r) => {
    const row = r as unknown as CalRow & {
      tenants: { id: number; name: string; partner_slug: string | null } | null;
    };
    const dateIso =
      (row.status === 'published' && row.published_at ? row.published_at : row.created_at).slice(0, 10);
    // Round 53 (2026-05-31) — content-queue 와 동일 로직: 자사 글도 /blog/{slug} 로 live_url 생성
    const liveUrl =
      row.status === 'published' && row.slug
        ? row.is_partner_content && row.partner_category && row.tenants?.partner_slug
          ? `${PUBLIC_BLOG_BASE}/with-partners/${row.partner_category}/${row.tenants.partner_slug}/${row.slug}`
          : `${PUBLIC_BLOG_BASE}/blog/${row.slug}`
        : null;
    return {
      id: row.id,
      date: dateIso,
      title: row.title,
      slug: row.slug,
      keyword_text: row.keyword_text,
      excerpt: row.excerpt,
      body: row.body,
      status: row.status,
      compliance_status: row.compliance_status,
      is_partner_content: row.is_partner_content,
      partner_category: row.partner_category,
      cover_image_url: row.cover_image_url,
      cover_image_alt: row.cover_image_alt,
      tenant_id: row.tenant_id,
      tenant_name: row.tenants?.name ?? '(unknown)',
      partner_slug: row.tenants?.partner_slug ?? null,
      live_url: liveUrl
    };
  });

  return NextResponse.json({ ok: true, year, month, items });
}
