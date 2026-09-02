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
      // [R185] Round 185 (2026-09-02) — max 1 -> 3.
      //   1이면 쿼리 하나가 막히는 순간 그 람다 인스턴스의 **모든** 이후 쿼리가
      //   그 뒤에 줄을 선다. 실측(Round 184b): `/blog/[slug]` 콜드 렌더가 300초
      //   런타임 타임아웃까지 갔는데, 같은 런타임의 API 라우트는 193ms 였다.
      //   주의: 무한정 올리지 말 것 — direct URL(5432)이면 인스턴스 수 x max 가
      //   Postgres 커넥션 상한을 먹는다. 3은 보수적 출발값이다.
      max: 3,
      idle_timeout: 20,
      connect_timeout: 5, // Vercel Hobby function timeout 10초 — 빠르게 fail.
      prepare: false, // pgbouncer/transaction-mode 호환
    });
    return _sql;
  } catch {
    return null;
  }
}

/**
 * [R185] Round 185 (2026-09-02) — 타임아웃난 커넥션을 버린다.
 *
 *   목록 쿼리들은 `Promise.race([query, timer])` 로 타임아웃을 구현한다. 그런데
 *   **타이머가 reject 해도 실제 쿼리는 취소되지 않는다** — 커넥션은 계속 점유된
 *   채 남는다. `max:1` 이던 시절엔 그 순간부터 그 인스턴스가 영구히 막혔다.
 *   실측 근거(Round 184b): `/` 가 매 요청 `[partners] query timeout (60000ms)` 를
 *   뱉으면서 `cache=STALE` 로만 연명하고 있었다.
 *
 *   타임아웃 경로에서 이걸 부르면 다음 요청이 새 커넥션을 받는다.
 *   주의: await 하지 말 것. 요청 경로에서 정리를 기다리면 그게 또 지연이 된다.
 */
export function resetSql(): void {
  const dead = _sql;
  _sql = null;
  if (!dead) return;
  try {
    // timeout 0 = 진행 중인 쿼리를 기다리지 않고 즉시 끊는다.
    void dead.end({ timeout: 0 }).catch(() => { /* 정리 실패는 무시 */ });
  } catch {
    /* 이미 닫혔거나 지원하지 않는 상태 — 무시 */
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

// ============================================================
// Round 110-B (2026-07-02) — AI 크롤러 방문 로그
// ============================================================
export interface CrawlerHitEvent {
  bot_name: string;
  user_agent: string | null;
  path: string;
  referer: string | null;
  country: string | null;
  status_code?: number;
}

export async function recordCrawlerHit(evt: CrawlerHitEvent): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    await sql`
      INSERT INTO crawler_hits (bot_name, user_agent, path, referer, country, status_code, hit_at)
      VALUES (
        ${evt.bot_name}, ${evt.user_agent ?? null}, ${evt.path},
        ${evt.referer ?? null}, ${evt.country ?? null},
        ${evt.status_code ?? 200}, NOW()
      )
    `;
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Round 110-C (2026-07-02) — 카카오톡 UTM 유입 로그
// ============================================================
export interface KakaoReferralEvent {
  event: 'kakao_cta_click' | 'kakao_channel_click' | 'kakao_beacon' | 'kakao_floating_click';
  page_path: string | null;
  cta_label: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  tenant_id: number | null;
  user_agent: string | null;
  referer: string | null;
  ip_hash: string | null;
}

export async function recordKakaoReferral(evt: KakaoReferralEvent): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    await sql`
      INSERT INTO kakao_referrals (
        event, page_path, cta_label, utm_source, utm_medium, utm_campaign,
        tenant_id, ip_hash, user_agent, referer, clicked_at
      ) VALUES (
        ${evt.event}, ${evt.page_path}, ${evt.cta_label},
        'kakao', ${evt.utm_medium}, ${evt.utm_campaign},
        ${evt.tenant_id}, ${evt.ip_hash}, ${evt.user_agent}, ${evt.referer},
        NOW()
      )
    `;
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
