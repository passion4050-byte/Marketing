import type { Metadata } from "next";

// Round 159b (2026-08-16) — tw(대만·번체) 추가. URL 프리픽스 /tw, hreflang zh-Hant.
type OverseasLang = "en" | "ja" | "zh" | "tw";

/**
 * 해외(en/ja/zh/tw) 페이지 canonical + hreflang 대체 헬퍼.
 *   subpath = 언어 프리픽스 없는 경로 (예: "/clinics/derma/dear"). "" = 각 언어 홈.
 *   canonical = 현재 언어의 자기 URL, languages = en/ja/zh-Hans/zh-Hant 대체(다국어 순위 신호).
 * 모든 해외 라우트가 이 한 함수를 써 canonical/hreflang을 일관되게 갖게 한다.
 */
export function overseasAlternates(
  lang: OverseasLang,
  subpath: string,
): NonNullable<Metadata["alternates"]> {
  const sp = subpath === "/" ? "" : subpath;
  return {
    canonical: `/${lang}${sp}`,
    languages: {
      en: `/en${sp}`,
      ja: `/ja${sp}`,
      "zh-Hans": `/zh${sp}`,
      "zh-Hant": `/tw${sp}`,
    },
  };
}
