/**
 * Admin 페이지 데이터 페치 — Streamlit blogkey-adm 의 핵심 탭 (비용/발행/Funnel) 흡수.
 * lib/inquiries.ts 의 withQueryTimeout 패턴 재사용.
 * 모든 함수는 DATABASE_URL 미설정 시 빈 배열/0 반환 (silent no-op).
 */
import { getSql } from "./db";

const QUERY_TIMEOUT_MS = 4000;

async function withQueryTimeout<T>(
  p: Promise<T>,
  fallback: T,
  ms = QUERY_TIMEOUT_MS,
): Promise<T> {
  let to: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<T>((resolve) => {
    to = setTimeout(() => resolve(fallback), ms);
  });
  try {
    return await Promise.race([p, timer]);
  } finally {
    if (to) clearTimeout(to);
  }
}

/* ─────────────────────── Publications ─────────────────────── */

export interface PublicationRow {
  id: number;
  generated_content_id: number | null;
  channel: string;
  destination_label: string;
  url: string;
  title: string;
  published_at: string | null;
  cite_count: number;
  cited_by_engines: string[] | null;
  blog_id: number | null;
  blog_name: string | null;
  created_at: string;
}

export async function listPublications(limit = 100): Promise<PublicationRow[]> {
  const sql = getSql();
  if (!sql) return [];
  return withQueryTimeout(
    sql.unsafe<PublicationRow[]>(`
      SELECT p.id, p.generated_content_id, p.channel, p.destination_label, p.url,
             p.title, p.published_at, p.cite_count, p.cited_by_engines,
             p.blog_id, b.name AS blog_name, p.created_at
      FROM publications p
      LEFT JOIN blogs b ON b.id = p.blog_id
      ORDER BY COALESCE(p.published_at, p.created_at) DESC
      LIMIT ${limit}
    `) as unknown as Promise<PublicationRow[]>,
    [] as PublicationRow[],
  );
}

export async function getPublicationStats(): Promise<{
  total: number;
  byChannel: Record<string, number>;
  totalCites: number;
  withCitations: number;
}> {
  const sql = getSql();
  if (!sql) {
    return { total: 0, byChannel: {}, totalCites: 0, withCitations: 0 };
  }
  return withQueryTimeout(
    (async () => {
      const rows = await sql<
        { channel: string; cnt: string; cite_sum: string; with_cites: string }[]
      >`
        SELECT channel,
               COUNT(*)::text AS cnt,
               COALESCE(SUM(cite_count),0)::text AS cite_sum,
               COUNT(*) FILTER (WHERE cite_count > 0)::text AS with_cites
        FROM publications
        GROUP BY channel
      `;
      const byChannel: Record<string, number> = {};
      let total = 0,
        totalCites = 0,
        withCitations = 0;
      for (const r of rows) {
        const n = parseInt(r.cnt, 10);
        byChannel[r.channel] = n;
        total += n;
        totalCites += parseInt(r.cite_sum, 10);
        withCitations += parseInt(r.with_cites, 10);
      }
      return { total, byChannel, totalCites, withCitations };
    })(),
    { total: 0, byChannel: {}, totalCites: 0, withCitations: 0 },
  );
}

/* ─────────────────────── LLM Cost ─────────────────────── */

export interface LlmCostRow {
  day: string;
  provider: string;
  model: string;
  calls: number;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
}

export async function getLlmCostDaily(days = 30): Promise<LlmCostRow[]> {
  const sql = getSql();
  if (!sql) return [];
  return withQueryTimeout(
    sql.unsafe<LlmCostRow[]>(`
      SELECT date_trunc('day', called_at AT TIME ZONE 'Asia/Seoul')::date::text AS day,
             provider, model,
             COUNT(*)::int AS calls,
             COALESCE(SUM(cost_usd),0)::float AS cost_usd,
             COALESCE(SUM(input_tokens),0)::int AS input_tokens,
             COALESCE(SUM(output_tokens),0)::int AS output_tokens
      FROM llm_call_logs
      WHERE called_at >= NOW() - INTERVAL '${days} days'
      GROUP BY 1, 2, 3
      ORDER BY day DESC, provider, model
    `) as unknown as Promise<LlmCostRow[]>,
    [] as LlmCostRow[],
  );
}

export async function getLlmCostTotals(): Promise<{
  today: number;
  last7: number;
  last30: number;
  totalCalls: number;
  byProvider: Record<string, { calls: number; cost: number }>;
}> {
  const sql = getSql();
  if (!sql) {
    return { today: 0, last7: 0, last30: 0, totalCalls: 0, byProvider: {} };
  }
  return withQueryTimeout(
    (async () => {
      const [tot] = await sql<{
        today: string;
        last7: string;
        last30: string;
        total_calls: string;
      }[]>`
        SELECT
          COALESCE(SUM(cost_usd) FILTER (WHERE called_at >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'), 0)::text AS today,
          COALESCE(SUM(cost_usd) FILTER (WHERE called_at >= NOW() - INTERVAL '7 days'), 0)::text AS last7,
          COALESCE(SUM(cost_usd) FILTER (WHERE called_at >= NOW() - INTERVAL '30 days'), 0)::text AS last30,
          COUNT(*)::text AS total_calls
        FROM llm_call_logs
      `;
      const byProviderRows = await sql<
        { provider: string; calls: string; cost: string }[]
      >`
        SELECT provider, COUNT(*)::text AS calls, COALESCE(SUM(cost_usd),0)::text AS cost
        FROM llm_call_logs
        WHERE called_at >= NOW() - INTERVAL '30 days'
        GROUP BY provider
        ORDER BY calls DESC
      `;
      const byProvider: Record<string, { calls: number; cost: number }> = {};
      for (const r of byProviderRows) {
        byProvider[r.provider] = {
          calls: parseInt(r.calls, 10),
          cost: parseFloat(r.cost),
        };
      }
      return {
        today: parseFloat(tot?.today ?? "0"),
        last7: parseFloat(tot?.last7 ?? "0"),
        last30: parseFloat(tot?.last30 ?? "0"),
        totalCalls: parseInt(tot?.total_calls ?? "0", 10),
        byProvider,
      };
    })(),
    { today: 0, last7: 0, last30: 0, totalCalls: 0, byProvider: {} },
  );
}

/* ─────────────────────── Funnel ROI ─────────────────────── */

export interface FunnelRow {
  publication_id: number;
  title: string;
  channel: string;
  url: string;
  blog_name: string | null;
  click_count: number;
  inquiry_count: number;
  cite_count: number;
  conversion_pct: number;
  published_at: string | null;
}

/**
 * Publication별 ROI. shortlinks 클릭 + medimap_inquiries 매칭.
 * 자사 블로그 (publications.blog_id 매칭) 와 외부 채널을 동시에 본다.
 */
export async function getFunnelRoi(limit = 50): Promise<FunnelRow[]> {
  const sql = getSql();
  if (!sql) return [];
  return withQueryTimeout(
    sql.unsafe<FunnelRow[]>(`
      WITH click_agg AS (
        SELECT sl.publication_id, COUNT(*) AS click_count
        FROM shortlink_clicks sc
        JOIN shortlinks sl ON sl.id = sc.shortlink_id
        WHERE sl.publication_id IS NOT NULL
        GROUP BY sl.publication_id
      )
      SELECT p.id AS publication_id,
             p.title, p.channel, p.url, b.name AS blog_name,
             COALESCE(c.click_count, 0)::int AS click_count,
             0::int AS inquiry_count,
             p.cite_count,
             CASE WHEN COALESCE(c.click_count,0) > 0
                  THEN ROUND(0::numeric / c.click_count * 100, 2)::float
                  ELSE 0::float END AS conversion_pct,
             p.published_at
      FROM publications p
      LEFT JOIN blogs b ON b.id = p.blog_id
      LEFT JOIN click_agg c ON c.publication_id = p.id
      ORDER BY COALESCE(p.published_at, p.created_at) DESC
      LIMIT ${limit}
    `) as unknown as Promise<FunnelRow[]>,
    [] as FunnelRow[],
  );
}

/* ─────────────────────── Tenants + Auto-Content ─────────────────────── */

export interface TenantSummary {
  id: number;
  name: string;
  active_keywords: number;
  generated_count: number;
  published_count: number;
  auto_enabled: boolean;
  auto_publish: boolean;
  daily_count: number;
  last_run_at: string | null;
}

export async function listTenantsSummary(): Promise<TenantSummary[]> {
  const sql = getSql();
  if (!sql) return [];
  return withQueryTimeout(
    sql.unsafe<TenantSummary[]>(`
      SELECT t.id, t.name,
             (SELECT COUNT(*) FROM keywords k WHERE k.tenant_id=t.id AND k.is_active=true)::int AS active_keywords,
             (SELECT COUNT(*) FROM generated_contents gc WHERE gc.tenant_id=t.id)::int AS generated_count,
             (SELECT COUNT(*) FROM generated_contents gc WHERE gc.tenant_id=t.id AND gc.status='published')::int AS published_count,
             COALESCE(acs.enabled, false) AS auto_enabled,
             COALESCE(acs.auto_publish, false) AS auto_publish,
             COALESCE(acs.daily_count, 0)::int AS daily_count,
             acs.last_run_at::text AS last_run_at
      FROM tenants t
      LEFT JOIN auto_content_settings acs ON acs.tenant_id = t.id
      ORDER BY t.id
    `) as unknown as Promise<TenantSummary[]>,
    [] as TenantSummary[],
  );
}

/* ─────────────────────── Blog Sync (deploy hooks) ─────────────────────── */

export interface DeployHookRow {
  id: number;
  name: string;
  enabled: boolean;
  last_fired_at: string | null;
  last_status: string | null;
}

export async function listDeployHooks(): Promise<DeployHookRow[]> {
  const sql = getSql();
  if (!sql) return [];
  return withQueryTimeout(
    sql.unsafe<DeployHookRow[]>(`
      SELECT id, name, enabled,
             last_fired_at::text AS last_fired_at,
             last_status
      FROM deploy_hooks
      ORDER BY id
    `) as unknown as Promise<DeployHookRow[]>,
    [] as DeployHookRow[],
  );
}
