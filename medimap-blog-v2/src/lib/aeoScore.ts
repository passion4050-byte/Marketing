/**
 * AEO 콘텐츠 점수 — 리서치 기반(Princeton GEO KDD2024, Ahrefs 17M citations, AEO 가이드).
 *
 * generated_contents.body(HTML/마크다운)를 채점해 "AI가 인용하기 좋은 정도"를 0~100으로 산출.
 * A/B 테스트(variant 비교) · 월간 리포트 · 발행 품질 게이트 공용.
 *
 * 9개 가중 항목(가중 합 100):
 *   direct_answer 12 · statistics 15 · quotes_cites 15 · structure 15 · tables 10
 *   · faq 10 · eeat 13 · freshness 5 · schema 5
 * 근거: 통계 +30~41%, 인용문 +37%, 출처인용 +30%, 표 +47%, 구조 28~40%, 최신성(AI트래픽 65% 1년내).
 */

export interface AeoItem {
  key: string;
  label: string;
  weight: number;
  score: number; // 0~100
  findings: string[];
}

export interface AeoReport {
  score: number; // 0~100 가중합
  grade: 'A' | 'B' | 'C' | 'D';
  items: AeoItem[];
}

export interface AeoInput {
  body: string; // HTML 또는 마크다운
  faqCount?: number; // FAQ Q&A 쌍 수 (raw_qa_pairs 길이 등)
  publishedAt?: string | null;
  hasFaqSchema?: boolean;
  hasMedicalSchema?: boolean;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
function count(re: RegExp, hay: string): number {
  const m = hay.match(re);
  return m ? m.length : 0;
}
function stripToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/[#*_>`~]/g, ' ') // 마크다운 기호
    .replace(/\s+/g, ' ')
    .trim();
}

export function scoreAeo(input: AeoInput): AeoReport {
  const html = input.body || '';
  const text = stripToText(html);
  const items: AeoItem[] = [];

  // 1) 직답 블록 — 첫 문단이 40~90단어(한국어 60~200자) 자기완결 답변인가
  {
    const firstPara =
      (html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '').replace(/<[^>]+>/g, ' ').trim() ||
      text.split(/(?<=[.!?。])\s/)[0] ||
      text.slice(0, 200);
    const len = firstPara.replace(/\s+/g, '').length;
    let s = 30;
    const f: string[] = [];
    if (len >= 40 && len <= 220) {
      s = 100;
      f.push(`도입 직답 블록 ${len}자 — LLM 발췌에 최적`);
    } else if (len > 0) {
      s = 55;
      f.push(len > 220 ? '도입 문단이 길어 발췌 어려움 — 40~200자 요약으로 시작' : '도입 직답 블록이 짧음');
    } else {
      f.push('도입에 자기완결 직답(핵심 요약 40~200자)을 배치하세요');
    }
    items.push({ key: 'direct_answer', label: '직답 블록', weight: 12, score: clamp(s), findings: f });
  }

  // 2) 통계·숫자 밀도 (Princeton 최고효율 +30~41%)
  {
    const stats = count(/\d+(?:[.,]\d+)?\s*(?:%|퍼센트|명|건|만원|원|배|위|년|개월|주|일|시간|분|mm|cc|㎜|회)/g, text);
    const bareNums = count(/(?<![\w.])\d{2,}(?![\w.])/g, text);
    const total = stats * 2 + bareNums; // 단위 붙은 통계에 가중
    let s: number;
    if (total >= 10) s = 100;
    else if (total >= 6) s = 80;
    else if (total >= 3) s = 55;
    else if (total >= 1) s = 30;
    else s = 8;
    const f = [`수치·통계 신호 ${stats}개(단위 포함)`];
    if (s < 60) f.push('구체 수치·통계(가격·비율·건수·기간)를 늘리면 AI 인용률이 +30~41% (Princeton)');
    items.push({ key: 'statistics', label: '통계·숫자', weight: 15, score: s, findings: f });
  }

  // 3) 인용문·출처 (인용문 +37% · 출처인용 +30%)
  {
    const quotes = count(/<blockquote/gi, html) + count(/[""][^""]{12,}[""]/g, text);
    const extLinks = count(/<a[^>]+href=["']https?:\/\//gi, html);
    const sourceMentions = count(/출처|참고|자료:|according to|source:/gi, text);
    let s = 10;
    const f: string[] = [];
    if (quotes >= 1) { s += 45; f.push(`인용문 ${quotes}개 감지`); }
    else f.push('전문가/환자 인용문(blockquote)을 넣으면 +37%');
    if (extLinks >= 1 || sourceMentions >= 1) { s += 45; f.push('출처/외부 인용 신호 감지'); }
    else f.push('권위 출처(학회·논문·공식기관) 인용을 추가하면 +30%');
    items.push({ key: 'quotes_cites', label: '인용문·출처', weight: 15, score: clamp(s), findings: f });
  }

  // 4) 구조·청킹 (헤딩+짧은 문단+목록 → 28~40% 인용↑)
  {
    const h2 = count(/<h[23][\s>]/gi, html) + count(/^#{2,3}\s/gim, html);
    const paras = Math.max(count(/<p[\s>]/gi, html), text.split(/\n{2,}/).length);
    const lists = count(/<li[\s>]/gi, html) + count(/^\s*[-*]\s/gim, html);
    const avgParaLen = paras > 0 ? text.replace(/\s+/g, '').length / paras : 9999;
    let s = 0;
    const f: string[] = [];
    if (h2 >= 3) { s += 40; f.push(`소제목 ${h2}개 — 청크 분할 양호`); }
    else if (h2 >= 1) s += 20;
    else f.push('내용을 소제목(H2/H3) 3개 이상으로 쪼개 인용 단위를 만드세요');
    if (lists >= 3) { s += 30; f.push('목록 구조 감지'); }
    else f.push('핵심을 불릿/번호 목록으로 정리하세요');
    if (avgParaLen <= 320) { s += 30; f.push('짧은 문단 — 발췌 정확도↑'); }
    else f.push('문단을 2~4문장으로 짧게 쪼개세요');
    items.push({ key: 'structure', label: '구조·청킹', weight: 15, score: clamp(s), findings: f });
  }

  // 5) 표 (비교/정보 표 +47%)
  {
    const tables = count(/<table[\s>]/gi, html) + count(/^\|.+\|/gim, html);
    let s: number;
    if (tables >= 2) s = 100;
    else if (tables >= 1) s = 80;
    else s = 20;
    const f = tables >= 1 ? [`표 ${tables}개 감지`] : ['비교·정보 표를 넣으면 인용율 +47%'];
    items.push({ key: 'tables', label: '표', weight: 10, score: s, findings: f });
  }

  // 6) FAQ (Q&A + FAQPage 스키마)
  {
    const faqN = input.faqCount ?? 0;
    const qHeadings = count(/(무엇|어떻게|언제|왜|얼마|가능한가요|인가요|하나요|되나요)\s*[?？]?/g, text);
    let s = 0;
    const f: string[] = [];
    if (faqN >= 3) { s += 55; f.push(`FAQ ${faqN}쌍`); }
    else if (faqN >= 1) s += 30;
    else f.push('자주 묻는 질문(Q&A) 3쌍 이상 — AI가 가장 잘 인용하는 형식');
    if (qHeadings >= 3) s += 25;
    if (input.hasFaqSchema) { s += 20; f.push('FAQPage 스키마'); }
    else f.push('FAQPage 스키마를 추가하세요');
    items.push({ key: 'faq', label: 'FAQ', weight: 10, score: clamp(s), findings: f });
  }

  // 7) E-E-A-T (의료 전문성·신뢰 — YMYL)
  {
    let s = 0;
    const f: string[] = [];
    if (/전문의|원장|의료진|진료과목|의사/.test(text)) { s += 30; f.push('의료진·전문의 정보'); }
    else f.push('원장·전문의 프로필(경력·전문분야)을 명시하세요');
    if (/감수|검토|reviewed by|medically reviewed|작성자|저자/i.test(text)) { s += 25; f.push('저자/감수 정보'); }
    else f.push('"의료진 감수 · 감수일" 저자 정보를 붙이세요(YMYL 필수)');
    if (/자격|면허|학회|논문|board|전문의\s*자격/i.test(text)) { s += 25; f.push('자격·학회·논문 권위 신호'); }
    else f.push('학회·논문·자격 등 검증 가능한 권위 신호를 추가하세요');
    if (/대한[가-힣]*학회|식약처|보건복지부|nih|cdc|mayo|pubmed/i.test(text)) { s += 20; f.push('권위 출처 인용'); }
    items.push({ key: 'eeat', label: 'E-E-A-T 의료', weight: 13, score: clamp(s), findings: f });
  }

  // 8) 최신성 (AI 트래픽 65%가 1년내)
  {
    let s = 40;
    const f: string[] = [];
    if (input.publishedAt) {
      const days = (Date.now() - new Date(input.publishedAt).getTime()) / 86400000;
      if (days <= 180) { s = 100; f.push('6개월 이내 — 최신성 우수'); }
      else if (days <= 365) { s = 70; f.push('1년 이내'); }
      else if (days <= 730) { s = 40; f.push('1~2년 — 갱신 권장'); }
      else { s = 15; f.push('2년 초과 — 재발행/갱신 필요'); }
    } else {
      f.push('발행/수정일 미상 — 날짜 노출 권장');
    }
    items.push({ key: 'freshness', label: '최신성', weight: 5, score: clamp(s), findings: f });
  }

  // 9) 스키마 (Article + FAQPage + Medical)
  {
    let s = 20;
    const f: string[] = [];
    if (input.hasFaqSchema) { s += 40; f.push('FAQPage 스키마'); }
    if (input.hasMedicalSchema) { s += 40; f.push('의료 스키마'); }
    if (s <= 20) f.push('Article + FAQPage + MedicalClinic 스키마를 추가하세요');
    items.push({ key: 'schema', label: '스키마', weight: 5, score: clamp(s), findings: f });
  }

  const totalW = items.reduce((a, it) => a + it.weight, 0);
  const overall = clamp(items.reduce((a, it) => a + it.score * it.weight, 0) / (totalW || 1));
  const grade: 'A' | 'B' | 'C' | 'D' =
    overall >= 80 ? 'A' : overall >= 65 ? 'B' : overall >= 50 ? 'C' : 'D';

  return { score: overall, grade, items };
}
