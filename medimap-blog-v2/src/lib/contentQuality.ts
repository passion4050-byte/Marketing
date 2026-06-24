/**
 * Round 81 — 콘텐츠 구조 품질 자동 채점 (AEO/SEO 관점).
 *
 * 매 생성글의 body(HTML)에서 구조 신호를 추출해 0~100 점 + A/B/C/D 등급.
 * blog_html 채널만 채점(나머지는 null → 뱃지 미표시).
 * server(API) 에서 계산해 content-queue item 에 실어 보냄.
 */

export type QualityBreakdown = {
  h2: number;
  questionH2: number;
  tables: number;
  lists: number;
  images: number;
  chars: number;
};

export type ContentQuality = {
  score: number; // 0~100
  grade: 'A' | 'B' | 'C' | 'D';
  breakdown: QualityBreakdown;
  /** 부족 항목(개선 힌트) */
  missing: string[];
};

const Q_ENDINGS = /(나요|까요|가요|인가요|있나요|되나요|무엇|어떻게|왜|언제|어디|얼마|몇)/;

export function scoreContent(
  body: string | null | undefined,
  channel: string,
): ContentQuality | null {
  if (!body || channel !== 'blog_html') return null;

  const h2Texts = Array.from(body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)).map((m) =>
    (m[1] || '').replace(/<[^>]+>/g, '').trim(),
  );
  const h2 = h2Texts.length;
  const questionH2 = h2Texts.filter((t) => /[?？]/.test(t) || Q_ENDINGS.test(t)).length;
  const tables = (body.match(/<table[\s>]/gi) || []).length;
  const lists = (body.match(/<(ul|ol)[\s>]/gi) || []).length;
  const images = (body.match(/<(figure|img)[\s>]/gi) || []).length;
  const chars = body
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;

  let score = 0;
  const missing: string[] = [];

  if (h2 >= 3) score += 15;
  else if (h2 >= 1) score += 8;
  else missing.push('H2 섹션');

  if (questionH2 >= 1) score += 20;
  else missing.push('질문형 H2(AEO)');

  if (tables >= 1) score += 20;
  else missing.push('비교/요약 표');

  if (lists >= 1) score += 15;
  else missing.push('체크리스트/목록');

  if (images >= 1) score += 15;
  else missing.push('이미지');

  if (chars >= 1200) score += 15;
  else if (chars >= 600) score += 8;
  else missing.push('충분한 본문(1200자+)');

  const grade: ContentQuality['grade'] =
    score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';

  return { score, grade, breakdown: { h2, questionH2, tables, lists, images, chars }, missing };
}
