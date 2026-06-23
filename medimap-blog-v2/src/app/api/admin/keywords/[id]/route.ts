import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

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
  const { data, error } = await sb.from('keywords').update(payload).eq('id', id).select().maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: 'keyword not found' }, { status: 404 });
  await logAudit(req, sb, 'update_keyword', `keywords:${id}`, { diff: payload });
  return NextResponse.json({ ok: true, keyword: data });
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const { id } = await ctx.params;
  const { error } = await sb.from('keywords').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await logAudit(req, sb, 'delete_keyword', `keywords:${id}`);
  return NextResponse.json({ ok: true });
}
