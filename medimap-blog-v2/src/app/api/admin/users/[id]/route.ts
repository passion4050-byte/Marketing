import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['name', 'role', 'status', 'last_seen_at']);

interface RouteCtx { params: Promise<{ id: string }>; }

function notConfigured() {
  return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) payload[k] = v === '' ? null : v;
  }
  const { data, error } = await sb.from('users').update(payload).eq('id', id).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await logAudit(req, sb, 'update_user', `users:${id}`, { diff: payload });
  return NextResponse.json({ ok: true, user: data });
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const { id } = await ctx.params;
  const { error } = await sb.from('users').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await logAudit(req, sb, 'delete_user', `users:${id}`);
  return NextResponse.json({ ok: true });
}
