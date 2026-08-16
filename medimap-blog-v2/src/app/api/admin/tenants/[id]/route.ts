import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** NOT NULL + default 없음 — PATCH 시 빈 값이면 skip (overwrite 거부). */
const NOT_NULL_PROTECT = new Set(['name', 'domain_category', 'region', 'business_model']);

const ALLOWED_PATCH = new Set([
  'name', 'domain_category', 'region', 'business_model', 'address',
  'naver_place_url', 'phone', 'homepage', 'email',
  'partner_slug', 'status', 'publish_count', 'monthly_cost', 'joined_at',
  'report_send_day',  // 누락 보완 (POST 에는 있는데 PATCH 만 빠져있었음)
  'publish_plan',     // Round 83 (2026-06-28) — A: 주3회, B: 매일
  // Round 162 (2026-08-16) — GBP 일치 영문 NAP (지도 축): 콘텐츠 NAP 카드·리뷰 퍼널에 사용
  'name_en', 'address_en', 'transit_en', 'gmaps_url', 'google_review_url',
]);

interface RouteCtx { params: Promise<{ id: string }>; }

function notConfigured() {
  return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // Round 128 (2026-07-05) — domain_category 유효값 가드.
  //   실사고: 바를정(한방의원)이 편집 저장 중 '기타' 로 덮여 학습 인사이트 주입·
  //   이미지 컨셉·발행 카테고리가 어긋남. 진료과는 시스템 전반의 매칭 키라
  //   허용 목록 외 값은 거부 (오타·임의 텍스트 차단).
  const VALID_CATEGORIES = new Set([
    '안과', '피부과', '성형외과', '치과', '내과', '모발이식',
    '한방의원', '한방', '자사인사이트', '기타',
  ]);
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED_PATCH.has(k)) continue;
    // NOT NULL 컬럼은 빈/null 값으로 덮어쓰기 금지 — 무시
    if (NOT_NULL_PROTECT.has(k) && (v === '' || v == null)) continue;
    if (k === 'domain_category' && typeof v === 'string' && !VALID_CATEGORIES.has(v.trim())) {
      return NextResponse.json(
        { ok: false, error: `domain_category 허용값 아님: ${v}` },
        { status: 400 },
      );
    }
    payload[k] = v === '' ? null : v;
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ ok: false, error: 'no fields to update' }, { status: 400 });
  }
  const { data, error } = await sb
    .from('tenants').update(payload).eq('id', id).select().maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: 'tenant not found' }, { status: 404 });
  await logAudit(req, sb, 'update_tenant', `tenants:${id}`, { diff: payload });
  return NextResponse.json({ ok: true, tenant: data });
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const { id } = await ctx.params;
  const { error } = await sb.from('tenants').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await logAudit(req, sb, 'delete_tenant', `tenants:${id}`);
  return NextResponse.json({ ok: true });
}
