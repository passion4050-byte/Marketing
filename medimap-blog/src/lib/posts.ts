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
  channel: string;
  keyword_text: string;
  body: string;
  compliance_status: string;
  status: string;
  slug: string | null;
  title: string | null;
  excerpt: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const DB_SELECT = `
  gc.id, gc.tenant_id, t.name AS tenant_name,
  gc.channel, gc.keyword_text, gc.body,
  gc.compliance_status, gc.status,
  gc.slug, gc.title, gc.excerpt, gc.published_at,
  gc.created_at, gc.updated_at
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

async function getDbPostRows(): Promise<DbPostRow[]> {
  const sql = getSql();
  if (!sql) return [];
  // 2026-05-24: 빌드타임에 Supabase pooler 가 hang 걸려 SIGTERM 발생했었음.
  // 8초 명시적 timeout — 늦으면 빈 배열, build 진행 멈추지 않음.
  // ISR(revalidate=60) 이 첫 요청 시 다시 페치하므로 사용자 영향 0.
  let to: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<DbPostRow[]>((resolve) => {
    to = setTimeout(() => resolve([]), 8000);
  });
  try {
    const query = sql.unsafe<DbPostRow[]>(`
      SELECT ${DB_SELECT}
      FROM generated_contents gc
      LEFT JOIN tenants t ON t.id = gc.tenant_id
      WHERE ${DB_FILTER}
      ORDER BY COALESCE(gc.published_at, gc.created_at) DESC
      LIMIT 200
    `);
    return await Promise.race([query, timer]);
  } catch {
    return [];
  } finally {
    if (to) clearTimeout(to);
  }
}

async function getDbPostRowBySlug(slug: string): Promise<DbPostRow | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql<DbPostRow[]>`
      SELECT
        gc.id, gc.tenant_id, t.name AS tenant_name,
        gc.channel, gc.keyword_text, gc.body,
        gc.compliance_status, gc.status,
        gc.slug, gc.title, gc.excerpt, gc.published_at,
        gc.created_at, gc.updated_at
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

function dbRowToPostMeta(row: DbPostRow): PostMeta {
  // DB 의 title/excerpt/published_at 컬럼 우선, 비었으면 본문 추출 폴백.
  // 날짜 변환은 toIsoDate 로 통일 — postgres.js 가 timestamptz 를 Date 객체로 줄 수 있음.
  const title = (row.title || "").trim() || extractTitleFromBody(row.body, row.keyword_text);
  const rawExcerpt = (row.excerpt || "").trim();
  const description = rawExcerpt
    ? (rawExcerpt.includes("<") ? stripHtml(rawExcerpt).trim().slice(0, 180) : rawExcerpt)
    : extractDescriptionFromBody(row.body, row.keyword_text);
  const date =
    toIsoDate(row.published_at) ??
    toIsoDate(row.created_at) ??
    new Date().toISOString().slice(0, 10);
  const updated = toIsoDate(row.updated_at) ?? toIsoDate(row.published_at) ?? toIsoDate(row.created_at);
  return {
    slug: (row.slug || "").trim(),
    title,
    description,
    date,
    updated,
    category: "메디맵 인사이트",
    tags: row.keyword_text ? [row.keyword_text] : undefined,
    author: row.tenant_name ?? undefined,
    readingMinutes: readingTimeMinutes(stripHtml(row.body)),
    source_type: "html",
  };
}

function dbRowToPost(row: DbPostRow): Post {
  return {
    ...dbRowToPostMeta(row),
    source: row.body,
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

export async function getAllPosts(): Promise<PostMeta[]> {
  const [mdxSlugs, dbRows] = await Promise.all([getMdxSlugs(), getDbPostRows()]);
  const mdxPosts = await Promise.all(mdxSlugs.map((s) => readPostFile(s)));
  const fileMetas = mdxPosts
    .filter((p): p is Post => p !== null)
    .map(({ source: _source, ...meta }) => meta);
  const dbMetas = dbRows.map(dbRowToPostMeta).filter((m) => m.slug);
  // mdx slug 와 DB slug 가 어쩌다 겹치면 mdx 우선 (사용자가 손으로 큐레이션한 글)
  const seen = new Set(fileMetas.map((m) => m.slug));
  const dedupedDb = dbMetas.filter((m) => !seen.has(m.slug));
  return [...fileMetas, ...dedupedDb].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostsForList(): Promise<PostMeta[]> {
  return getAllPosts();
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
