/**
 * 🔴 Round 169 (2026-08-20) — 본문 중간 CTA 주입 헬퍼 (국내·해외 공용).
 *
 * 배경: 해외 GuideArticle 에는 injectMidCta 가 이미 있었지만 **국내 파트너 글에는 없었다**.
 * 국내 파트너 상세는 dangerouslySetInnerHTML 로 본문을 직접 렌더하고 CTA 는 </article>
 * 뒤에만 있어, 모바일 실측 기준 첫 인라인 CTA 도달 지점이 문서의 **85%**(18.2 스크린 중
 * 15번째 화면)였다. "그래서 나는 얼마?"가 정점인 비용 표 근처에는 상담 진입점이 없었다.
 *
 * 이 파일로 승격해 국내/해외가 같은 규칙을 쓰게 한다.
 *   · h2 5개 이상일 때만 주입 (짧은 글은 말미 CTA 로 충분 — 과다 노출은 신뢰를 깎는다)
 *   · 3번째 h2 앞 = 도입·정의를 지나 '비용/방법'이 시작되는 지점
 */
export function injectMidCta(body: string, midHtml: string): string {
  const parts = body.split(/(?=<h2)/i);
  if (parts.length < 5) return body;
  return parts.slice(0, 3).join("") + midHtml + parts.slice(3).join("");
}

/**
 * 국내 파트너 글 미드 CTA 마크업.
 * 모바일 우선: 최소 52px 높이 버튼, 한 줄에 이익(무료·응답시간)을 명시.
 * 색·타이포는 본문 리듬을 끊되 광고처럼 보이지 않게 — 카드 테두리 + 검정 버튼.
 */
export function buildKoMidCta(opts: {
  href: string;
  clinicName?: string | null;
}): string {
  const who = opts.clinicName ? `${opts.clinicName} ` : "";
  return `
<aside class="not-prose my-10 border border-stone-300 bg-white px-5 py-6 sm:px-7 sm:py-7">
  <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">CONSULTATION</p>
  <p class="mt-3 text-[19px] font-black leading-snug tracking-tight text-stone-950 sm:text-[21px]" style="word-break:keep-all">
    내 눈 상태에선 비용이 얼마일까요?
  </p>
  <p class="mt-2.5 text-[14px] leading-relaxed text-stone-600" style="word-break:keep-all">
    검사 결과와 시술 방식에 따라 금액이 달라집니다. ${who}상담으로 예상 비용과 회복 기간을
    확인해 보세요.
  </p>
  <a href="${opts.href}" target="_blank" rel="noopener noreferrer"
     class="mt-5 flex min-h-[54px] w-full items-center justify-center gap-2 bg-stone-950 px-5 text-[15px] font-bold text-white transition active:bg-stone-800">
    카카오톡으로 비용 문의
  </a>
  <p class="mt-3 text-center text-[12px] text-stone-500">
    무료 상담 · 24시간 내 답변 · 예약 의무 없음
  </p>
</aside>`.trim();
}
