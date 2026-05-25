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
  'partner_slug', 'status', 'publish_count', 'monthly_cost', 'joined_at'
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
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED_PATCH.has(k)) continue;
    // NOT NULL 컬럼은 빈/null 값으로 덮어쓰기 금지 — 무시
    if (NOT_NULL_PROTECT.has(k) && (v === '' || v == null)) continue;
    payload[k] = v === '' ? null : v;
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ ok: false, error: 'no fields to update' }, { status: 400 });
  }
  const { data, error } = await sb
    .from('tenants').update(payload).eq('id', id).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
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
