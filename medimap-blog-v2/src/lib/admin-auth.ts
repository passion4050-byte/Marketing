/**
 * Admin 인증 — cookie 기반 (단일 password, 32+ char secret + sha256).
 *
 * Streamlit blogkey-adm 의 ADMIN_APP_PASSWORD 와 동등 역할.
 * 운영 단계에서 Supabase auth.users 로 마이그레이션 권장.
 */
import { createHash } from 'crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'medimap-admin-session';
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14일

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? 'dev-secret-change-in-production-32chars';
}

function getPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD;
}

export function isAdminConfigured(): boolean {
  return Boolean(getPassword() && getPassword()!.length >= 4);
}

export function signAdminToken(password: string): string {
  return createHash('sha256')
    .update(`admin::${password}::${getSecret()}`)
    .digest('hex');
}

export async function verifyAdminCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const expected = getPassword();
  if (!expected) return false;
  return value === signAdminToken(expected);
}

export function checkAdminPassword(input: string): boolean {
  const expected = getPassword();
  if (!expected) return false;
  return input === expected;
}

export async function requireAdmin(): Promise<boolean> {
  if (!isAdminConfigured()) return true; // dev mode bypass
  const c = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminCookie(c);
}
