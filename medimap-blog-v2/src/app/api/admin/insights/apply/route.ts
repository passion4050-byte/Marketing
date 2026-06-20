/**
 * Round 62 (2026-06-01) — 학습 인사이트를 tenant 콘텐츠 생성에 적용/해제.
 *
 * POST /api/admin/insights/apply  — { insight_id, tenant_id, note? } → applied_insights insert
 * DELETE /api/admin/insights/apply — { insight_id, tenant_id } → soft delete (is_active=false)
 * GET    /api/admin/insights/apply?tenant_id=N — 해당 tenant 에 적용 중인 insight list
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function POST(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    insight_id?: number;
    tenant_id?: number;
    note?: string;
  };

  if (!body.insight_id || !body.tenant_id) {
    return NextResponse.json({ ok: false, error: 'insight_id + tenant_id required' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('applied_insights')
    .upsert(
      {
        insight_id: body.insight_id,
        tenant_id: body.tenant_id,
        note: body.note ?? null,
        is_active: true,
        applied_at: new Date().toISOString(),
      },
      { onConflict: 'insight_id,tenant_id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 }, { headers: NO_STORE });
  }

  await logAudit(req, sb, 'apply_insight', `applied_insights:${data?.id}`, {
    diff: { insight_id: body.insight_id, tenant_id: body.tenant_id },
  });

  return NextResponse.json({ ok: true, applied: data }, { headers: NO_STORE });
}

export async function DELETE(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    insight_id?: number;
    tenant_id?: number;
  };

  if (!body.insight_id || !body.tenant_id) {
    return NextResponse.json({ ok: false, error: 'insight_id + tenant_id required' }, { status: 400 });
  }

  const { error } = await sb
    .from('applied_insights')
    .update({ is_active: false })
    .eq('insight_id', body.insight_id)
    .eq('tenant_id', body.tenant_id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await logAudit(req, sb, 'unapply_insight', `applied_insights:${body.insight_id}`, {
    diff: { tenant_id: body.tenant_id },
  });

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenant_id');

  let query = sb
    .from('applied_insights')
    .select('id, insight_id, tenant_id, applied_at, note, is_active, tenants:tenant_id(name)')
    .eq('is_active', true)
    .order('applied_at', { ascending: false });

  if (tenantId) {
    query = query.eq('tenant_id', Number(tenantId));
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] }, { headers: NO_STORE });
}
