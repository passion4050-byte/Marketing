/**
 * 클라이언트 포털 password gate — admin-auth 와 동일 패턴, env 만 다름.
 *
 * - CLIENT_PASSWORD: 클라이언트 진입 비밀번호 (Vercel 환경변수)
 * - ADMIN_SESSION_SECRET: 쿠키 서명용 비밀 (admin 과 공유)
 *
 * 향후 multi-tenant 지원 시 tenant.password_hash 컬럼 (bcrypt) 으로 확장.
 * 현재는 MVP — single tenant (TETE) 기준 단일 비밀번호.
 */

export const CLIENT_COOKIE_NAME = "medimap_client_session";
export const CLIENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30일

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clientConfig() {
  const password = process.env.CLIENT_PASSWORD ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  return { password, secret, configured: !!password };
}

export function isClientConfigured(): boolean {
  return clientConfig().configured;
}

export async function expectedClientToken(): Promise<string | null> {
  const { password, secret, configured } = clientConfig();
  if (!configured) return null;
  return sha256Hex(`client::${password}::${secret}`);
}

export async function verifyClientPassword(input: string): Promise<boolean> {
  const { password, configured } = clientConfig();
  if (!configured) return false;
  return input === password;
}

export async function verifyClientCookie(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await expectedClientToken();
  if (!expected) return false;
  return cookieValue === expected;
}
