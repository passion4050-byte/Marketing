/**
 * Round 147 — 병원 클라이언트 포털 계정 관리 (어드민 전용).
 *
 * GET   — 계정 목록 (테넌트명 조인)
 * POST  { tenantId, username, displayName? } — 계정 생성, 랜덤 비밀번호 발급.
 *         평문 비밀번호는 이 응답에 1회만 포함(저장 안 함) — 어드민이 병원에 전달.
 * PATCH { id, action: 'toggle' | 'reset' } — 활성/비활성 전환 · 비밀번호 재발급(1회 표시).
 *
 * 인증: middleware 가 /api/admin/* 전체를 admin 쿠키로 이미 가드하지만,
 *   fail-closed 원칙으로 여기서도 requireAdmin() 재검증.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';
import { generatePassword, hashPassword } from '@/lib/client-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function guard() {
  const ok = await requireAdmin();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const { data, error } = await sb
    .from('client_accounts')
    .select('id, tenant_id, username, display_name, active, created_at, last_login_at, tenants(name)')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const accounts = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    tenantName: (r.tenants as { name?: string } | null)?.name ?? `#${r.tenant_id}`,
    username: r.username,
    displayName: r.display_name,
    active: r.active,
    createdAt: r.created_at,
    lastLoginAt: r.last_login_at,
  }));
  return NextResponse.json({ ok: true, accounts });
}

export async function POST(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    tenantId?: number;
    username?: string;
    displayName?: string;
  };
  const tenantId = Number(body.tenantId);
  const username = (body.username ?? '').trim().toLowerCase();
  if (!Number.isFinite(tenantId) || tenantId <= 0) {
    return NextResponse.json({ ok: false, error: 'tenantId 필요' }, { status: 400 });
  }
  if (!/^[a-z0-9][a-z0-9._-]{3,31}$/.test(username)) {
    return NextResponse.json(
      { ok: false, error: '아이디는 영문 소문자/숫자 4~32자 (._- 허용)' },
      { status: 400 },
    );
  }

  const password = generatePassword();
  const { data, error } = await sb
    .from('client_accounts')
    .insert({
      tenant_id: tenantId,
      username,
      password_hash: hashPassword(password),
      display_name: (body.displayName ?? '').trim() || null,
    })
    .select('id')
    .single();
  if (error) {
    const msg = /duplicate|unique/i.test(error.message) ? '이미 사용 중인 아이디입니다.' : error.message;
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
  // 평문 비밀번호는 이 응답 1회만 — DB 에는 해시만 저장됨.
  return NextResponse.json({ ok: true, id: (data as { id: number }).id, username, password });
}

export async function PATCH(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;
  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { id?: number; action?: string };
  const id = Number(body.id);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: 'id 필요' }, { status: 400 });

  if (body.action === 'toggle') {
    const { data: cur } = await sb.from('client_accounts').select('active').eq('id', id).maybeSingle();
    if (!cur) return NextResponse.json({ ok: false, error: '계정 없음' }, { status: 404 });
    const next = !(cur as { active: boolean }).active;
    const { error } = await sb.from('client_accounts').update({ active: next }).eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, active: next });
  }

  if (body.action === 'reset') {
    const password = generatePassword();
    const { error } = await sb
      .from('client_accounts')
      .update({ password_hash: hashPassword(password) })
      .eq('id', id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, password });
  }

  return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 });
}
