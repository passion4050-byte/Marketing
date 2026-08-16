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
  is_partner?: boolean;
  partner_category?: string | null;
  partner_slug?: string | null;
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
      `SELECT g.slug, g.title, g.excerpt, g.body, g.raw_qa_pairs, g.lang, g.published_at, g.cover_image_url, g.cover_image_alt,
              g.is_partner_content, g.partner_category, t.partner_slug
       FROM generated_contents g LEFT JOIN tenants t ON t.id = g.tenant_id
       WHERE g.lang = $1
         AND g.market = 'overseas'
         AND g.slug = $2
         AND g.status = 'published'
         AND g.compliance_status = 'pass'
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
      is_partner: Boolean(r.is_partner_content),
      partner_category: (r.partner_category as string) ?? null,
      partner_slug: (r.partner_slug as string) ?? null,
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
  blog_category?: string | null;
}

/** kind: 'blog'(비파트너) | 'clinic'(파트너). category/partner 로 추가 필터. */
export async function getOverseasCards(
  lang: string,
  opts: {
    kind?: "blog" | "clinic";
    category?: string;
    partner?: string;
    blogCategory?: string;
  } = {}
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
    const params: string[] = [lang];
    if (opts.kind === "blog") where.push("g.is_partner_content = false");
    if (opts.kind === "clinic") where.push("g.is_partner_content = true");
    if (opts.category) {
      params.push(opts.category);
      where.push(`g.partner_category = $${params.length}`);
    }
    if (opts.blogCategory) {
      params.push(opts.blogCategory);
      where.push(`g.blog_category = $${params.length}`);
    }
    if (opts.partner) {
      params.push(opts.partner);
      where.push(`t.partner_slug = $${params.length}`);
    }
    const rows = await sql.unsafe<Array<Record<string, unknown>>>(
      `SELECT g.slug, g.title, g.excerpt, g.cover_image_url, g.partner_category, g.is_partner_content, g.blog_category, t.partner_slug
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
      blog_category: (r.blog_category as string) ?? null,
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
         AND g.is_partner_content = true
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

// ── /{lang}/clinics 통합 인덱스: 콘텐츠 있는 파트너 병원 목록 ──

export interface OverseasPartner {
  partner_category: string;
  partner_slug: string;
  name: string;
  count: number;
  cover_image_url: string | null;
}

/**
 * 파트너 병원의 언어별 표시명 — 실제 발행 콘텐츠 표기 기준.
 * 매핑 없으면 한국어 t.name 으로 폴백(무회귀).
 */
const OVERSEAS_PARTNER_DISPLAY: Record<string, Record<string, string>> = {
  dear: {
    en: "Cheongdam Dear Clinic",
    ja: "清潭ディア医院",
    "zh-Hans": "清潭Dear医院",
    "zh-Hant": "清潭Dear醫院", // Round 159b — 대만(번체)
  },
  // Round 145d (2026-08-15) — 엔티티 디렉토리 등재용 (감사 #8). 브랜드 라틴 표기는 전 언어 공통 안전.
  gangnamyonsei: { en: "Gangnam Yonsei Eye Clinic", ja: "Gangnam Yonsei Eye Clinic", "zh-Hans": "Gangnam Yonsei Eye Clinic", "zh-Hant": "Gangnam Yonsei Eye Clinic" },
  brighteye: { en: "Bright Eye Clinic Gangnam", ja: "Bright Eye Clinic Gangnam", "zh-Hans": "Bright Eye Clinic Gangnam", "zh-Hant": "Bright Eye Clinic Gangnam" },
  bgn: { en: "BGN Eye Clinic Jamsil", ja: "BGN Eye Clinic Jamsil", "zh-Hans": "BGN Eye Clinic Jamsil", "zh-Hant": "BGN Eye Clinic Jamsil" },
  "bgn-busan": { en: "BGN Eye Clinic Busan", ja: "BGN Eye Clinic Busan", "zh-Hans": "BGN Eye Clinic Busan", "zh-Hant": "BGN Eye Clinic Busan" },
  mowoolim: { en: "Mowoolim Clinic", ja: "Mowoolim Clinic", "zh-Hans": "Mowoolim Clinic", "zh-Hant": "Mowoolim Clinic" },
  "partner-20": { en: "Kwangdong Hospital", ja: "Kwangdong Hospital", "zh-Hans": "Kwangdong Hospital", "zh-Hant": "Kwangdong Hospital" },
};

/** partner_slug + lang → 표시명(폴백: 한국어 name). */
export function overseasPartnerName(
  partnerSlug: string,
  lang: string,
  fallback: string
): string {
  return OVERSEAS_PARTNER_DISPLAY[partnerSlug]?.[lang] ?? fallback;
}

/** 해당 언어에 파트너 콘텐츠가 실제로 있는 병원만 (대표 커버·건수 포함). */
export async function getOverseasPartners(lang: string): Promise<OverseasPartner[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    const rows = await sql.unsafe<Array<Record<string, unknown>>>(
      `SELECT g.partner_category, t.partner_slug, t.name,
              count(*) AS cnt,
              (array_agg(g.cover_image_url ORDER BY COALESCE(g.published_at, g.created_at) DESC))[1] AS cover_image_url
       FROM generated_contents g JOIN tenants t ON t.id = g.tenant_id
       WHERE g.lang = $1 AND g.market = 'overseas' AND g.status = 'published'
         AND g.compliance_status = 'pass' AND g.is_partner_content = true
         AND g.partner_category IS NOT NULL AND t.partner_slug IS NOT NULL
       GROUP BY g.partner_category, t.partner_slug, t.name
       ORDER BY cnt DESC`,
      [lang]
    );
    return rows.map((r) => ({
      partner_category: String(r.partner_category),
      partner_slug: String(r.partner_slug),
      name: overseasPartnerName(
        String(r.partner_slug),
        lang,
        String(r.name ?? r.partner_slug)
      ),
      count: Number(r.cnt ?? 0),
      cover_image_url: (r.cover_image_url as string) ?? null,
    }));
  } catch {
    return [];
  }
}

// ── 파트너 병원 엔티티 정보 (MedicalClinic 스키마용) ──

export interface PartnerClinicInfo {
  name: string;
  homepage: string | null;
  address: string | null;
  region: string | null;
  phone: string | null;
  domain_category: string | null;
  partner_slug: string;
}

/** partner_slug 로 병원 엔티티 메타 조회 (구조화 데이터·상세용). */
export async function getPartnerBySlug(slug: string): Promise<PartnerClinicInfo | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql.unsafe<Array<Record<string, unknown>>>(
      `SELECT name, homepage, address, region, phone, domain_category, partner_slug
       FROM tenants WHERE partner_slug = $1 LIMIT 1`,
      [slug]
    );
    const r = rows[0];
    if (!r) return null;
    return {
      name: String(r.name ?? slug),
      homepage: (r.homepage as string) ?? null,
      address: (r.address as string) ?? null,
      region: (r.region as string) ?? null,
      phone: (r.phone as string) ?? null,
      domain_category: (r.domain_category as string) ?? null,
      partner_slug: String(r.partner_slug ?? slug),
    };
  } catch {
    return null;
  }
}

// ── Round 145d (2026-08-15) — 해외 클리닉 엔티티 디렉토리 (감사 #8) ──
//   기존 getOverseasPartners 는 "발행 콘텐츠가 있는" 파트너만 반환 → EN 에 청담디어 1곳뿐.
//   가이드 본문에 등장하는 파트너(밝은눈·BGN 등)가 /clinics 에 부재 = 여정 단절.
//   이 함수는 tenant_products(해외 언어 상품 활성) 기준 '엔티티'를 등재하고
//   콘텐츠 수는 LEFT JOIN — 콘텐츠 0이어도 프로필로 노출된다(국내 /with-partners 미러).

export interface OverseasClinicEntry {
  category: string; // eyeclinic | derma | plastic | dental | hair | oriental | internal
  partner_slug: string;
  name: string;
  guides: number;
  cover_image_url: string | null;
}

const DOMAIN_TO_OVERSEAS_CAT: Record<string, string> = {
  안과: "eyeclinic", 피부과: "derma", 성형외과: "plastic", 치과: "dental",
  내과: "internal", 모발이식: "hair", 한방의원: "oriental", 한방: "oriental",
  eyeclinic: "eyeclinic", derma: "derma", plastic: "plastic", dental: "dental",
  internal: "internal", hair: "hair", oriental: "oriental",
};

/** langPath("en"|"ja"|"zh"|"tw") → 상품 lang(측정계: zh 계열은 zh-Hant) / 콘텐츠 lang(zh→zh-Hans, tw→zh-Hant). */
export async function getOverseasClinicDirectory(langPath: string): Promise<OverseasClinicEntry[]> {
  const sql = getSql();
  if (!sql) return [];
  const productLang = langPath === "zh" || langPath === "tw" ? "zh-Hant" : langPath;
  const contentLang = langPath === "zh" ? "zh-Hans" : langPath === "tw" ? "zh-Hant" : langPath;
  try {
    const rows = await sql.unsafe<Array<Record<string, unknown>>>(
      `SELECT t.partner_slug, t.name, t.domain_category,
              COALESCE(g.cnt, 0) AS cnt, g.cover_image_url
       FROM tenants t
       JOIN tenant_products tp
         ON tp.tenant_id = t.id AND tp.market = 'overseas'
        AND tp.lang = $1 AND tp.status = 'active'
       LEFT JOIN LATERAL (
         SELECT count(*) AS cnt,
                (array_agg(gc.cover_image_url ORDER BY COALESCE(gc.published_at, gc.created_at) DESC))[1]
                  AS cover_image_url
         FROM generated_contents gc
         WHERE gc.tenant_id = t.id AND gc.market = 'overseas' AND gc.lang = $2
           AND gc.status = 'published' AND gc.compliance_status = 'pass'
           AND gc.is_partner_content = true
       ) g ON true
       WHERE t.partner_slug IS NOT NULL
         AND COALESCE(t.business_model, '') <> 'self'
         AND t.partner_slug NOT IN ('medimap-self', 'wecircle-self')
       ORDER BY cnt DESC, t.id`,
      [productLang, contentLang]
    );
    return rows.map((r) => {
      const slug = String(r.partner_slug);
      return {
        category: DOMAIN_TO_OVERSEAS_CAT[String(r.domain_category ?? "").trim()] ?? "internal",
        partner_slug: slug,
        name: overseasPartnerName(slug, contentLang, String(r.name ?? slug)),
        guides: Number(r.cnt ?? 0),
        cover_image_url: (r.cover_image_url as string) ?? null,
      };
    });
  } catch {
    return [];
  }
}
