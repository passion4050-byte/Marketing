/**
 * Round 147 — 병원 클라이언트 포털 로그인.
 * POST { username, password } → 검증 후 서명 쿠키 발급.
 * 실패 시 응답 지연(500ms)으로 brute-force 완화.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import {
  CLIENT_COOKIE_MAX_AGE,
  CLIENT_COOKIE_NAME,
  makeSessionToken,
  verifyPassword,
} from '@/lib/client-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  const username = (body.username ?? '').trim();
  const password = body.password ?? '';
  if (!username || !password) {
    return NextResponse.json({ ok: false, error: '아이디와 비밀번호를 입력하세요.' }, { status: 400 });
  }

  const sb = getServerClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'server not configured' }, { status: 503 });

  const { data: account } = await sb
    .from('client_accounts')
    .select('id, tenant_id, password_hash, active')
    .eq('username', username)
    .maybeSingle();

  const row = account as {
    id: number;
    tenant_id: number;
    password_hash: string;
    active: boolean;
  } | null;

  if (!row || !row.active || !verifyPassword(password, row.password_hash)) {
    await delay(500);
    return NextResponse.json(
      { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 },
    );
  }

  await sb
    .from('client_accounts')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', row.id);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CLIENT_COOKIE_NAME, makeSessionToken(row.id, row.tenant_id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CLIENT_COOKIE_MAX_AGE,
  });
  return res;
}
