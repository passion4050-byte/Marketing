/** Round 147 — 병원 클라이언트 포털 로그아웃. */
import { NextResponse } from 'next/server';
import { CLIENT_COOKIE_NAME } from '@/lib/client-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CLIENT_COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
