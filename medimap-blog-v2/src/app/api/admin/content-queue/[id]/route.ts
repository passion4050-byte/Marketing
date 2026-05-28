/**
 * POST/PATCH/DELETE /api/admin/content-queue/[id]
 *
 * POST  /approve  → status='published' + is_partner_content=true + partner_category=<auto>
 * DELETE          → status='rejected' (실제 row 는 보존, 감사 로그용)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** tenants.domain_category → /with-partners 카테고리 slug 매핑. */
const CATEGORY_MAP: Record<string, string> = {
  '안과': 'eyeclinic',
  '피부과': 'derma',
  '성형외과': 'plastic',
  '치과': 'dental',
  '내과': 'internal',
  '모발이식': 'hair',
  // 영문 별칭도 허용
  'eyeclinic': 'eyeclinic',
  'derma': 'derma',
  'plastic': 'plastic',
  'dental': 'dental',
  'internal': 'internal',
  'hair': 'hair'
};

function mapCategory(domainCategory: string | null | undefined): string | null {
  if (!domainCategory) return null;
  const trimmed = domainCategory.trim();
  return CATEGORY_MAP[trimmed] ?? null;
}

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const action = url.searchParams.get('action') ?? 'approve';

  // 우선 row + tenant 정보 조회 — tenant_id 의 domain_category + partner_slug 를 보고 partner_category 결정
  const { data: row, error: fetchError } = await sb
    .from('generated_contents')
    .select('id, tenant_id, partner_category, is_partner_content, slug, tenants:tenant_id ( partner_slug, domain_category )')
    .eq('id', id)
    .single();
  if (fetchError || !row) {
    return NextResponse.json({ ok: false, error: fetchError?.message ?? 'not found' }, { status: 404 });
  }

  if (action === 'reject') {
    const { error } = await sb
      .from('generated_contents')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    await logAudit(req, sb, 'reject_content', `generated_contents:${id}`);
    return NextResponse.json({ ok: true, action: 'reject' });
  }

  // approve — 파트너 카테고리 결정
  const tenantInfo = (row as unknown as {
    tenants: { partner_slug: string | null; domain_category: string | null } | null;
    partner_category: string | null;
  });
  const isPartnerTenant = !!tenantInfo.tenants?.partner_slug;
  const mappedCategory =
    row.partner_category ?? mapCategory(tenantInfo.tenants?.domain_category);

  const update: Record<string, unknown> = {
    status: 'published',
    compliance_status: 'pass',
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (isPartnerTenant) {
    update.is_partner_content = true;
    if (mappedCategory) update.partner_category = mappedCategory;
  }

  const { data: updated, error } = await sb
    .from('generated_contents')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await logAudit(req, sb, 'approve_content', `generated_contents:${id}`, { diff: { partner_category: update.partner_category, is_partner_content: update.is_partner_content } });

  return NextResponse.json({
    ok: true,
    action: 'approve',
    partner_category: update.partner_category ?? null,
    is_partner_content: update.is_partner_content ?? false,
    slug: updated?.slug ?? null
  });
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  const { id } = await ctx.params;
  const { error } = await sb
    .from('generated_contents')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await logAudit(req, sb, 'reject_content', `generated_contents:${id}`);
  return NextResponse.json({ ok: true });
}

/**
 * Round 18 (2026-05-28): 콘텐츠 인라인 편집 — title / body / excerpt 수정.
 * 발행 전 검수 단계에서 운영자가 직접 수정 가능. NOT NULL 컬럼 (body, title)
 * 은 빈 값이면 기존 값 유지.
 */
const ALLOWED_PATCH = new Set(['title', 'body', 'excerpt']);
const NOT_NULL_FIELDS = new Set(['title', 'body']);

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED_PATCH.has(k)) continue;
    // NOT NULL 보호 — 빈 문자열은 스킵 (기존 값 유지)
    if (NOT_NULL_FIELDS.has(k) && (v === '' || v == null)) continue;
    update[k] = v === '' ? null : v;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: '변경할 내용이 없습니다.' }, { status: 400 });
  }
  update.updated_at = new Date().toISOString();

  const { data: updated, error } = await sb
    .from('generated_contents')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await logAudit(req, sb, 'edit_content', `generated_contents:${id}`, { diff: { after: Object.keys(update) } });
  return NextResponse.json({ ok: true, action: 'patch', updated });
}
