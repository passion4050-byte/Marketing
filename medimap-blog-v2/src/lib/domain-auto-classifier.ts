/**
 * Round 40 B3 (2026-05-31) — 도메인 자동 분류 규칙 엔진.
 *
 * 신규 도메인 발견 시 hostname 패턴만 보고 tier 추정.
 * LLM 호출 X (사용자 결정 — rule-based 만, 보수적).
 * 운영자가 1클릭 확정 가능하도록 auto_suggested=true 로 INSERT.
 *
 * 매칭 규칙 우선순위:
 *   1. 명시적 NOISE 패턴 (wiki, search, naver, google, youtube, tistory)
 *   2. T3 학회/공식 (.or.kr / .go.kr / .ac.kr / 알려진 학회 도메인)
 *   3. T3 의료 매체 (news. / docdocdoc / hidoc / dailymedi 등 한국 의료 매체)
 *   4. T4 플랫폼 (modoodoc, gangnamunni, babitalk, ddmdandy 등)
 *   5. T5 의료 카테고리 (clinic, hospital, 의원, eye, skin, derma, plastic, dental, medical, health)
 *   6. 그 외 → null (분류 안 함)
 */

export type AutoClassification = {
  tier: 'T1' | 'T3' | 'T4' | 'NOISE' | 'T5';
  category: string;
  confidence: number; // 0~1
  reason: string;
};

const NOISE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /^(www\.)?wiki|wikipedia/i, reason: '위키 백과 — 출처 신뢰도 낮음' },
  { pattern: /^(www\.)?google\.com|search\.google/i, reason: '구글 검색 결과 페이지' },
  { pattern: /^(www\.)?youtube\.com|youtu\.be/i, reason: 'YouTube 동영상' },
  { pattern: /\.tistory\.com$|^tistory\.com$/i, reason: 'Tistory 개인 블로그' },
  { pattern: /\.blog\.naver\.com$|^search\.naver/i, reason: '네이버 블로그/검색' },
  { pattern: /\.blogspot\./i, reason: 'Blogspot 블로그' },
  { pattern: /\.medium\.com$/i, reason: 'Medium 블로그' },
];

const T3_AUTHORITY_PATTERNS: Array<{ pattern: RegExp; category: string; reason: string }> = [
  { pattern: /\.or\.kr$/i, category: '학회', reason: '한국 비영리/학회 도메인' },
  { pattern: /\.go\.kr$/i, category: '정부', reason: '한국 정부/공공기관' },
  { pattern: /\.ac\.kr$/i, category: '대학', reason: '한국 대학/학술기관' },
  { pattern: /msdmanuals|merckmanuals/i, category: '의학사전', reason: 'MSD/Merck 매뉴얼' },
  { pattern: /amc\.seoul|samsunghospital|snuh|snubh|iseverance|samc\./i, category: '종합병원', reason: '국내 빅5 종합병원' },
  { pattern: /apollohospitals|mayoclinic|nih\.gov|webmd/i, category: '글로벌의료', reason: '글로벌 의료 기관' },
];

const T3_MEDIA_PATTERNS: Array<{ pattern: RegExp; category: string; reason: string }> = [
  { pattern: /^news\.|hidoc|docdocdoc|dailymedi|k-health|kmedinfo|medicaltimes/i, category: '의료매체', reason: '한국 의료 전문 매체' },
  { pattern: /zeiss|topcon|siemens.*med|gehealthcare/i, category: '의료장비', reason: '의료 장비 제조사' },
];

const T4_PLATFORM_PATTERNS: Array<{ pattern: RegExp; category: string; reason: string }> = [
  { pattern: /modoodoc/i, category: '플랫폼', reason: '모두닥 의료 플랫폼' },
  { pattern: /gangnamunni|gangnam-unni/i, category: '플랫폼', reason: '강남언니' },
  { pattern: /babitalk/i, category: '플랫폼', reason: '바비톡' },
  { pattern: /ddmdandy/i, category: '플랫폼', reason: '댄디' },
  { pattern: /strawberry-ent/i, category: '플랫폼', reason: '스트로베리' },
];

const T5_MEDICAL_PATTERNS: Array<{ pattern: RegExp; category: string; reason: string }> = [
  { pattern: /eye|아이|안과/i, category: '안과', reason: '안과 클리닉 hostname 패턴' },
  { pattern: /skin|derma|피부/i, category: '피부과', reason: '피부과 hostname 패턴' },
  { pattern: /plastic|아름|성형/i, category: '성형외과', reason: '성형외과 hostname 패턴' },
  { pattern: /dental|치과/i, category: '치과', reason: '치과 hostname 패턴' },
  { pattern: /hair|모발|두피/i, category: '모발이식', reason: '모발이식 hostname 패턴' },
  { pattern: /clinic|hospital|의원|병원/i, category: '의료기관', reason: '일반 의료기관 hostname' },
];

/**
 * 도메인 hostname 만 보고 tier/category 추정.
 * 매칭 안 되면 null (default T5 default 라 명시 분류 불필요).
 */
export function autoClassifyDomain(domain: string): AutoClassification | null {
  const d = domain.toLowerCase().trim();
  if (!d) return null;

  // 1. NOISE
  for (const { pattern, reason } of NOISE_PATTERNS) {
    if (pattern.test(d)) {
      return { tier: 'NOISE', category: 'noise', confidence: 0.85, reason };
    }
  }

  // 2. T3 학회/공식
  for (const { pattern, category, reason } of T3_AUTHORITY_PATTERNS) {
    if (pattern.test(d)) {
      return { tier: 'T3', category, confidence: 0.85, reason };
    }
  }

  // 3. T3 매체/장비
  for (const { pattern, category, reason } of T3_MEDIA_PATTERNS) {
    if (pattern.test(d)) {
      return { tier: 'T3', category, confidence: 0.75, reason };
    }
  }

  // 4. T4 플랫폼
  for (const { pattern, category, reason } of T4_PLATFORM_PATTERNS) {
    if (pattern.test(d)) {
      return { tier: 'T4', category, confidence: 0.9, reason };
    }
  }

  // 5. T5 의료 카테고리 — confidence 낮음 (의료 키워드 hostname 이지만 분류 불필요)
  for (const { pattern, category, reason } of T5_MEDICAL_PATTERNS) {
    if (pattern.test(d)) {
      // T5 는 default 라 명시 분류 안 함. category 만 반환 (운영자가 컨텍스트 참고).
      return { tier: 'T5', category, confidence: 0.5, reason };
    }
  }

  return null;
}

/**
 * 여러 도메인 일괄 분류.
 * 매칭 안 된 도메인 (T5 default) 은 결과에서 제외 (DB 등록 불필요).
 */
export function bulkAutoClassify(domains: string[]): Array<{ domain: string; classification: AutoClassification }> {
  const result: Array<{ domain: string; classification: AutoClassification }> = [];
  for (const d of domains) {
    const c = autoClassifyDomain(d);
    if (c && c.tier !== 'T5') {
      // T5 는 default 라 DB 명시 등록 불필요
      result.push({ domain: d, classification: c });
    }
  }
  return result;
}
