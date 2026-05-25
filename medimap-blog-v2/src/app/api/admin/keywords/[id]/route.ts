import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['text', 'category', 'target_brand', 'is_active']);

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
    if (ALLOWED.has(k)) payload[k] = v === '' ? null : v;
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ ok: false, error: 'no fields' }, { status: 400 });
  }
  const { data, error } = await sb.from('keywords').update(payload).eq('id', id).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, keyword: data });
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const { id } = await ctx.params;
  const { error } = await sb.from('keywords').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
