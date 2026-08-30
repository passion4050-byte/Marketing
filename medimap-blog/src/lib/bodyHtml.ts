/**
 * 본문 HTML 정규화 — 페이지 레이아웃이 이미 <h1> 을 렌더하므로 본문 안의 h1 은 중복이다.
 *
 * 🔴 Round 181 (2026-08-30) — 네이버 서치어드바이저 「<H1> 요소가 2개 이상 발견」 23개 페이지.
 *   네이버 웹마스터 가이드: "H1 요소는 페이지 콘텐츠를 나타내는 소제목으로 사용되기에,
 *   HTML 문서에서 2개 이상 발견된다면 네이버 검색로봇이 이해하기 어려운 구조가 됩니다."
 *
 *   기존 `stripFirstH1IfMatchesTitle` 은 본문 h1 이 **제목과 정확히 일치할 때만** 지웠다.
 *   그런데 저장된 title 에는 ` | 병원명` 같은 접미사가 붙거나 운영자가 손을 대서
 *   본문 h1 과 달라지는 경우가 많고, 그럴 때마다 h1 이 2개로 남았다.
 *   해외 라우트(GuideArticle)에는 그 처리 자체가 아예 없었다.
 *
 *   정책: 본문 h1 은 **지우지 않고 h2 로 강등**한다. 지우면 문단 맥락이 사라지고,
 *   h2 로 내리면 문서 구조(h1 1개 → h2 다수)가 오히려 정상이 된다.
 *   단, 페이지 제목과 완전히 같은 h1 은 순수 중복이므로 삭제한다.
 */

const norm = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

export function normalizeBodyHeadings(body: string, pageTitle?: string): string {
  if (!body) return body;
  return body.replace(
    /<h1([^>]*)>([\s\S]*?)<\/h1>\s*/gi,
    (match, attrs: string, inner: string) => {
      // 페이지 제목과 동일한 h1 = 순수 중복 → 제거
      if (pageTitle && norm(inner) === norm(pageTitle)) return "";
      // 그 외에는 h2 로 강등 (속성 보존)
      return `<h2${attrs}>${inner}</h2>\n`;
    }
  );
}

/**
 * meta description 폴백 — 본문에서 첫 문단을 뽑는다.
 *
 * 🔴 Round 181 — 네이버 「<meta name="description"> 설명 누락」 진단.
 *   네이버가 찾은 9건은 빙산의 일각이었다. 실측:
 *     해외(overseas)  59 / 59  = 100% 누락
 *     국내(domestic) 142 / 213 = 67% (단 partners.ts / posts.ts 에는 이미 폴백이 있어
 *                                     실제 렌더 시점엔 채워진다 — 그래서 진단에 안 잡혔다)
 *   해외 계층(guides.ts)에만 폴백이 없어서 /en/ · /zh/ 페이지가 전부 description 없이 나갔다.
 *   description 은 네이버·구글 검색결과의 스니펫 원본이다 — 없으면 검색로봇이
 *   본문에서 임의로 긁어가고, CTR 을 우리가 통제할 수 없게 된다.
 */
export function deriveExcerpt(body: string | null | undefined, max = 160): string | null {
  if (!body) return null;
  const text = body
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  if (text.length <= max) return text;
  // 문장 경계에서 자른다 — 중간에 끊기면 스니펫이 어색해진다.
  const cut = text.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "), cut.lastIndexOf("。"), cut.lastIndexOf("다. "));
  return (lastStop > max * 0.5 ? cut.slice(0, lastStop + 1) : cut.trimEnd() + "…").trim();
}
