/**
 * Round 37 B (2026-05-31) — learned_insights 목록 + baseline 통합 API.
 *
 * GET /api/admin/learned-insights
 *   응답: { insights: [...], baseline: {...} }
 *
 * PATCH /api/admin/learned-insights
 *   body: { id, applied?, notes? }
 *   동작: 단일 row 업데이트
 *
 * DELETE /api/admin/learned-insights?id=N
 *   동작: 단일 row 삭제
 *
 * PUT /api/admin/learned-insights/baseline
 *   body: { title_length, word_count, h2_count, ... }
 *   동작: content_settings.content_baseline UPSERT
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_BASELINE = {
  title_length: 35,
  word_count: 850,
  h2_count: 6,
  h3_count: 8,
  image_count: 5,
  internal_link_count: 3,
  faq_schema_rate: 0,
  medical_schema_rate: 0,
};

export async function GET() {
  const sb = getServerClient();
  if (!sb) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  }

  const { data: insights, error } = await sb
    .from('learned_insights')
    .select(
      'id, source_url, source_domain, source_tier, domain_category, keyword, tenant_id, patterns, notes, applied, applied_at, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // baseline 로드
  let baseline = DEFAULT_BASELINE;
  try {
    const { data: bl } = await sb
      .from('content_settings')
      .select('setting_value')
      .eq('setting_key', 'content_baseline')
      .single();
    if (bl?.setting_value) {
      baseline = { ...DEFAULT_BASELINE, ...JSON.parse(bl.setting_value as string) };
    }
  } catch {
    /* fallback to default */
  }

  // tenant name resolution
  const tenantIds = Array.from(
    new Set((insights ?? []).map((r: { tenant_id: number | null }) => r.tenant_id).filter(Boolean))
  );
  const tenantMap = new Map<number, string>();
  if (tenantIds.length > 0) {
    const { data: tenants } = await sb.from('tenants').select('id, name').in('id', tenantIds);
    (tenants ?? []).forEach((t: { id: number; name: string }) => tenantMap.set(t.id, t.name));
  }

  const enriched = (insights ?? []).map((r: { tenant_id: number | null }) => ({
    ...r,
    tenant_name: r.tenant_id ? tenantMap.get(r.tenant_id) ?? null : null,
  }));

  return NextResponse.json({
    ok: true,
    insights: enriched,
    baseline,
    count: enriched.length,
  });
}

export async function PATCH(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    id?: number;
    applied?: boolean;
    notes?: string | null;
  };
  if (!body.id) {
    return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.applied === 'boolean') {
    update.applied = body.applied;
    update.applied_at = body.applied ? new Date().toISOString() : null;
  }
  if (body.notes !== undefined) update.notes = body.notes;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: '변경 필드 없음' }, { status: 400 });
  }

  const { error } = await sb.from('learned_insights').update(update).eq('id', body.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: body.id, updated: Object.keys(update) });
}

export async function DELETE(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

  const { error } = await sb.from('learned_insights').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id, deleted: true });
}

export async function PUT(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as Partial<typeof DEFAULT_BASELINE>;
  // 모든 숫자 필드 검증
  const updated: Record<string, number> = { ...DEFAULT_BASELINE };
  for (const key of Object.keys(DEFAULT_BASELINE) as Array<keyof typeof DEFAULT_BASELINE>) {
    const v = body[key];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
      updated[key] = v;
    }
  }

  const { error } = await sb
    .from('content_settings')
    .upsert(
      {
        setting_key: 'content_baseline',
        setting_value: JSON.stringify(updated),
        description: '메디맵 콘텐츠 평균 메타 구조 — learn-from-domain 진단의 비교 기준.',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'setting_key' }
    );
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, baseline: updated });
}
