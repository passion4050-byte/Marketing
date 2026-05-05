/**
 * medimap_inquiries 테이블 액세스 — db.ts (postgres.js) 패턴 재사용.
 *
 * DATABASE_URL 미설정 시 silent no-op (제출은 false 반환, 조회는 빈 배열).
 * 어드민 페이지는 DATABASE_URL 가 없으면 "DB 미연결" 안내 노출.
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

export async function probeConnection(): Promise<{
  configured: boolean;
  reachable: boolean;
  error?: string;
}> {
  const sql = getSql();
  if (!sql) return { configured: false, reachable: false };
  return withQueryTimeout(
    (async () => {
      try {
        await sql`SELECT 1`;
        return { configured: true, reachable: true };
      } catch (e) {
        return {
          configured: true,
          reachable: false,
          error: e instanceof Error ? e.message : "unknown-error",
        };
      }
    })(),
    { configured: true, reachable: false, error: "timeout" },
    5000,
  );
}

export type InquiryFormType = "partnership" | "listing" | "contact";
export type InquiryStatus = "new" | "in_progress" | "replied" | "archived";

export interface InquiryRow {
  id: number;
  form_type: InquiryFormType;
  org_name: string;
  contact_name: string;
  phone: string | null;
  email: string | null;
  message: string;
  status: InquiryStatus;
  notes: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  referer: string | null;
  created_at: string;
  updated_at: string;
}

export interface InquirySubmitInput {
  form_type: InquiryFormType;
  org_name: string;
  contact_name: string;
  phone?: string;
  email?: string;
  message: string;
  ip_hash?: string;
  user_agent?: string;
  referer?: string;
}

const FORM_TYPES: InquiryFormType[] = ["partnership", "listing", "contact"];
const STATUSES: InquiryStatus[] = ["new", "in_progress", "replied", "archived"];

export function isInquiryFormType(v: unknown): v is InquiryFormType {
  return typeof v === "string" && FORM_TYPES.includes(v as InquiryFormType);
}
export function isInquiryStatus(v: unknown): v is InquiryStatus {
  return typeof v === "string" && STATUSES.includes(v as InquiryStatus);
}

export async function submitInquiry(
  input: InquirySubmitInput,
): Promise<{ ok: boolean; id?: number; error?: string }> {
  const sql = getSql();
  if (!sql) return { ok: false, error: "database-unconfigured" };
  return withQueryTimeout(
    (async () => {
      try {
        const rows = await sql<{ id: number }[]>`
          INSERT INTO medimap_inquiries (
            form_type, org_name, contact_name, phone, email, message,
            ip_hash, user_agent, referer
          ) VALUES (
            ${input.form_type}, ${input.org_name}, ${input.contact_name},
            ${input.phone ?? null}, ${input.email ?? null}, ${input.message},
            ${input.ip_hash ?? null}, ${input.user_agent ?? null}, ${input.referer ?? null}
          )
          RETURNING id
        `;
        return { ok: true, id: rows[0]?.id };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "insert-failed",
        };
      }
    })(),
    { ok: false, error: "timeout" },
  );
}

export interface ListInquiriesFilter {
  form_type?: InquiryFormType;
  status?: InquiryStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listInquiries(
  filter: ListInquiriesFilter = {},
): Promise<{ rows: InquiryRow[]; total: number }> {
  const sql = getSql();
  if (!sql) return { rows: [], total: 0 };
  const limit = Math.max(1, Math.min(filter.limit ?? 50, 200));
  const offset = Math.max(0, filter.offset ?? 0);
  return withQueryTimeout(
    (async () => {
      try {
        const where = sql`
          WHERE (${filter.form_type ?? null}::text IS NULL OR form_type = ${filter.form_type ?? null})
            AND (${filter.status    ?? null}::text IS NULL OR status    = ${filter.status    ?? null})
            AND (
              ${filter.search ?? null}::text IS NULL
              OR org_name     ILIKE ${"%" + (filter.search ?? "") + "%"}
              OR contact_name ILIKE ${"%" + (filter.search ?? "") + "%"}
              OR message      ILIKE ${"%" + (filter.search ?? "") + "%"}
            )
        `;
        const rows = await sql<InquiryRow[]>`
          SELECT * FROM medimap_inquiries
          ${where}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const totalRows = await sql<{ c: string }[]>`
          SELECT COUNT(*)::text AS c FROM medimap_inquiries ${where}
        `;
        return { rows, total: Number(totalRows[0]?.c ?? 0) };
      } catch {
        return { rows: [], total: 0 };
      }
    })(),
    { rows: [], total: 0 },
  );
}

export async function getInquiry(id: number): Promise<InquiryRow | null> {
  const sql = getSql();
  if (!sql) return null;
  return withQueryTimeout(
    (async () => {
      try {
        const rows = await sql<InquiryRow[]>`
          SELECT * FROM medimap_inquiries WHERE id = ${id} LIMIT 1
        `;
        return rows[0] ?? null;
      } catch {
        return null;
      }
    })(),
    null,
  );
}

export async function updateInquiry(
  id: number,
  patch: { status?: InquiryStatus; notes?: string },
): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    await sql`
      UPDATE medimap_inquiries
      SET status = COALESCE(${patch.status ?? null}, status),
          notes  = COALESCE(${patch.notes  ?? null}, notes)
      WHERE id = ${id}
    `;
    return true;
  } catch {
    return false;
  }
}

// 어드민 대시보드용 집계 — 단일 라운드트립.
export interface InquiryStats {
  total: number;
  thisWeek: number;
  byFormType: Record<InquiryFormType, number>;
  byStatus: Record<InquiryStatus, number>;
  daily: { date: string; count: number }[]; // 최근 30일
}

export async function getInquiryStats(): Promise<InquiryStats> {
  const empty: InquiryStats = {
    total: 0,
    thisWeek: 0,
    byFormType: { partnership: 0, listing: 0, contact: 0 },
    byStatus: { new: 0, in_progress: 0, replied: 0, archived: 0 },
    daily: [],
  };
  const sql = getSql();
  if (!sql) return empty;
  return withQueryTimeout(loadStats(sql, empty), empty);
}

async function loadStats(
  sql: NonNullable<ReturnType<typeof getSql>>,
  empty: InquiryStats,
): Promise<InquiryStats> {
  try {
    const [totals, byType, byStatusRows, daily] = await Promise.all([
      sql<{ total: string; this_week: string }[]>`
        SELECT COUNT(*)::text AS total,
               COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '7 days')::text AS this_week
        FROM medimap_inquiries
      `,
      sql<{ form_type: InquiryFormType; c: string }[]>`
        SELECT form_type, COUNT(*)::text AS c
        FROM medimap_inquiries GROUP BY form_type
      `,
      sql<{ status: InquiryStatus; c: string }[]>`
        SELECT status, COUNT(*)::text AS c
        FROM medimap_inquiries GROUP BY status
      `,
      sql<{ d: string; c: string }[]>`
        SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS d, COUNT(*)::text AS c
        FROM medimap_inquiries
        WHERE created_at >= now() - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY 1
      `,
    ]);

    const byFormType = { ...empty.byFormType };
    for (const r of byType) byFormType[r.form_type] = Number(r.c);
    const byStatus = { ...empty.byStatus };
    for (const r of byStatusRows) byStatus[r.status] = Number(r.c);

    return {
      total: Number(totals[0]?.total ?? 0),
      thisWeek: Number(totals[0]?.this_week ?? 0),
      byFormType,
      byStatus,
      daily: daily.map((r) => ({ date: r.d, count: Number(r.c) })),
    };
  } catch {
    return empty;
  }
}

