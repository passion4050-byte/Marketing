import type { Metadata } from "next";

// Round 159b (2026-08-16) — tw(대만·번체) 추가. URL 프리픽스 /tw, hreflang zh-Hant.
type OverseasLang = "en" | "ja" | "zh" | "tw";

/**
 * 해외(en/ja/zh/tw) 페이지 canonical + hreflang 대체 헬퍼.
 *   subpath = 언어 프리픽스 없는 경로 (예: "/clinics/derma/dear"). "" = 각 언어 홈.
 *   canonical = 현재 언어의 자기 URL, languages = en/ja/zh-Hans/zh-Hant 대체(다국어 순위 신호).
 * 모든 해외 라우트가 이 한 함수를 써 canonical/hreflang을 일관되게 갖게 한다.
 *
 * 🔴 Round 199 (2026-09-11) — 두 가지를 고쳤다.
 *  1) `x-default` 가 없었다. 4개 로케일이 서로를 가리키기만 하고 "그 외 언어는 여기"
 *     라는 종점이 없으면 Google 은 클러스터의 기본형을 스스로 고른다. /en 으로 고정한다.
 *  2) `ko` 가 페이지 단에서 사라졌다. 레이아웃(en/ja/zh/tw layout.tsx)에는 ko 가 있었지만
 *     **페이지가 자기 alternates 를 선언하는 순간 레이아웃 것이 통째로 대체**되므로
 *     (Next 는 alternates 를 병합하지 않는다) 실제 서빙되는 해외 페이지 대부분에
 *     ko 링크가 없었다. 여기로 일원화한다.
 *
 *  ⚠ hreflang 은 **상호 참조(reciprocal)** 여야 유효하다. ko 경로가 1:1 로 대응하지
 *     않는 곳이 있으므로(/clinics ↔ /with-partners, 해외 guides 는 슬러그가 다름)
 *     `koPath` 를 **명시한 경우에만** ko 를 넣는다. 아무 데나 ko:"/" 를 달면 국내 홈이
 *     되받아주지 않아 짝이 깨지고, Google 은 그 클러스터를 통째로 무시한다.
 */
export function overseasAlternates(
  lang: OverseasLang,
  subpath: string,
  koPath?: string,
): NonNullable<Metadata["alternates"]> {
  const sp = subpath === "/" ? "" : subpath;
  return {
    canonical: `/${lang}${sp}`,
    languages: {
      en: `/en${sp}`,
      ja: `/ja${sp}`,
      "zh-Hans": `/zh${sp}`,
      "zh-Hant": `/tw${sp}`,
      ...(koPath ? { ko: koPath } : {}),
      "x-default": `/en${sp}`,
    },
  };
}

/**
 * 국내(ko) 페이지가 해외 4개 로케일을 **되받아** 선언하는 짝. Round 199 신설.
 *
 * hreflang 은 한쪽만 선언하면 무효다. 해외 about/contact 는 예전부터 `ko: "/about"` 을
 * 달고 있었지만 국내 /about 은 아무것도 선언하지 않아 **짝이 성립한 적이 없었다.**
 * 국내·해외가 1:1 로 대응하는 경로("", "/about", "/contact", "/blog")에만 쓴다.
 */
export function koAlternates(
  subpath: string,
  extra?: NonNullable<Metadata["alternates"]>["types"],
): NonNullable<Metadata["alternates"]> {
  const sp = subpath === "/" ? "" : subpath;
  return {
    canonical: sp || "/",
    languages: {
      ko: sp || "/",
      en: `/en${sp}`,
      ja: `/ja${sp}`,
      "zh-Hans": `/zh${sp}`,
      "zh-Hant": `/tw${sp}`,
      "x-default": `/en${sp}`,
    },
    ...(extra ? { types: extra } : {}),
  };
}
