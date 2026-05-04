/**
 * Supabase Postgres 클라이언트 — Vercel serverless 환경 최적화.
 *
 * `postgres` (porsager/postgres) 라이브러리 사용. 서버리스 콜드 스타트 환경에선
 * 연결 풀링이 위험할 수 있으므로 max=1, idle_timeout=20 으로 보수 설정.
 * Supabase 의 pooler URL (포트 6543) 또는 direct URL (5432) 둘 다 호환.
 *
 * DATABASE_URL 미설정 시 모든 함수는 silent no-op — redirect 동작은 차단되지 않음.
 */

import postgres, { type Sql } from "postgres";

let _sql: Sql | null = null;

export function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (_sql) return _sql;
  try {
    _sql = postgres(url, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false, // pgbouncer/transaction-mode 호환
    });
    return _sql;
  } catch {
    return null;
  }
}

export interface ShortlinkRow {
  id: number;
  tenant_id: number;
  slug: string;
  target_url: string;
  is_active: boolean;
}

export async function lookupShortlink(slug: string): Promise<ShortlinkRow | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql<ShortlinkRow[]>`
      SELECT id, tenant_id, slug, target_url, is_active
      FROM shortlinks
      WHERE slug = ${slug} AND is_active = true
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export interface ClickEvent {
  shortlink_id: number;
  tenant_id: number;
  user_agent?: string | null;
  referer?: string | null;
  country?: string | null;
  ip_hash?: string | null;
}

export async function recordClick(evt: ClickEvent): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO shortlink_clicks (
          shortlink_id, tenant_id, clicked_at, user_agent, referer, country, ip_hash
        ) VALUES (
          ${evt.shortlink_id}, ${evt.tenant_id}, NOW(),
          ${evt.user_agent ?? null}, ${evt.referer ?? null},
          ${evt.country ?? null}, ${evt.ip_hash ?? null}
        )
      `;
      await tx`
        UPDATE shortlinks
        SET click_count = click_count + 1, updated_at = NOW()
        WHERE id = ${evt.shortlink_id}
      `;
    });
    return true;
  } catch {
    return false;
  }
}

export async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT || "medimap-funnel-v1";
  const text = `${salt}:${ip}`;
  if (typeof crypto === "undefined" || !crypto.subtle) return null;
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 16); // prefix only — 익명화
}
