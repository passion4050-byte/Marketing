/**
 * 해외(overseas) 가이드 콘텐츠 데이터 — generated_contents 재사용.
 *   lang = en | ja | zh-Hans | zh-Hant, market = 'overseas'.
 *   본문 body(HTML) + raw_qa_pairs(FAQ) 로 렌더. 국내 partners.ts 와 동일 테이블·패턴.
 */
import { getSql } from "./db";

export interface GuideFaq {
  q: string;
  a: string;
}

export interface Guide {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  faq: GuideFaq[];
  lang: string;
  published_at: string | null;
}

export interface GuideCard {
  slug: string;
  title: string;
  excerpt: string | null;
}

function normFaq(raw: unknown): GuideFaq[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        const q = (o.q ?? o.question) as string | undefined;
        const a = (o.a ?? o.answer) as string | undefined;
        if (q && a) return { q: String(q), a: String(a) };
      }
      return null;
    })
    .filter((x): x is GuideFaq => x !== null);
}

export async function getGuide(lang: string, slug: string): Promise<Guide | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql<Array<Record<string, unknown>>>`
      SELECT slug, title, excerpt, body, raw_qa_pairs, lang, published_at
      FROM generated_contents
      WHERE lang = ${lang}
        AND market = 'overseas'
        AND slug = ${slug}
        AND status = 'published'
        AND compliance_status = 'pass'
      LIMIT 1`;
    const r = rows[0];
    if (!r) return null;
    return {
      slug: String(r.slug),
      title: String(r.title ?? ""),
      excerpt: (r.excerpt as string) ?? null,
      body: String(r.body ?? ""),
      faq: normFaq(r.raw_qa_pairs),
      lang: String(r.lang ?? lang),
      published_at: r.published_at ? String(r.published_at) : null,
    };
  } catch {
    return null;
  }
}

export async function getGuides(lang: string): Promise<GuideCard[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    const rows = await sql<Array<Record<string, unknown>>>`
      SELECT slug, title, excerpt
      FROM generated_contents
      WHERE lang = ${lang}
        AND market = 'overseas'
        AND status = 'published'
        AND compliance_status = 'pass'
      ORDER BY COALESCE(published_at, created_at) DESC
      LIMIT 200`;
    return rows.map((r) => ({
      slug: String(r.slug),
      title: String(r.title ?? ""),
      excerpt: (r.excerpt as string) ?? null,
    }));
  } catch {
    return [];
  }
}
