/**
 * Round 34 phase 4 (2026-05-30) — 의료 시술/서비스 키워드 사전.
 *
 * 클라이언트 홈페이지 자동 분석 시 — 추출된 텍스트에서 매칭되는 키워드 추출용.
 * 카테고리별 그룹화 — 사용자가 어드민에서 영역별로 확인 가능.
 *
 * Curation 원칙:
 *   - generic 키워드 우선 (지역 한정 X — 그건 own 키워드)
 *   - AI 검색에서 흔히 비교되는 시술 명칭
 *   - 단일어 또는 짧은 합성어
 */

export const MEDICAL_KEYWORDS_BY_CATEGORY: Record<string, string[]> = {
  안과: [
    '라식', '라섹', '스마일라식', '스마일프로', '엑스트라', '백내장',
    '노안교정', '시력교정', '드림렌즈', '안구건조증', '망막', '녹내장',
    '다초점렌즈', '안내렌즈',
  ],
  피부과: [
    '여드름', '여드름흉터', '색소침착', '레이저토닝', '피코토닝',
    '필러', '보톡스', '리쥬란', '슈링크', '울쎄라', '인모드',
    '주름', '미백', '리프팅', '제모', '스킨부스터',
  ],
  성형외과: [
    '쌍꺼풀', '코성형', '안면윤곽', '가슴성형', '지방흡입',
    '양악수술', '눈매교정', '광대축소', '사각턱', '안면거상',
  ],
  치과: [
    '임플란트', '교정', '치아미백', '신경치료', '치주', '사랑니',
    '라미네이트', '레진', '인비절라인', '디지털교정',
  ],
  모발이식: [
    '모발이식', '비절개', '절개식', 'FUE', 'FUT',
    '헤어라인', '구레나룻', 'M자교정', '정수리이식', '여성모발이식',
  ],
  내과: [
    '건강검진', '내시경', '위내시경', '대장내시경', '당뇨', '고혈압',
    '갑상선', '간질환',
  ],
  한방: [
    '한약', '다이어트한약', '추나요법', '침구치료', '체질', '보약',
  ],
};

/**
 * tenant.domain_category 에 따라 적합한 키워드 list 반환.
 * 매칭 안 되면 모든 카테고리 합쳐서 반환.
 */
export function getKeywordCandidates(domainCategory: string | null): string[] {
  if (!domainCategory) return Object.values(MEDICAL_KEYWORDS_BY_CATEGORY).flat();
  const c = domainCategory.trim();
  return MEDICAL_KEYWORDS_BY_CATEGORY[c] ?? Object.values(MEDICAL_KEYWORDS_BY_CATEGORY).flat();
}

/**
 * 텍스트에서 키워드 매칭 — 빈도순 정렬, 중복 제거.
 */
export function extractMatchedKeywords(
  text: string,
  candidates: string[],
  maxCount = 8
): Array<{ keyword: string; count: number }> {
  const normalized = text.toLowerCase();
  const matches = new Map<string, number>();
  for (const kw of candidates) {
    const kwLower = kw.toLowerCase();
    if (kwLower.length < 2) continue;
    // 단순 substring count — regex 회피 (한국어는 word boundary 모호)
    let count = 0;
    let idx = 0;
    while ((idx = normalized.indexOf(kwLower, idx)) !== -1) {
      count++;
      idx += kwLower.length;
    }
    if (count > 0) {
      matches.set(kw, count);
    }
  }
  return Array.from(matches.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxCount);
}
