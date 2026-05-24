/**
 * 클라이언트 포털 (/client/*) 데이터 페치 — Tenant 자기 데이터만.
 *
 * MVP: tenant_id 1 (TETE) 하드코딩. 향후 PR 에서 tenant별 인증 + 동적 ID.
 * Done For You SaaS 모델 — 클라이언트는 입력 + 결과 보기. 풀 어드민 X.
 */
import { getSql } from "./db";

const QUERY_TIMEOUT_MS = 8000;
const TENANT_ID = 1; // MVP — TETE 하드코딩

async function withQueryTimeout<T>(p: Promise<T>, fallback: T, ms = QUERY_TIMEOUT_MS): Promise<T> {
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

export interface ClientDashboardStats {
  tenantName: string;
  publishedCount: number;
  publicationsCount: number;
  totalCites: number;
  totalClicks: number;
  totalInquiries: number;
  activeKeywords: number;
  lastPublishedAt: string | null;
}

export async function getClientDashboard(): Promise<ClientDashboardStats> {
  const sql = getSql();
  const fallback: ClientDashboardStats = {
    tenantName: "—",
    publishedCount: 0,
    publicationsCount: 0,
    totalCites: 0,
    totalClicks: 0,
    totalInquiries: 0,
    activeKeywords: 0,
    lastPublishedAt: null,
  };
  if (!sql) return fallback;
  return withQueryTimeout(
    (async () => {
      const [row] = await sql<
        {
          tenant_name: string | null;
          pub_count: string;
          publications: string;
          cites: string;
          clicks: string;
          inquiries: string;
          kw: string;
          last_pub: string | null;
        }[]
      >`
        SELECT
          (SELECT name FROM tenants WHERE id = ${TENANT_ID}) AS tenant_name,
          (SELECT COUNT(*)::text FROM generated_contents WHERE tenant_id=${TENANT_ID} AND status='published') AS pub_count,
          (SELECT COUNT(*)::text FROM publications WHERE tenant_id=${TENANT_ID}) AS publications,
          (SELECT COALESCE(SUM(cite_count),0)::text FROM publications WHERE tenant_id=${TENANT_ID}) AS cites,
          (SELECT COALESCE(SUM(click_count),0)::text FROM shortlinks WHERE tenant_id=${TENANT_ID}) AS clicks,
          (SELECT 0::text) AS inquiries,
          (SELECT COUNT(*)::text FROM keywords WHERE tenant_id=${TENANT_ID} AND is_active=true) AS kw,
          (SELECT MAX(published_at)::text FROM generated_contents WHERE tenant_id=${TENANT_ID} AND status='published') AS last_pub
      `;
      return {
        tenantName: row?.tenant_name ?? "—",
        publishedCount: parseInt(row?.pub_count ?? "0", 10),
        publicationsCount: parseInt(row?.publications ?? "0", 10),
        totalCites: parseInt(row?.cites ?? "0", 10),
        totalClicks: parseInt(row?.clicks ?? "0", 10),
        totalInquiries: parseInt(row?.inquiries ?? "0", 10),
        activeKeywords: parseInt(row?.kw ?? "0", 10),
        lastPublishedAt: row?.last_pub ?? null,
      };
    })(),
    fallback,
  );
}

export interface ClientPublication {
  id: number;
  title: string;
  channel: string;
  url: string;
  published_at: string | null;
  cite_count: number;
}

export async function listClientPublications(limit = 30): Promise<ClientPublication[]> {
  const sql = getSql();
  if (!sql) return [];
  return withQueryTimeout(
    sql.unsafe<ClientPublication[]>(`
      SELECT id, title, channel, url, published_at::text, cite_count
      FROM publications
      WHERE tenant_id = ${TENANT_ID}
      ORDER BY COALESCE(published_at, created_at) DESC
      LIMIT ${limit}
    `) as unknown as Promise<ClientPublication[]>,
    [] as ClientPublication[],
  );
}

export interface ClientKeyword {
  id: number;
  text: string;
  category: string | null;
  target_brand: string | null;
  is_active: boolean;
  created_at: string;
}

export async function listClientKeywords(): Promise<ClientKeyword[]> {
  const sql = getSql();
  if (!sql) return [];
  return withQueryTimeout(
    sql.unsafe<ClientKeyword[]>(`
      SELECT id, text, category, target_brand, is_active, created_at::text
      FROM keywords
      WHERE tenant_id = ${TENANT_ID}
      ORDER BY id DESC
    `) as unknown as Promise<ClientKeyword[]>,
    [] as ClientKeyword[],
  );
}

export interface ClientPersona {
  id: number;
  name: string;
  domain_category: string;
  region: string;
  business_model: string;
  address: string | null;
  homepage: string | null;
  phone: string | null;
  naver_place_url: string | null;
}

export async function getClientPersona(): Promise<ClientPersona | null> {
  const sql = getSql();
  if (!sql) return null;
  return withQueryTimeout(
    (async () => {
      const [row] = await sql<ClientPersona[]>`
        SELECT id, name, domain_category, region, business_model,
               address, homepage, phone, naver_place_url
        FROM tenants
        WHERE id = ${TENANT_ID}
        LIMIT 1
      `;
      return row ?? null;
    })(),
    null,
  );
}

/** 키워드 추가 — server action 용 */
export async function addClientKeyword(text: string, category?: string): Promise<{ ok: boolean; id?: number; error?: string }> {
  const sql = getSql();
  if (!sql) return { ok: false, error: "database-unconfigured" };
  const clean = text.trim();
  if (!clean) return { ok: false, error: "키워드를 입력해주세요" };
  if (clean.length > 100) return { ok: false, error: "100자 이내" };
  try {
    const exists = await sql<{ id: number }[]>`
      SELECT id FROM keywords WHERE tenant_id=${TENANT_ID} AND text=${clean} LIMIT 1
    `;
    if (exists[0]) return { ok: false, error: "이미 등록된 키워드" };
    const inserted = await sql<{ id: number }[]>`
      INSERT INTO keywords (tenant_id, text, category, is_active, target_brand)
      VALUES (${TENANT_ID}, ${clean}, ${category ?? ""}, true, 'tete')
      RETURNING id
    `;
    return { ok: true, id: inserted[0]?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}

/** 키워드 활성/비활성 토글 */
export async function toggleClientKeyword(id: number, active: boolean): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    await sql`UPDATE keywords SET is_active=${active} WHERE id=${id} AND tenant_id=${TENANT_ID}`;
    return true;
  } catch {
    return false;
  }
}

/** 페르소나 정보 업데이트 */
export async function updateClientPersona(input: {
  domain_category?: string;
  region?: string;
  business_model?: string;
  address?: string;
  homepage?: string;
  phone?: string;
  naver_place_url?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const sql = getSql();
  if (!sql) return { ok: false, error: "database-unconfigured" };
  try {
    await sql`
      UPDATE tenants SET
        domain_category = COALESCE(${input.domain_category ?? null}, domain_category),
        region = COALESCE(${input.region ?? null}, region),
        business_model = COALESCE(${input.business_model ?? null}, business_model),
        address = ${input.address ?? null},
        homepage = ${input.homepage ?? null},
        phone = ${input.phone ?? null},
        naver_place_url = ${input.naver_place_url ?? null}
      WHERE id = ${TENANT_ID}
    `;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}
