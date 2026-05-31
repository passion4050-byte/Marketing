/**
 * Round 37 C (2026-05-31) — 5-tier 분류 사전 CRUD API.
 *
 * GET    /api/admin/domain-classifications        — 전체 목록
 * POST   /api/admin/domain-classifications        — 신규 등록 (body: {domain, tier, category?, notes?})
 * PATCH  /api/admin/domain-classifications?id=N   — 편집
 * DELETE /api/admin/domain-classifications?id=N   — 삭제
 *
 * 모든 mutation 후 lib/domain-classifier 의 cache 무효화.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { invalidateClassifierCache } from '@/lib/domain-classifier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_TIERS = ['T1', 'T3', 'T4', 'NOISE'] as const;
type AllowedTier = (typeof ALLOWED_TIERS)[number];

function isValidTier(v: unknown): v is AllowedTier {
  return typeof v === 'string' && (ALLOWED_TIERS as readonly string[]).includes(v);
}

export async function GET() {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const { data, error } = await sb
    .from('domain_classifications')
    .select('id, domain, tier, category, notes, is_active, created_at, updated_at')
    .order('tier')
    .order('domain');
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // tier 별 카운트
  const tierCount = { T1: 0, T3: 0, T4: 0, NOISE: 0 };
  (data ?? []).forEach((r: { tier: string; is_active: boolean }) => {
    if (r.is_active && r.tier in tierCount) {
      tierCount[r.tier as keyof typeof tierCount]++;
    }
  });

  return NextResponse.json({
    ok: true,
    classifications: data ?? [],
    count: data?.length ?? 0,
    tier_count: tierCount,
  });
}

export async function POST(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    domain?: string;
    tier?: string;
    category?: string;
    notes?: string;
  };

  const domain = body.domain?.trim().toLowerCase();
  if (!domain) return NextResponse.json({ ok: false, error: 'domain required' }, { status: 400 });
  if (!isValidTier(body.tier)) {
    return NextResponse.json(
      { ok: false, error: `tier must be one of ${ALLOWED_TIERS.join(', ')} (T2 = 동적, T5 = default)` },
      { status: 400 }
    );
  }

  const { data, error } = await sb
    .from('domain_classifications')
    .insert({
      domain,
      tier: body.tier,
      category: body.category?.trim() || null,
      notes: body.notes?.trim() || null,
      is_active: true,
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ ok: false, error: '이미 등록된 도메인' }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  invalidateClassifierCache();
  return NextResponse.json({ ok: true, classification: data });
}

export async function PATCH(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as {
    domain?: string;
    tier?: string;
    category?: string | null;
    notes?: string | null;
    is_active?: boolean;
  };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.domain !== undefined) update.domain = body.domain.trim().toLowerCase();
  if (body.tier !== undefined) {
    if (!isValidTier(body.tier)) {
      return NextResponse.json({ ok: false, error: `tier must be one of ${ALLOWED_TIERS.join(', ')}` }, { status: 400 });
    }
    update.tier = body.tier;
  }
  if (body.category !== undefined) update.category = body.category;
  if (body.notes !== undefined) update.notes = body.notes;
  if (body.is_active !== undefined) update.is_active = body.is_active;

  const { error } = await sb.from('domain_classifications').update(update).eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  invalidateClassifierCache();
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

  const { error } = await sb.from('domain_classifications').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  invalidateClassifierCache();
  return NextResponse.json({ ok: true, id, deleted: true });
}
