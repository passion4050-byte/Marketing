/**
 * /with-partners — 파트너 콘텐츠 데이터 액세스 레이어
 *
 * Supabase `tenants.partner_slug` + `generated_contents.partner_category` 기반.
 * URL 영문 slug 만 사용 (encodeURIComponent 불필요).
 *
 * 카테고리 6종: eyeclinic / derma / plastic / dental / internal / hair
 */
import { getSql } from "./db";

export type PartnerCategory =
  | "eyeclinic"
  | "derma"
  | "plastic"
  | "dental"
  | "internal"
  | "hair";

export interface PartnerCategoryMeta {
  slug: PartnerCategory;
  ko: string;
  description: string;
  exampleKeywords: string[];
}

export const PARTNER_CATEGORIES: PartnerCategoryMeta[] = [
  {
    slug: "eyeclinic",
    ko: "안과",
    description: "라식·라섹·스마일라식·백내장·노안교정",
    exampleKeywords: ["라식", "라섹", "스마일라식", "백내장", "노안교정"],
  },
  {
    slug: "derma",
    ko: "피부과",
    description: "여드름·색소침착·레이저·필러·보톡스",
    exampleKeywords: ["여드름", "색소침착", "레이저", "필러", "보톡스"],
  },
  {
    slug: "plastic",
    ko: "성형외과",
    description: "안면윤곽·가슴·코·양악·쌍꺼풀",
    exampleKeywords: ["안면윤곽", "가슴", "코성형", "양악", "쌍꺼풀"],
  },
  {
    slug: "dental",
    ko: "치과",
    description: "임플란트·교정·미백·신경치료",
    exampleKeywords: ["임플란트", "교정", "미백", "신경치료"],
  },
  {
    slug: "internal",
    ko: "내과",
    description: "건강검진·내시경·갑상선·당뇨",
    exampleKeywords: ["건강검진", "내시경", "갑상선", "당뇨"],
  },
  {
    slug: "hair",
    ko: "모발이식",
    description: "FUT 절개·FUE 비절개·헤어라인",
    exampleKeywords: ["절개법", "비절개법", "헤어라인", "정수리"],
  },
];

export const PARTNER_CATEGORY_SLUGS: PartnerCategory[] = PARTNER_CATEGORIES.map(
  (c) => c.slug,
);

export function getCategoryMeta(
  slug: string,
): PartnerCategoryMeta | undefined {
  return PARTNER_CATEGORIES.find((c) => c.slug === slug);
}

export interface PartnerTenant {
  id: number;
  name: string;
  partner_slug: string;
  category: PartnerCategory | null;
  region: string | null;
}

export interface PartnerPost {
  id: number;
  tenant_id: number;
  tenant_name: string;
  partner_slug: string;
  partner_category: PartnerCategory;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  published_at: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
}

interface PartnerPostRow {
  id: number;
  tenant_id: number;
  tenant_name: string | null;
  partner_slug: string | null;
  partner_category: string | null;
  slug: string | null;
  title: string | null;
  excerpt: string | null;
  body: string;
  keyword_text: string;
  published_at: string | null;
  created_at: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
}

const POST_SELECT = `
  gc.id, gc.tenant_id, t.name AS tenant_name,
  t.partner_slug, gc.partner_category,
  gc.slug, gc.title, gc.excerpt, gc.body, gc.keyword_text,
  gc.published_at, gc.created_at,
  gc.cover_image_url, gc.cover_image_alt
`;

const POST_FILTER = `
  gc.is_partner_content = true
  AND gc.status = 'published'
  AND gc.compliance_status = 'pass'
  AND gc.slug IS NOT NULL
  AND length(trim(gc.slug)) > 0
  AND t.partner_slug IS NOT NULL
  AND gc.partner_category IS NOT NULL
`;

function toIsoDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && v.length >= 10) return v.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function rowToPost(row: PartnerPostRow): PartnerPost | null {
  if (
    !row.slug ||
    !row.partner_slug ||
    !row.partner_category ||
    !PARTNER_CATEGORY_SLUGS.includes(row.partner_category as PartnerCategory)
  ) {
    return null;
  }
  const title = (row.title || "").trim() || row.keyword_text;
  const excerpt =
    (row.excerpt || "").trim() ||
    stripHtml(row.body).trim().replace(/\s+/g, " ").slice(0, 180);
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    tenant_name: row.tenant_name || "",
    partner_slug: row.partner_slug,
    partner_category: row.partner_category as PartnerCategory,
    slug: row.slug,
    title,
    excerpt,
    body: row.body,
    published_at: toIsoDate(row.published_at ?? row.created_at),
    cover_image_url: row.cover_image_url,
    cover_image_alt: row.cover_image_alt,
  };
}

async function withTimeout<T>(p: Promise<T>, fallback: T, ms = 8000): Promise<T> {
  let to: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<T>((resolve) => {
    to = setTimeout(() => resolve(fallback), ms);
  });
  try {
    return await Promise.race([p, timer]);
  } catch {
    return fallback;
  } finally {
    if (to) clearTimeout(to);
  }
}

/** 모든 파트너 콘텐츠 — sitemap / hub 페이지에서 사용 */
export async function getAllPartnerPosts(): Promise<PartnerPost[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = await withTimeout<PartnerPostRow[]>(
    sql.unsafe<PartnerPostRow[]>(`
      SELECT ${POST_SELECT}
      FROM generated_contents gc
      LEFT JOIN tenants t ON t.id = gc.tenant_id
      WHERE ${POST_FILTER}
      ORDER BY COALESCE(gc.published_at, gc.created_at) DESC
      LIMIT 500
    `),
    [],
  );
  return rows.map(rowToPost).filter((p): p is PartnerPost => p !== null);
}

export async function getPartnerPostsByCategory(
  category: PartnerCategory,
): Promise<PartnerPost[]> {
  const all = await getAllPartnerPosts();
  return all.filter((p) => p.partner_category === category);
}

export async function getPartnerPostsByPartner(
  category: PartnerCategory,
  partnerSlug: string,
): Promise<PartnerPost[]> {
  const all = await getAllPartnerPosts();
  return all.filter(
    (p) => p.partner_category === category && p.partner_slug === partnerSlug,
  );
}

export async function getPartnerPost(
  category: PartnerCategory,
  partnerSlug: string,
  postSlug: string,
): Promise<PartnerPost | null> {
  const posts = await getPartnerPostsByPartner(category, partnerSlug);
  return posts.find((p) => p.slug === postSlug) ?? null;
}

/** 카테고리에서 파트너 (tenant) 목록 — list 페이지 카드 그리드 */
export async function getPartnersInCategory(
  category: PartnerCategory,
): Promise<{ partner_slug: string; tenant_name: string; postCount: number }[]> {
  const posts = await getPartnerPostsByCategory(category);
  const map = new Map<string, { tenant_name: string; postCount: number }>();
  for (const p of posts) {
    const cur = map.get(p.partner_slug);
    if (cur) {
      cur.postCount += 1;
    } else {
      map.set(p.partner_slug, { tenant_name: p.tenant_name, postCount: 1 });
    }
  }
  return Array.from(map.entries()).map(([partner_slug, v]) => ({
    partner_slug,
    ...v,
  }));
}
