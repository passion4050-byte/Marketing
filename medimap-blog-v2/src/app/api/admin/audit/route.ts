/**
 * /api/admin/audit — audit_logs 조회 (server_role)
 *
 * INSERT hook 은 다음 라운드. 이번엔 조회만 + 빈 시작.
 * 향후 라운드에서 tenants/keywords/content-queue CRUD 마다 INSERT 추가.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '200', 10), 500);
  const { data, error } = await sb
    .from('audit_logs')
    .select('id, at, actor, action, resource, diff')
    .order('at', { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const actor = typeof body.actor === 'string' ? body.actor : 'admin';
  const action = typeof body.action === 'string' ? body.action : '';
  if (!action) return NextResponse.json({ ok: false, error: 'action required' }, { status: 400 });
  const { data, error } = await sb.from('audit_logs').insert({
    actor, action,
    resource: typeof body.resource === 'string' ? body.resource : null,
    diff: body.diff ?? null
  }).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, log: data });
}
