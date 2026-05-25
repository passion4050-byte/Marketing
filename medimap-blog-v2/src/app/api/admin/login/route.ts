import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE, checkAdminPassword, signAdminToken } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const password = (body.password ?? '').trim();
  if (!password) {
    return NextResponse.json({ ok: false, error: 'password required' }, { status: 400 });
  }
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ ok: false, error: 'invalid password' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, signAdminToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ADMIN_COOKIE_MAX_AGE,
    path: '/'
  });
  return res;
}
