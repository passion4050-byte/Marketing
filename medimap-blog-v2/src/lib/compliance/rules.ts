/**
 * 의료법 / 의료광고 규제 — 룰 풀.
 *
 * 출처:
 *   - 의료법 제56조 (의료광고 금지)
 *   - 의료광고 사전심의 가이드라인 (대한의사협회·대한치과의사협회 등)
 *
 * 주의: 이 린터는 1차 필터이며 최종 책임은 발행자에게 있다.
 *      모호한 표현은 'warn'으로 분류해 사람이 검수하도록 설계.
 *
 * 룰 구조:
 *   - severity: 'fail' | 'warn'
 *   - kind: 위반 유형 (UX 노출용)
 *   - pattern: 정규식 (한국어 우선) — 매칭 1건 이상이면 hit
 *   - message: 사용자 표시 메시지
 *   - suggestion?: 대체 표현 제안
 */

export type ComplianceSeverity = 'fail' | 'warn';

export interface ComplianceRule {
  id: string;
  severity: ComplianceSeverity;
  kind:
    | 'exaggeration'        // 최상급/절대적 표현
    | 'guarantee'           // 치료 효과 보장
    | 'comparison'          // 다른 의료기관 비교
    | 'patient_solicitation' // 환자 유인 (할인/사은품)
    | 'unverified_review'   // 검증되지 않은 후기
    | 'pre_post_image'      // 시술 전후 사진 (광고 시 제한)
    | 'price_publicity'     // 가격 광고 제한
    | 'non_medical_term'    // 의학적 근거 없는 표현
    | 'fear_appeal';        // 공포 조장
  pattern: RegExp;
  message: string;
  suggestion?: string;
}

export const RULES: ComplianceRule[] = [
  // ===== fail (절대 금지) =====
  {
    id: 'EXAG_001',
    severity: 'fail',
    kind: 'exaggeration',
    pattern: /최고|최상의?|넘버\s*1|국내\s*1위|세계\s*1위|업계\s*1위|단\s*하나의?/g,
    message: '"최고/1위" 등 객관적 입증이 불가한 최상급 표현은 의료광고 금지',
    suggestion: '구체적인 수치(예: "3,200건 시술")로 대체'
  },
  {
    id: 'EXAG_002',
    severity: 'fail',
    kind: 'exaggeration',
    pattern: /완치|영구\s*보장|평생\s*보장|부작용\s*없[음습]|100\s*%\s*안전|반드시\s*낫/g,
    message: '"완치/100% 안전" 등 절대적 보장 표현은 금지',
    suggestion: '"개선될 수 있습니다", "임상 결과 ○○명 중 ○○건"으로 대체'
  },
  {
    id: 'GUAR_001',
    severity: 'fail',
    kind: 'guarantee',
    pattern: /효과\s*보장|결과\s*보장|환불\s*보장(?!\s*규정)/g,
    message: '치료 효과/결과 보장 표현 금지',
    suggestion: '"환자별 결과는 다를 수 있습니다" 단서 추가'
  },
  {
    id: 'COMP_001',
    severity: 'fail',
    kind: 'comparison',
    pattern: /[가-힣A-Za-z0-9]{2,}\s*(?:병원|의원|클리닉|성형외과|안과)\s*보다(?:\s*더?)?\s*(?:좋|뛰어|우수|저렴|싸|빠르|안전)/g,
    message: '다른 의료기관을 명시 비교하는 표현 금지 (의료법 제56조)',
    suggestion: '"본원은 ○○ 장비를 보유" 등 자기 사실만 진술'
  },
  {
    id: 'SOLI_001',
    severity: 'fail',
    kind: 'patient_solicitation',
    pattern: /사은품|상품권\s*증정|무료\s*제공|환자\s*소개\s*시\s*할인|리뷰\s*작성\s*시\s*할인|친구\s*소개|선착순\s*\d+\s*명/g,
    message: '환자 유인 행위(사은품·소개·리뷰 작성 보상)는 의료법 제27조 위반',
    suggestion: '제거 또는 "정기 검진 안내" 등 의료 서비스 정보로 대체'
  },
  {
    id: 'FEAR_001',
    severity: 'fail',
    kind: 'fear_appeal',
    pattern: /방치\s*하면\s*위험|이대로\s*가면\s*실명|지금\s*안\s*하면\s*늦|돌이킬\s*수\s*없[는습]/g,
    message: '공포 조장 표현은 의료광고 심의 위반',
    suggestion: '"조기 발견 시 ○○ 효과" 등 사실 기반 권유로 변경'
  },

  // ===== warn (검수 필요) =====
  {
    id: 'COMP_WARN_001',
    severity: 'warn',
    kind: 'comparison',
    pattern: /타\s*병원|다른\s*병원|일반\s*병원|기존\s*수술/g,
    message: '암묵적 비교 표현 — 맥락상 비교 광고로 해석될 수 있음',
    suggestion: '본원 시술의 사실 자체만 진술'
  },
  {
    id: 'PRICE_WARN_001',
    severity: 'warn',
    kind: 'price_publicity',
    pattern: /\d{1,3}만원\s*~|\d+\s*%\s*할인|특가|반값|반\s*가격/g,
    message: '가격 광고는 비급여 진료비용 항목/제목 명시 의무 충족 필요 (의료법 시행규칙)',
    suggestion: '시술명·옵션 범위·기간을 함께 표기'
  },
  {
    id: 'REVIEW_WARN_001',
    severity: 'warn',
    kind: 'unverified_review',
    pattern: /환자\s*후기|시술\s*후기|체험\s*후기|"\s*[가-힣]{2,}\s*님\s*"/g,
    message: '환자 후기 인용은 사전심의 대상 — 동의서·신원확인 필요',
    suggestion: '"평균 회복 기간 5~7일" 등 통계 기반 서술로 대체 가능'
  },
  {
    id: 'NONMED_WARN_001',
    severity: 'warn',
    kind: 'non_medical_term',
    pattern: /기적의?|마법의?|혁명적인?|꿈의?\s*시술|마지막\s*희망/g,
    message: '의학적 근거 없는 감성 표현 — 광고 심의 시 지적 사례 많음',
    suggestion: '시술명·작용 메커니즘 등 객관적 표현으로 변경'
  },
  {
    id: 'PRE_POST_WARN_001',
    severity: 'warn',
    kind: 'pre_post_image',
    pattern: /시술\s*전\s*후\s*사진|before.{0,5}after|비포\s*애프터/gi,
    message: '시술 전후 사진은 사전심의 + 환자 서면 동의 필요',
    suggestion: '의료법 제56조 및 의료광고 심의 가이드 확인'
  }
];

export const LINTER_VERSION = '2026.05-r1';
