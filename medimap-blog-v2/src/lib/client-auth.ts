/**
 * Round 147 (2026-08-15) — 병원 클라이언트 포털 인증.
 *
 * 바비톡 병원관리자(client.babitalk.com) 모델: 어드민이 병원별 id/pw 를 발급해 전달,
 * 병원은 /client/login 으로 로그인해 자기 테넌트 데이터만 본다.
 *
 * 설계:
 *   - 비밀번호: scrypt(salt 16B) — 계정 생성 시 랜덤 발급, 평문은 발급 순간 1회만 표시.
 *   - 세션: HMAC-SHA256 서명 쿠키 `{accountId}.{tenantId}.{exp}.{sig}` — DB 조회 없이 검증.
 *     시크릿은 CLIENT_SESSION_SECRET, 미설정 시 ADMIN_SESSION_SECRET fallback
 *     (reportToken.ts 와 동일 패턴 — 신규 env 없이 동작).
 *   - admin 쿠키/미들웨어와 완전 분리 — middleware matcher 는 /client 를 건드리지 않고,
 *     가드는 (portal)/layout.tsx + 각 API 에서 fail-closed.
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export const CLIENT_COOKIE_NAME = 'wecircle-client-session';
export const CLIENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7일

function secret(): string {
  return (
    process.env.CLIENT_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    'dev-secret-change-in-production-32chars'
  );
}

// ── 비밀번호 ──────────────────────────────────────────────

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = (stored || '').split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(plain, salt, 32).toString('hex');
  const a = Buffer.from(hash);
  const b = Buffer.from(candidate);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** 발급용 랜덤 비밀번호 — 혼동 문자(0/O, 1/l/I) 제외 10자. */
export function generatePassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(10);
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[bytes[i] % chars.length];
  return out;
}

// ── 세션 토큰 ──────────────────────────────────────────────

export interface ClientSession {
  accountId: number;
  tenantId: number;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url').slice(0, 24);
}

export function makeSessionToken(accountId: number, tenantId: number): string {
  const exp = Math.floor(Date.now() / 1000) + CLIENT_COOKIE_MAX_AGE;
  const payload = `${accountId}.${tenantId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): ClientSession | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [accountId, tenantId, exp, sig] = parts;
  const payload = `${accountId}.${tenantId}.${exp}`;
  const expected = sign(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return null;
  const acc = Number(accountId);
  const ten = Number(tenantId);
  if (!Number.isFinite(acc) || !Number.isFinite(ten)) return null;
  return { accountId: acc, tenantId: ten };
}

/** 서버 컴포넌트/route handler 에서 현재 세션. 없으면 null (호출부가 redirect). */
export function getClientSession(): ClientSession | null {
  const c = cookies().get(CLIENT_COOKIE_NAME)?.value;
  return verifySessionToken(c);
}
