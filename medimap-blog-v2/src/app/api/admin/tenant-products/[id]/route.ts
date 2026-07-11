/**
 * PATCH  /api/admin/tenant-products/<id>   → 상품 수정(status/plan/월비용/해지일)
 * DELETE /api/admin/tenant-products/<id>   → 상품 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['status', 'plan', 'monthly_cost', 'ended_at']);
const VALID_STATUS = new Set(['active', 'paused', 'churned']);

interface Ctx {
  params: Promise<{ id: string }>;
}

function notConfigured() {
  return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const { id } = await ctx.params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(b)) {
    if (!ALLOWED.has(k)) continue;
    if (k === 'status' && !VALID_STATUS.has(String(v))) continue;
    if (k === 'monthly_cost') {
      payload[k] = v === '' || v == null ? null : Number(v);
    } else {
      payload[k] = v === '' ? null : v;
    }
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ ok: false, error: 'no fields to update' }, { status: 400 });
  }
  const { data, error } = await sb
    .from('tenant_products')
    .update(payload)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: 'product not found' }, { status: 404 });
  await logAudit(req, sb, 'update_tenant_product', `tenant_products:${id}`, { diff: payload });
  return NextResponse.json({ ok: true, product: data });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const { id } = await ctx.params;
  const { error } = await sb.from('tenant_products').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await logAudit(req, sb, 'delete_tenant_product', `tenant_products:${id}`);
  return NextResponse.json({ ok: true });
}
