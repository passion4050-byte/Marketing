/**
 * Round 165 (2026-08-18) — 발행 콘텐츠 공개 URL 빌더 (다국어 인지).
 *
 * 배경: Round 164 에서 전 파트너 4개 언어(en/ja/zh-Hans/zh-Hant) 자동발행이 켜졌는데,
 * 클라이언트 포털(홈·발행 콘텐츠)의 "글 보기" 링크가 국내 경로(/with-partners·/blog)만
 * 알고 있어 해외 글은 404 로 이어졌음. v1(wecircle.co.kr) 라우팅 정본:
 *   국내 파트너   → /with-partners/{partner_category}/{partner_slug}/{slug}
 *   국내 자사     → /blog/{slug}
 *   해외 파트너   → /{langPath}/clinics/{partner_category}/{partner_slug}/{slug}
 *   해외 비파트너 → /{langPath}/guides/{slug}
 *   langPath: en→en · ja→ja · zh-Hans→zh · zh-Hant→tw (guides.ts 매핑과 동일)
 */

export const BLOG_BASE = 'https://wecircle.co.kr';

const LANG_PATH: Record<string, string> = {
  en: 'en',
  ja: 'ja',
  'zh-Hans': 'zh',
  'zh-Hant': 'tw',
};

/** 포털 배지용 언어 라벨. */
export const LANG_LABEL: Record<string, string> = {
  ko: '한국어',
  en: 'EN',
  ja: '日本語',
  'zh-Hans': '简体',
  'zh-Hant': '繁體',
};

export interface ContentUrlInput {
  slug: string | null;
  is_partner_content: boolean | null;
  partner_category: string | null;
  lang?: string | null;
  market?: string | null;
}

export function publicContentUrl(c: ContentUrlInput, partnerSlug: string | null): string | null {
  if (!c.slug) return null;
  const lang = (c.lang ?? 'ko').trim() || 'ko';
  const overseas = (c.market ?? '') === 'overseas' || (lang !== 'ko' && lang in LANG_PATH);
  if (overseas) {
    const lp = LANG_PATH[lang];
    if (!lp) return null; // 알 수 없는 언어 — 링크를 깨뜨리느니 숨김
    if (c.is_partner_content && c.partner_category && partnerSlug) {
      return `${BLOG_BASE}/${lp}/clinics/${c.partner_category}/${partnerSlug}/${c.slug}`;
    }
    return `${BLOG_BASE}/${lp}/guides/${c.slug}`;
  }
  if (c.is_partner_content && c.partner_category && partnerSlug) {
    return `${BLOG_BASE}/with-partners/${c.partner_category}/${partnerSlug}/${c.slug}`;
  }
  return `${BLOG_BASE}/blog/${c.slug}`;
}
