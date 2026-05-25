/**
 * /api/admin/users — admin 콘솔 사용자 메타 CRUD (server_role)
 *
 * 실제 로그인은 ADMIN_PASSWORD 유지. users 는 권한/초대 메타 관리.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['email', 'name', 'role', 'status', 'invited_by', 'last_seen_at']);

function notConfigured() {
  return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });
}

export async function GET() {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const { data, error } = await sb
    .from('users')
    .select('id, email, name, role, status, invited_by, last_seen_at, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, users: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = getServerClient();
  if (!sb) return notConfigured();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email || !/.+@.+/.test(email)) {
    return NextResponse.json({ ok: false, error: '유효한 이메일이 필요합니다' }, { status: 400 });
  }
  const payload: Record<string, unknown> = {
    email,
    name: body.name || email.split('@')[0],
    role: body.role || 'viewer',
    status: body.status || 'invited'
  };
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k) && v != null && v !== '') payload[k] = v;
  }
  const { data, error } = await sb.from('users').insert(payload).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await logAudit(req, sb, 'invite_user', `users:${data.id}`, { diff: { email: data.email, role: data.role } });
  return NextResponse.json({ ok: true, user: data });
}
