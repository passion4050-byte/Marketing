import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { getSql } from "./db";

const POSTS_DIR = path.join(process.cwd(), "content", "blog");

/** DB 글 slug 충돌 회피 prefix — mdx 글 slug 와 절대 겹치지 않게. */
const DB_SLUG_PREFIX = "auto-";

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

/* ────────── DB 자동 발행 글 ─────────────────────────────────────── */

interface DbPostRow {
  id: number;
  tenant_id: number;
  tenant_name: string | null;
  channel: string;
  keyword_text: string;
  body: string;
  compliance_status: string;
  status: string;
  created_at: string;
  updated_at: string;
}

async function getDbPostRows(): Promise<DbPostRow[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    return await sql<DbPostRow[]>`
      SELECT
        gc.id, gc.tenant_id, t.name AS tenant_name,
        gc.channel, gc.keyword_text, gc.body,
        gc.compliance_status, gc.status,
        gc.created_at, gc.updated_at
      FROM generated_contents gc
      LEFT JOIN tenants t ON t.id = gc.tenant_id
      WHERE gc.status = 'published'
        AND gc.channel = 'blog_html'
        AND gc.compliance_status = 'pass'
      ORDER BY gc.created_at DESC
      LIMIT 200
    `;
  } catch {
    return [];
  }
}

async function getDbPostRowById(id: number): Promise<DbPostRow | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql<DbPostRow[]>`
      SELECT
        gc.id, gc.tenant_id, t.name AS tenant_name,
        gc.channel, gc.keyword_text, gc.body,
        gc.compliance_status, gc.status,
        gc.created_at, gc.updated_at
      FROM generated_contents gc
      LEFT JOIN tenants t ON t.id = gc.tenant_id
      WHERE gc.id = ${id}
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

function dbRowToSlug(id: number): string {
  return `${DB_SLUG_PREFIX}${id}`;
}

function parseSlug(slug: string): { type: "mdx" } | { type: "db"; id: number } {
  if (slug.startsWith(DB_SLUG_PREFIX)) {
    const id = Number(slug.slice(DB_SLUG_PREFIX.length));
    if (Number.isFinite(id) && id > 0) return { type: "db", id };
  }
  return { type: "mdx" };
}

/** 본문 HTML 에서 가벼운 메타 추출 — title(<h1>), description(<meta>/첫 단락). */
function extractTitle(body: string, fallback: string): string {
  const m = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (m) return stripHtml(m[1]).trim() || fallback;
  return fallback;
}

function extractDescription(body: string, fallback: string): string {
  const meta = body.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (meta) return meta[1].trim();
  const p = body.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (p) {
    const t = stripHtml(p[1]).trim();
    if (t) return t.slice(0, 180);
  }
  const flat = stripHtml(body).trim().replace(/\s+/g, " ");
  return flat.slice(0, 180) || fallback;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function dbRowToPostMeta(row: DbPostRow): PostMeta {
  function toIsoDate(v: unknown): string | undefined {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === "string" && v.length >= 10) return v.slice(0, 10);
    return undefined;
  }
  const title = extractTitle(row.body, row.keyword_text);
  const description = extractDescription(row.body, row.keyword_text);
  const date = toIsoDate(row.created_at) ?? new Date().toISOString().slice(0, 10);
  const updated = toIsoDate(row.updated_at) ?? toIsoDate(row.created_at);
  return {
    slug: dbRowToSlug(row.id),
    title,
    description,
    date,
    updated,
    category: "자동 발행",
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
  return [...mdx, ...db.map((r) => dbRowToSlug(r.id))];
}

export async function getAllPosts(): Promise<PostMeta[]> {
  const [mdxSlugs, dbRows] = await Promise.all([getMdxSlugs(), getDbPostRows()]);
  const mdxPosts = await Promise.all(mdxSlugs.map((s) => readPostFile(s)));
  const fileMetas = mdxPosts
    .filter((p): p is Post => p !== null)
    .map(({ source: _source, ...meta }) => meta);
  const dbMetas = dbRows.map(dbRowToPostMeta);
  return [...fileMetas, ...dbMetas].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostsForList(): Promise<PostMeta[]> {
  return getAllPosts();
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const parsed = parseSlug(slug);
  if (parsed.type === "db") {
    const row = await getDbPostRowById(parsed.id);
    return row ? dbRowToPost(row) : null;
  }
  return readPostFile(slug);
}
