import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { getSql } from "./db";

const POSTS_DIR = path.join(process.cwd(), "content", "blog");

/**
 * 본문 형식 — `mdx` 는 compileMDX 파이프라인, `html` 은 자기 콘텐츠를 그대로 렌더.
 * 자동 발행 콘텐츠(blog_html) 는 generator 가 의료법 통과 HTML 을 만들어 저장하므로 html.
 */
export type PostSourceType = "mdx" | "html";

/**
 * Round 16 (2026-05-27): /blog 자사 인사이트 카테고리 3종.
 * generated_contents.blog_category 컬럼과 동일한 값 (Migration 010).
 */
export type BlogCategorySlug =
  | "content_marketing"
  | "ai_trend"
  | "hospital_marketing";

export interface BlogCategoryMeta {
  slug: BlogCategorySlug;
  ko: string;
  description: string;
  emoji: string;
}

export interface BlogCategoryStyle {
  bg: string;        // Tailwind background class
  border: string;    // hover border
  accent: string;    // text accent on hover
  pillBg: string;    // 카테고리 표시 pill 배경
  pillText: string;
}

export const BLOG_CATEGORIES: (BlogCategoryMeta & { style: BlogCategoryStyle })[] = [
  {
    slug: "content_marketing",
    ko: "콘텐츠 마케팅",
    description: "병원 마케팅을 위한 콘텐츠 전략 인사이트",
    emoji: "",
    style: {
      bg: "bg-blue-50",
      border: "hover:border-blue-500",
      accent: "group-hover:text-blue-700",
      pillBg: "bg-blue-100",
      pillText: "text-blue-700",
    },
  },
  {
    slug: "ai_trend",
    ko: "AI · 마케팅 트렌드",
    description: "AI 검색 시대의 마케팅 변화와 활용법",
    emoji: "",
    style: {
      bg: "bg-violet-50",
      border: "hover:border-violet-500",
      accent: "group-hover:text-violet-700",
      pillBg: "bg-violet-100",
      pillText: "text-violet-700",
    },
  },
  {
    slug: "hospital_marketing",
    ko: "병원 마케팅 노하우",
    description: "현장 의료 마케터를 위한 실전 가이드",
    emoji: "",
    style: {
      bg: "bg-emerald-50",
      border: "hover:border-emerald-500",
      accent: "group-hover:text-emerald-700",
      pillBg: "bg-emerald-100",
      pillText: "text-emerald-700",
    },
  },
];

export const BLOG_CATEGORY_SLUGS: BlogCategorySlug[] = BLOG_CATEGORIES.map(
  (c) => c.slug,
);

export function getBlogCategoryMeta(
  slug: string,
): BlogCategoryMeta | undefined {
  return BLOG_CATEGORIES.find((c) => c.slug === slug);
}

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  category?: string;
  tags?: string[];
  author?: string;
  cover?: string;
  faq?: { question: string; answer: string }[];
  medicalCondition?: string;
  medicalSpecialty?: string;
  reviewedBy?: string;
  /** Pin a post as the blog index hero card. First `featured: true` wins; falls back to newest. */
  featured?: boolean;
  /** Pre-computed reading time in minutes — stays in sync between list & detail. */
  readingMinutes: number;
  /** mdx 파일 vs DB 자동 발행 글 — blog/[slug] 페이지가 렌더 분기에 사용. */
  source_type: PostSourceType;
  cover_image_url?: string;
  cover_image_alt?: string;
  /** Round 81 — Unsplash 사진 출처(작가명 + 프로필 링크). 약관 준수 figcaption 링크용. */
  coverCredit?: { author: string; url: string };
  /** Round 16 — 자사 인사이트 카테고리 (content_marketing / ai_trend / hospital_marketing). 파트너 콘텐츠는 undefined. */
  blogCategory?: BlogCategorySlug;
  /**
   * Round 146 (A2) — 파트너 병원 글이면 tenants.partner_slug.
   * /blog 말미 CTA 분기: 파트너 글 = 환자 카피 + /r/k-{partner} (그 병원 직행),
   * 자사/self = 기존 B2B. self(wecircle-self)·mdx 글은 undefined.
   */
  partnerSlug?: string;
}

export interface Post extends PostMeta {
  source: string;
}

/**
 * Reading time for Korean prose ≈ 600 chars/minute, with a 2-minute floor so
 * very short posts don't round down to 1 minute and feel disposable.
 */
export function readingTimeMinutes(source: string): number {
  const chars = source.replace(/\s+/g, " ").trim().length;
  return Math.max(2, Math.round(chars / 600));
}

async function readPostFile(slug: string): Promise<Post | null> {
  const file = path.join(POSTS_DIR, `${slug}.mdx`);
  try {
    const raw = await fs.readFile(file, "utf8");
    const { data, content } = matter(raw);
    return {
      slug,
      title: String(data.title ?? slug),
      description: String(data.description ?? ""),
      date: String(data.date ?? new Date().toISOString().slice(0, 10)),
      updated: data.updated ? String(data.updated) : undefined,
      category: data.category ? String(data.category) : undefined,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
      author: data.author ? String(data.author) : undefined,
      cover: data.cover ? String(data.cover) : undefined,
      faq: Array.isArray(data.faq) ? data.faq : undefined,
      medicalCondition: data.medicalCondition ? String(data.medicalCondition) : undefined,
      medicalSpecialty: data.medicalSpecialty ? String(data.medicalSpecialty) : undefined,
      reviewedBy: data.reviewedBy ? String(data.reviewedBy) : undefined,
      featured: data.featured === true,
      readingMinutes: readingTimeMinutes(content),
      source_type: "mdx",
      source: content,
    };
  } catch {
    return null;
  }
}

async function getMdxSlugs(): Promise<string[]> {
  try {
    const files = await fs.readdir(POSTS_DIR);
    return files
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => f.replace(/\.mdx$/, ""));
  } catch {
    return [];
  }
}

/* ────────── DB 자동 발행 글 — slug 컬럼 직접 사용 ──────────── */

interface DbPostRow {
  id: number;
  tenant_id: number;
  tenant_name: string | null;
  /** Round 146 (A2) — /blog 말미 CTA 파트너 분기용. self 면 B2B, 파트너면 환자 CTA. */
  partner_slug: string | null;
  channel: string;
  keyword_text: string;
  body: string;
  compliance_status: string;
  status: string;
  slug: string | null;
  title: string | null;
  excerpt: string | null;
  blog_category: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  cover_image_prompt: string | null;
}

const DB_SELECT = `
  gc.id, gc.tenant_id, t.name AS tenant_name, t.partner_slug,
  gc.channel, gc.keyword_text, gc.body,
  gc.compliance_status, gc.status,
  gc.slug, gc.title, gc.excerpt, gc.blog_category,
  gc.published_at,
  gc.created_at, gc.updated_at,
  gc.cover_image_url, gc.cover_image_alt, gc.cover_image_prompt
`;

const DB_FILTER = `
  gc.status = 'published'
  AND gc.channel = 'blog_html'
  AND gc.compliance_status = 'pass'
  AND gc.slug IS NOT NULL
  AND length(trim(gc.slug)) > 0
`;

function toIsoDate(v: unknown): string | undefined {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && v.length >= 10) return v.slice(0, 10);
  return undefined;
}

// Round 17 (2026-05-28): 모듈 캐시 + timeout 30s — partners.ts 와 동일 패턴.
// 8초 timeout 으로 빈 배열 fallback 하던 이전 코드는 ISR/CDN 이 빈 결과를 stuck 시켜
// /blog 페이지가 글이 있는데도 "발행된 글 없음" 표시되는 버그 원인이었음.
// throw on error → Next.js ISR 캐시 안 함 → 다음 요청 재시도.
let _allPostsCache: { data: DbPostRow[]; ts: number } | null = null;
const POSTS_CACHE_TTL_MS = 60_000;
const POSTS_QUERY_TIMEOUT_MS = 30_000;

async function getDbPostRows(): Promise<DbPostRow[]> {
  if (_allPostsCache && Date.now() - _allPostsCache.ts < POSTS_CACHE_TTL_MS) {
    return _allPostsCache.data;
  }
  const sql = getSql();
  if (!sql) {
    console.warn("[posts] getSql() returned null — env not configured?");
    return [];
  }
  const queryPromise = sql.unsafe<DbPostRow[]>(`
    SELECT ${DB_SELECT}
    FROM generated_contents gc
    LEFT JOIN tenants t ON t.id = gc.tenant_id
    WHERE ${DB_FILTER}
    ORDER BY COALESCE(gc.published_at, gc.created_at) DESC
    LIMIT 200
  `);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`[posts] query timeout (${POSTS_QUERY_TIMEOUT_MS}ms)`)),
      POSTS_QUERY_TIMEOUT_MS,
    ),
  );
  try {
    const rows = await Promise.race([queryPromise, timeoutPromise]);
    _allPostsCache = { data: rows, ts: Date.now() };
    console.log(`[posts] fetched ${rows.length} rows (cached for 60s)`);
    return rows;
  } catch (err) {
    console.error("[posts] getDbPostRows query failed (fallback empty):", err);
    // Round 17 fix → 18: throw 가 page 에서 잡혀 빈 결과 stuck → 명시적 빈 배열
    // ISR/CDN 캐시는 middleware no-store 헤더로 무효화. 다음 요청에서 재시도.
    return [];
  }
}

async function getDbPostRowBySlug(slug: string): Promise<DbPostRow | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    // Round 82 (2026-06-26): 콜드 by-slug 로드 시 cover/카테고리/크레딧 유실 버그 수정.
    //   기존 SELECT 가 blog_category·cover_image_* 를 빠뜨려, 리스트 캐시에 없던 글을
    //   직접 URL 로 열면 히어로 이미지·Unsplash 크레딧·카테고리가 사라졌음.
    //   리스트 쿼리(DB_SELECT)와 동일 컬럼으로 통일.
    const rows = await sql<DbPostRow[]>`
      SELECT
        gc.id, gc.tenant_id, t.name AS tenant_name,
        gc.channel, gc.keyword_text, gc.body,
        gc.compliance_status, gc.status,
        gc.slug, gc.title, gc.excerpt, gc.blog_category,
        gc.published_at,
        gc.created_at, gc.updated_at,
        gc.cover_image_url, gc.cover_image_alt, gc.cover_image_prompt
      FROM generated_contents gc
      LEFT JOIN tenants t ON t.id = gc.tenant_id
      WHERE gc.slug = ${slug}
        AND gc.status = 'published'
        AND gc.channel = 'blog_html'
        AND gc.compliance_status = 'pass'
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** 본문 HTML 에서 가벼운 메타 추출 — DB 컬럼이 비었을 때 폴백용. */
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function extractTitleFromBody(body: string, fallback: string): string {
  const m = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (m) return stripHtml(m[1]).trim() || fallback;
  return fallback;
}

function extractDescriptionFromBody(body: string, fallback: string): string {
  const meta = body.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (meta) return meta[1].trim();
  const p = body.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (p) {
    const t = stripHtml(p[1]).trim();
    if (t) return t.slice(0, 180);
  }
  return stripHtml(body).trim().replace(/\s+/g, " ").slice(0, 180) || fallback;
}

// Round 77 — LLM 이 ' → &#x27;, " → &quot; 등으로 escape 한 HTML 엔티티 디코드.
//   본문(HTML)은 브라우저가 자동 디코드하지만, title/description 은 React text 라 그대로 노출됨 → 수동 디코드.
//   &amp; 는 이중 디코드 방지 위해 마지막에 처리.
function decodeEntities(s: string): string {
  return s
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/g, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}

/**
 * Round 146-D (2026-08-15) — 타이틀·설명 이모지 소급 제거.
 * 구 발행분 타이틀의 🩺📌👀✨ 류 이모지가 홈 커버스토리·리스트·상세 헤드라인에
 * 그대로 올라와 Magazine B 에디토리얼 톤을 깨는 최대 잡음원이었음 (라이브 실측).
 * DB 는 건드리지 않고 렌더 단에서만 strip — 신규 발행분은 generator 디렉티브로 차단.
 */
function stripEmoji(s: string): string {
  return s
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function dbRowToPostMeta(row: DbPostRow): PostMeta {
  // DB 의 title/excerpt/published_at 컬럼 우선, 비었으면 본문 추출 폴백.
  // 날짜 변환은 toIsoDate 로 통일 — postgres.js 가 timestamptz 를 Date 객체로 줄 수 있음.
  const title = stripEmoji(
    decodeEntities((row.title || "").trim() || extractTitleFromBody(row.body, row.keyword_text))
  );
  const rawExcerpt = (row.excerpt || "").trim();
  const description = stripEmoji(decodeEntities(
    rawExcerpt
      ? (rawExcerpt.includes("<") ? stripHtml(rawExcerpt).trim().slice(0, 180) : rawExcerpt)
      : extractDescriptionFromBody(row.body, row.keyword_text)
  ));
  const date =
    toIsoDate(row.published_at) ??
    toIsoDate(row.created_at) ??
    new Date().toISOString().slice(0, 10);
  const updated = toIsoDate(row.updated_at) ?? toIsoDate(row.published_at) ?? toIsoDate(row.created_at);
  const blogCategorySlug =
    row.blog_category && BLOG_CATEGORY_SLUGS.includes(row.blog_category as BlogCategorySlug)
      ? (row.blog_category as BlogCategorySlug)
      : undefined;
  const blogCategoryMeta = blogCategorySlug ? getBlogCategoryMeta(blogCategorySlug) : undefined;
  return {
    slug: (row.slug || "").trim(),
    title,
    description,
    date,
    updated,
    category: blogCategoryMeta?.ko ?? "위서클 인사이트",
    tags: row.keyword_text ? [row.keyword_text] : undefined,
    author: row.tenant_name ?? undefined,
    // 파트너 글만 채움 — self 는 B2B CTA 유지 대상이라 undefined 로 남긴다.
    partnerSlug:
      row.partner_slug && row.partner_slug.trim() && row.partner_slug !== "wecircle-self"
        ? row.partner_slug.trim()
        : undefined,
    readingMinutes: readingTimeMinutes(stripHtml(row.body)),
    source_type: "html",
    blogCategory: blogCategorySlug,
    // Round 60 fix (2026-06-01) — cover_image_url / cover_image_alt 누락 함정 해결.
    // SELECT 컬럼 + DbPostRow 타입은 있었는데 PostMeta 매핑이 빠져서
    // /blog index + post 페이지에 cover 안 보이던 버그.
    cover: row.cover_image_url ?? undefined,
    cover_image_url: row.cover_image_url ?? undefined,
    cover_image_alt: row.cover_image_alt ?? undefined,
    coverCredit: parseCoverCredit(row.cover_image_prompt),
  };
}

/** Round 81 — cover_image_prompt 에 저장된 "unsplash_credit|작가|프로필링크" 파싱. */
function parseCoverCredit(
  prompt: string | null | undefined,
): { author: string; url: string } | undefined {
  const p = (prompt ?? "").trim();
  if (!p.startsWith("unsplash_credit|")) return undefined;
  const parts = p.split("|");
  const author = (parts[1] ?? "").trim();
  const url = (parts[2] ?? "").trim();
  return author && url ? { author, url } : undefined;
}

/** Round 81 — 본문의 질문형 H2 + 첫 답변 단락에서 FAQ Q&A 추출 → FAQPage 스키마 발동.
 *  Type A(질문답변형) 글에서 People Also Ask / AI 발췌 유리. 비질문 글은 빈 배열. */
const Q_PAT = /[?？]|(나요|까요|가요|인가요|있나요|되나요|무엇|어떻게|왜|언제|어디|얼마|몇)/;
export function extractFaqFromBody(body: string | null | undefined): { question: string; answer: string }[] {
  if (!body) return [];
  const faqs: { question: string; answer: string }[] = [];
  const sections = body.split(/(?=<h2)/i);
  for (const sec of sections) {
    const h2 = sec.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    if (!h2) continue;
    const q = (h2[1] || '').replace(/<[^>]+>/g, '').trim();
    if (!q || !Q_PAT.test(q)) continue;
    const after = sec.slice((h2.index ?? 0) + h2[0].length);
    const p = after.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (!p) continue;
    const a = (p[1] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (a.length < 20) continue;
    faqs.push({ question: q, answer: a });
  }
  return faqs.slice(0, 8); // Google FAQ 권장 상한
}

function dbRowToPost(row: DbPostRow): Post {
  return {
    ...dbRowToPostMeta(row),
    source: row.body,
    faq: extractFaqFromBody(row.body),
  };
}

/* ────────── public API — file + DB union ────────────────────────── */

export async function getAllPostSlugs(): Promise<string[]> {
  const [mdx, db] = await Promise.all([getMdxSlugs(), getDbPostRows()]);
  return [
    ...mdx,
    ...db.map((r) => (r.slug ?? "").trim()).filter(Boolean),
  ];
}

/**
 * Round 16 — /blog (자사 인사이트) 페이지용. blog_category 가 채워진 글만 반환.
 *   - mdx 의료 콘텐츠 (송파라식/스마일라식/강남라식/백내장 등) 제외
 *   - blog_category=NULL 인 자동 발행 의료 글 제외
 *   - /blog 의 마케팅 에이전시 정체성 보장
 */
export async function getAllPosts(): Promise<PostMeta[]> {
  const [mdxSlugs, dbRows] = await Promise.all([getMdxSlugs(), getDbPostRows()]);
  const mdxPosts = await Promise.all(mdxSlugs.map((s) => readPostFile(s)));
  // mdx 파일은 frontmatter 의 blogCategory 필드 (custom) 가 있을 때만 노출.
  // 기존 의료 mdx 글은 blogCategory 가 없으므로 자동 제외.
  const fileMetas = mdxPosts
    .filter((p): p is Post => p !== null)
    .filter((p) => p.blogCategory !== undefined)
    .map(({ source: _source, ...meta }) => meta);
  const dbMetas = dbRows
    .map(dbRowToPostMeta)
    .filter((m) => m.slug)
    .filter((m) => m.blogCategory !== undefined);
  // mdx slug 와 DB slug 가 어쩌다 겹치면 mdx 우선
  const seen = new Set(fileMetas.map((m) => m.slug));
  const dedupedDb = dbMetas.filter((m) => !seen.has(m.slug));
  return [...fileMetas, ...dedupedDb].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * 전체 글 (mdx + DB) — sitemap.xml, getPostBySlug 등 라우팅 검증용.
 * /blog hub 가 아닌 곳에서 사용.
 */
export async function getAllPostsIncludingLegacy(): Promise<PostMeta[]> {
  const [mdxSlugs, dbRows] = await Promise.all([getMdxSlugs(), getDbPostRows()]);
  const mdxPosts = await Promise.all(mdxSlugs.map((s) => readPostFile(s)));
  const fileMetas = mdxPosts
    .filter((p): p is Post => p !== null)
    .map(({ source: _source, ...meta }) => meta);
  const dbMetas = dbRows.map(dbRowToPostMeta).filter((m) => m.slug);
  const seen = new Set(fileMetas.map((m) => m.slug));
  const dedupedDb = dbMetas.filter((m) => !seen.has(m.slug));
  return [...fileMetas, ...dedupedDb].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostsForList(): Promise<PostMeta[]> {
  return getAllPosts();
}

/**
 * Round 16 — 카테고리별 자사 인사이트 글 목록.
 * blogCategory 가 undefined 인 mdx 파일은 제외 (자동 발행 + 카테고리 부여된 글만).
 */
export async function getPostsByBlogCategory(
  category: BlogCategorySlug,
): Promise<PostMeta[]> {
  const all = await getAllPosts();
  return all.filter((p) => p.blogCategory === category);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  // Next.js dynamic route 의 params.slug 가 URL-encoded(%EA%B0%95...) 로 들어올 수
  // 있으므로 디코딩 후 비교. mdx 파일은 영문 슬러그라 디코딩 후도 동일.
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // malformed escape 시 raw 그대로
  }

  // 1. mdx 파일 우선 (사용자 큐레이션) → 2. DB slug 매칭
  const file = await readPostFile(decoded);
  if (file) return file;
  const row = await getDbPostRowBySlug(decoded);
  return row ? dbRowToPost(row) : null;
}


/**
 * 빌드타임 generateStaticParams 용 — mdx 글만. DB slug 는 dynamicParams=true 로 처리.
 * 2026-05-24: SSG 빌드타임 Supabase pooler hang 회피.
 */
export async function getMdxOnlySlugs(): Promise<string[]> {
  return getMdxSlugs();
}
