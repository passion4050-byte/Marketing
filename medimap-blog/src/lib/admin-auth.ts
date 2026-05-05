/**
 * 어드민 password gate — 단일 비밀번호 기반 stateless 세션.
 *
 * - ADMIN_PASSWORD: 어드민 진입 비밀번호 (Vercel 환경변수)
 * - ADMIN_SESSION_SECRET: 쿠키 서명용 비밀 (없으면 비활성)
 *
 * 쿠키 값 = SHA-256(ADMIN_PASSWORD + ADMIN_SESSION_SECRET) 의 hex.
 * 동일한 비밀번호+secret 조합에서 항상 같은 값이라 stateless 비교 가능.
 * httpOnly + secure + sameSite=lax + 30일 유효.
 *
 * 비고: 단일 운영자 기준의 "간단한" 게이트. 다중 사용자/감사 로그가 필요해지면
 * Supabase Auth 또는 NextAuth 로 갈아끼울 것.
 */

export const ADMIN_COOKIE_NAME = "medimap_admin_session";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30일

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function adminConfig() {
  const password = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  return { password, secret, configured: !!password };
}

export function isAdminConfigured(): boolean {
  return adminConfig().configured;
}

export async function expectedSessionToken(): Promise<string | null> {
  const { password, secret, configured } = adminConfig();
  if (!configured) return null;
  return sha256Hex(`${password}::${secret}`);
}

export async function verifyPassword(input: string): Promise<boolean> {
  const { password, configured } = adminConfig();
  if (!configured) return false;
  return input === password;
}

export async function verifySessionCookie(
  cookieValue: string | undefined,
): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await expectedSessionToken();
  if (!expected) return false;
  // 길이가 다르면 즉시 false (timing 노이즈는 cookie 비교 수준에서 무시).
  return cookieValue === expected;
}
