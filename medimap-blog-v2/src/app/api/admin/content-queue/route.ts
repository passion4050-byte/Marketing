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
import { scoreContent } from '@/lib/contentQuality';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PUBLIC_BLOG_BASE =
  process.env.NEXT_PUBLIC_PUBLIC_BLOG_URL ?? 'https://wecircle.co.kr';

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'pending';
  // Round 117 (2026-07-03): 'archived' 추가 — 게재 중단(soft delete) 탭/필터용
  const allowed = new Set(['pending', 'published', 'rejected', 'archived']);
  if (!allowed.has(status)) {
    return NextResponse.json({ ok: false, error: 'invalid status' }, { status: 400 });
  }

  // Round 29 fix 2 (2026-05-30): scheduler.py 는 cron 발행 시 status='draft' 로 저장
  // ('pending' 아님). 어드민 '검수 대기' 탭이 draft 도 같이 가져오도록 분기.
  const statusFilter: string[] =
    status === 'pending' ? ['draft', 'pending'] : [status];

  // Round 29 fix 12 (2026-05-30): tenants 를 inner join 으로 embed 하면
  // tenant row 가 매칭 안 되는 경우 (예: 자사 tenant_id 가 tenants 에 없거나
  // PostgREST inner join 으로 작동) generated_contents 가 누락됨.
  // → 별도 query 로 분리. tenants 가 없어도 generated_contents 는 항상 반환.
  // 진단: debug-env endpoint 의 단순 query 는 1건 반환 / content-queue 는 0건 반환
  //       → tenants embed 가 차이의 원인.
  // 해외 콘텐츠 필터 (Round 138+): market=domestic|overseas, lang=ko|en|ja|zh-Hans
  const marketFilter = url.searchParams.get('market'); // null = 전체
  const langFilter = url.searchParams.get('lang'); // null = 전체

  let query = sb
    .from('generated_contents')
    .select(`
      id, tenant_id, channel, keyword_text, body, title, excerpt, slug,
      status, compliance_status, compliance_report, llm_provider,
      cover_image_url, cover_image_alt,
      is_partner_content, partner_category, blog_category, lang, market,
      created_at, updated_at, published_at
    `)
    .in('status', statusFilter);

  if (marketFilter === 'domestic' || marketFilter === 'overseas') {
    query = query.eq('market', marketFilter);
  }
  if (langFilter) {
    query = query.eq('lang', langFilter);
  }

  // Round 25 (2026-05-29): is_partner_content=true 필터 제거.
  // 자사 인사이트 글(tenant=메디맵, is_partner_content=false) 도 콘텐츠 완료 탭에
  // 같이 노출. 운영자가 한 곳에서 파트너+자사 모두 검수·관리 가능.
  // UI 에서 is_partner_content 칩으로 시각적 구분 (Partner/자사 라벨).

  const { data, error } = await query
    .order(status === 'published' ? 'published_at' : 'created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // tenants 별도 fetch — generated_contents 에 등장한 tenant_id 만 한 번에 조회
  const tenantIds = Array.from(new Set((data ?? []).map((r) => r.tenant_id).filter((x) => x != null)));
  const tenantMap = new Map<number, { id: number; name: string; partner_slug: string | null; domain_category: string | null }>();
  if (tenantIds.length > 0) {
    const { data: tenantsData } = await sb
      .from('tenants')
      .select('id, name, partner_slug, domain_category')
      .in('id', tenantIds);
    (tenantsData ?? []).forEach((t) => {
      tenantMap.set(t.id, t as { id: number; name: string; partner_slug: string | null; domain_category: string | null });
    });
  }

  type Row = (NonNullable<typeof data>)[number];
  const items = (data ?? []).map((r: Row) => {
    const t = tenantMap.get(r.tenant_id) ?? null;
    // Round 25 (2026-05-29): 자사 글은 /blog/{slug} 로, 파트너 글은 /with-partners/.../{slug} 로 live_url 생성
    // 해외(market=overseas)는 /{lang}/guides/{slug} 로 렌더(getGuide, channel 무관). zh-Hans/Hant → /zh.
    const langPath = r.lang === 'zh-Hans' || r.lang === 'zh-Hant' ? 'zh' : r.lang;
    const liveUrl =
      r.status === 'published' && r.slug
        ? r.market === 'overseas'
          ? `${PUBLIC_BLOG_BASE}/${langPath}/guides/${r.slug}`
          : r.is_partner_content && r.partner_category && t?.partner_slug
            ? `${PUBLIC_BLOG_BASE}/with-partners/${r.partner_category}/${t.partner_slug}/${r.slug}`
            : `${PUBLIC_BLOG_BASE}/blog/${r.slug}`
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
      quality: scoreContent(r.body, r.channel), // Round 81 — 구조 품질 자동 채점
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

  // Round 59 fix 2 (2026-06-01) — Vercel edge cache 명시 차단. Ctrl+Shift+R 해도 stale 응답
  // 받는 함정 (force-dynamic 만으로는 Vercel edge cache 못 막음).
  return NextResponse.json(
    { ok: true, items },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', 'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store' } }
  );
}
