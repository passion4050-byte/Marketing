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
  cover_image_url: string | null;
  cover_image_alt: string | null;
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
    const rows = await sql.unsafe<Array<Record<string, unknown>>>(
      `SELECT slug, title, excerpt, body, raw_qa_pairs, lang, published_at, cover_image_url, cover_image_alt
       FROM generated_contents
       WHERE lang = $1
         AND market = 'overseas'
         AND slug = $2
         AND status = 'published'
         AND compliance_status = 'pass'
       LIMIT 1`,
      [lang, slug]
    );
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
      cover_image_url: (r.cover_image_url as string) ?? null,
      cover_image_alt: (r.cover_image_alt as string) ?? null,
    };
  } catch {
    return null;
  }
}

export async function getGuides(lang: string): Promise<GuideCard[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    const rows = await sql.unsafe<Array<Record<string, unknown>>>(
      `SELECT slug, title, excerpt
       FROM generated_contents
       WHERE lang = $1
         AND market = 'overseas'
         AND status = 'published'
         AND compliance_status = 'pass'
       ORDER BY COALESCE(published_at, created_at) DESC
       LIMIT 200`,
      [lang]
    );
    return rows.map((r) => ({
      slug: String(r.slug),
      title: String(r.title ?? ""),
      excerpt: (r.excerpt as string) ?? null,
    }));
  } catch {
    return [];
  }
}

// ── 국내 구조 미러: 블로그(비파트너 정보형) + 클리닉(파트너 병원별) ──

export interface OverseasCard {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  partner_category: string | null;
  partner_slug: string | null;
  is_partner: boolean;
}

/** kind: 'blog'(비파트너) | 'clinic'(파트너). category/partner 로 추가 필터. */
export async function getOverseasCards(
  lang: string,
  opts: { kind?: "blog" | "clinic"; category?: string; partner?: string } = {}
): Promise<OverseasCard[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    const where: string[] = [
      "g.lang = $1",
      "g.market = 'overseas'",
      "g.status = 'published'",
      "g.compliance_status = 'pass'",
    ];
    const params: unknown[] = [lang];
    if (opts.kind === "blog") where.push("g.is_partner_content = false");
    if (opts.kind === "clinic") where.push("g.is_partner_content = true");
    if (opts.category) {
      params.push(opts.category);
      where.push(`g.partner_category = $${params.length}`);
    }
    if (opts.partner) {
      params.push(opts.partner);
      where.push(`t.partner_slug = $${params.length}`);
    }
    const rows = await sql.unsafe<Array<Record<string, unknown>>>(
      `SELECT g.slug, g.title, g.excerpt, g.cover_image_url, g.partner_category, g.is_partner_content, t.partner_slug
       FROM generated_contents g LEFT JOIN tenants t ON t.id = g.tenant_id
       WHERE ${where.join(" AND ")}
       ORDER BY COALESCE(g.published_at, g.created_at) DESC
       LIMIT 200`,
      params
    );
    return rows.map((r) => ({
      slug: String(r.slug),
      title: String(r.title ?? ""),
      excerpt: (r.excerpt as string) ?? null,
      cover_image_url: (r.cover_image_url as string) ?? null,
      partner_category: (r.partner_category as string) ?? null,
      partner_slug: (r.partner_slug as string) ?? null,
      is_partner: Boolean(r.is_partner_content),
    }));
  } catch {
    return [];
  }
}

/** 클리닉 파트너 콘텐츠 detail — partner_slug 검증 포함. Guide 형태 반환. */
export async function getClinicContent(
  lang: string,
  partner: string,
  slug: string
): Promise<Guide | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql.unsafe<Array<Record<string, unknown>>>(
      `SELECT g.slug, g.title, g.excerpt, g.body, g.raw_qa_pairs, g.lang, g.published_at, g.cover_image_url, g.cover_image_alt
       FROM generated_contents g JOIN tenants t ON t.id = g.tenant_id
       WHERE g.lang = $1 AND g.market = 'overseas' AND g.slug = $2 AND t.partner_slug = $3
         AND g.status = 'published' AND g.compliance_status = 'pass'
       LIMIT 1`,
      [lang, slug, partner]
    );
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
      cover_image_url: (r.cover_image_url as string) ?? null,
      cover_image_alt: (r.cover_image_alt as string) ?? null,
    };
  } catch {
    return null;
  }
}
