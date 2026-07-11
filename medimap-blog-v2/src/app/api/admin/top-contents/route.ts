/**
 * GET /api/admin/top-contents?days=30&lang=<lang>
 *
 * 위서클 콘텐츠 경쟁력(Top 인용 콘텐츠)을 스코프(lang)별로 반환.
 * top_cited_contents RPC(발행 콘텐츠 × 키워드 is_target mention, generated_contents.lang 필터).
 * lang=null(통합)이면 대시보드 홈 SSR 값과 동일.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Row {
  id: number;
  title: string;
  slug: string;
  tenant_id: number;
  tenant_name: string;
  published_at: string;
  keyword: string;
  mentions_for_keyword: number;
  is_partner: boolean;
  partner_category: string | null;
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const days = Math.min(90, Math.max(1, Number(sp.get('days') ?? '30') || 30));
  const lang = sp.get('lang');

  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  }

  const { data, error } = await sb.rpc('top_cited_contents', { _days: days, _lang: lang || null });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const contents = ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    tenantName: r.tenant_name,
    tenantId: r.tenant_id,
    publishedAt: r.published_at,
    keyword: r.keyword,
    mentionsForKeyword: Number(r.mentions_for_keyword) || 0,
    isPartner: r.is_partner,
    partnerCategory: r.partner_category,
  }));

  return NextResponse.json(
    { ok: true, contents },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
