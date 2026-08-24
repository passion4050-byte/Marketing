/**
 * /with-partners — 파트너 콘텐츠 데이터 액세스 레이어
 *
 * Supabase `tenants.partner_slug` + `generated_contents.partner_category` 기반.
 * URL 영문 slug 만 사용 (encodeURIComponent 불필요).
 *
 * 카테고리 6종: eyeclinic / derma / plastic / dental / internal / hair
 *
 * Round 11 (2026-05-26):
 *   배경: Round 10 에서 withTimeout 8초 fallback 을 제거했더니, Vercel 빌드 시점에
 *         6개 카테고리 + hub + ... 각 페이지가 generateStaticParams 호출 시 매번 SQL
 *         쿼리 발생 → 누적 180초 초과 → SIGTERM 빌드 fail.
 *   해결: 모듈 레벨 cache (60초 TTL) — 같은 worker process 내에서 query 는 한 번만
 *         실제 실행, 나머지 페이지는 cache hit. runtime 에서도 같은 serverless instance
 *         내 60초 동안 cache 적중 → 비용/latency 절감.
 *   안전장치: 60초 query timeout (Vercel ↔ Supabase 일시적 지연 대비). 실패 시 throw
 *         → Next.js ISR 이 실패 결과를 캐싱하지 않음 → 다음 요청에서 재시도.
 */
import { getSql } from "./db";

export type PartnerCategory =
  | "eyeclinic"
  | "derma"
  | "plastic"
  | "dental"
  | "internal"
  | "hair"
  | "oriental";  // Round 23 (2026-05-28): 한방의원 추가

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
  {
    slug: "oriental",
    ko: "한방",
    description: "한약·체형교정·다이어트·통증·면역",
    exampleKeywords: ["한약", "체형교정", "한방다이어트", "통증치료"],
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
  /** Round 172 - crawl budget reclaim flag: excluded from sitemap + robots noindex. */
  noindex?: boolean;
  /**
   * Round 174j (2026-08-24) — 슬러그 리네임 전 URL. 301 대상.
   *   한글 슬러그(`라식-318`) 130편을 영문으로 바꾸면 구 URL 이 404 가 된다.
   *   getPartnerPost 가 이 값으로도 매칭하고, 상세 페이지가 새 URL 로 301 을 태운다.
   *   ⚠ 여기서 빼면 리네임된 글의 구 URL 이 즉시 404 — GSC 가 발견한 URL 이 통째로 죽는다.
   */
  former_slug?: string | null;
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
  noindex: boolean | null;
  former_slug: string | null;
}

const POST_SELECT = `
  gc.id, gc.tenant_id, t.name AS tenant_name,
  t.partner_slug, gc.partner_category,
  gc.slug, gc.title, gc.excerpt, gc.body, gc.keyword_text,
  gc.published_at, gc.created_at,
  gc.cover_image_url, gc.cover_image_alt,
  gc.noindex,
  gc.former_slug
`;

const POST_FILTER = `
  gc.is_partner_content = true
  AND gc.status = 'published'
  AND gc.compliance_status = 'pass'
  AND gc.slug IS NOT NULL
  AND length(trim(gc.slug)) > 0
  AND t.partner_slug IS NOT NULL
  AND gc.partner_category IS NOT NULL
  AND COALESCE(gc.market, 'domestic') = 'domestic'
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
    // Round 172 - crawl budget reclaim flag (sitemap exclusion + robots noindex)
    noindex: row.noindex ?? false,
    // Round 174j - 구 슬러그(301 대상). getPartnerPost 매칭에만 쓰인다.
    former_slug: row.former_slug ?? null,
  };
}

/* ───────────────────────── Module-level cache (Round 11) ───────────────────────── */

let _allPostsCache: { data: PartnerPost[]; ts: number } | null = null;
// Round 173 (2026-08-23) - see the same block in posts.ts. During
//   `next build` the 60s TTL expired repeatedly while prerendering ~350 pages and
//   tripped Vercel's 180s static-generation watchdog. Nothing publishes during a
//   build, so hold the snapshot for the whole build; runtime stays at 60s.
const IS_BUILD_PHASE = process.env.NEXT_PHASE === "phase-production-build";
const ALL_POSTS_CACHE_TTL_MS = IS_BUILD_PHASE ? 3_600_000 : 60_000;
const QUERY_TIMEOUT_MS = 60_000;        // 60s — generous timeout for cold start

function isCacheFresh(ts: number): boolean {
  return Date.now() - ts < ALL_POSTS_CACHE_TTL_MS;
}

/**
 * 모듈 레벨 cache 사용.
 *   - 빌드 시점: 첫 페이지가 query 실행, 나머지 페이지는 cache hit → 빌드 timeout 회피.
 *   - runtime:  같은 serverless instance 내 60초 동안 fresh, 그 후 다시 fetch.
 *   - 실패 시:  throw → Next.js ISR 캐시 안 함 → 다음 요청 재시도.
 *   - getSql() null (env 미설정): warn + 빈 배열 (cache 안 함 — 다음 호출에 재시도).
 */
export async function getAllPartnerPosts(): Promise<PartnerPost[]> {
  if (_allPostsCache && isCacheFresh(_allPostsCache.ts)) {
    return _allPostsCache.data;
  }

  const sql = getSql();
  if (!sql) {
    console.warn("[partners] getSql() returned null — env not configured?");
    return [];
  }

  const queryPromise = sql.unsafe<PartnerPostRow[]>(`
    SELECT ${POST_SELECT}
    FROM generated_contents gc
    LEFT JOIN tenants t ON t.id = gc.tenant_id
    WHERE ${POST_FILTER}
    ORDER BY COALESCE(gc.published_at, gc.created_at) DESC
    LIMIT 500
  `);

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`[partners] query timeout (${QUERY_TIMEOUT_MS}ms)`)),
      QUERY_TIMEOUT_MS,
    ),
  );

  try {
    const rows = await Promise.race([queryPromise, timeoutPromise]);
    const posts = rows
      .map(rowToPost)
      .filter((p): p is PartnerPost => p !== null);
    _allPostsCache = { data: posts, ts: Date.now() };
    console.log(
      `[partners] fetched ${rows.length} partner posts (cached for ${ALL_POSTS_CACHE_TTL_MS / 1000}s)`,
    );
    return posts;
  } catch (err) {
    console.error("[partners] getAllPartnerPosts query failed:", err);
    // throw → Next.js ISR does not cache failed result → retry on next request
    throw err;
  }
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
  // Round 126-B (2026-07-05) — 한글 slug 404 수정. Next dynamic route 의 params 는
  // URL-encoded(%EC%8A%A4...) 로 들어오는데 여기만 디코딩 없이 비교해 한글 slug
  // 파트너 글이 전부 404 였음 (posts.ts getPostBySlug 는 디코딩함 — 그래서
  // 자사 /blog 한글 slug 는 정상). 동일 패턴으로 정합.
  let decoded = postSlug;
  try {
    decoded = decodeURIComponent(postSlug);
  } catch {
    // malformed escape 시 raw 그대로
  }
  const posts = await getPartnerPostsByPartner(category, partnerSlug);
  // Round 174j — 현재 슬러그 우선 매칭, 없으면 구 슬러그(former_slug)로 폴백.
  //   순서가 중요하다: 같은 문자열이 A 글의 현재 슬러그이면서 B 글의 구 슬러그일 수
  //   있는데, 그때 현재 슬러그 쪽이 정답이다. 구 슬러그로 잡히면 상세 페이지가
  //   post.slug(= 새 슬러그)와 요청 슬러그가 달라지는 것을 보고 301 을 태운다.
  const current = posts.find((p) => p.slug === decoded || p.slug === postSlug);
  if (current) return current;
  return (
    posts.find((p) => p.former_slug === decoded || p.former_slug === postSlug) ??
    null
  );
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
