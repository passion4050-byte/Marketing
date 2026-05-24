/**
 * Figma 시안(node 804:353)에 노출된 데이터 그대로 시드로 사용.
 * 실제 운영에선 Supabase RLS 정책 + per-tenant 쿼리로 대체.
 */

import type {
  BlogPostVariant,
  ContentTopic,
  EngineMetricRow,
  EnginePerformance,
  FaqItem,
  FeedingCategory,
  FeedingField,
  KeywordOptimization,
  KpiSlot,
  LiveFeedItem,
  MentionTrendPoint,
  Publication,
  SchemaEntity,
  SentimentByEngine,
  SimulatorThread,
  SimulatorTurn,
  Tenant,
  TopicRow,
  VideoScript
} from './types';

export const currentTenant: Tenant = {
  id: 'bgn-jamsil',
  name: 'BGN 밝은눈안과',
  region: '잠실',
  specialty: '안과',
  tagline: 'AI 가시성 관리',
  cycleLabel: '2026.04'
};

// ===== 통합 대시보드 — KPI =====
export const visibilityKpis: KpiSlot[] = [
  {
    id: 'visibility-score',
    label: 'AI 가시성 점수',
    value: '87/100',
    deltaText: '+9점 상승',
    deltaDirection: 'up'
  },
  {
    id: 'competitor-share',
    label: '경쟁사 멘션 점유율',
    value: '42.5%',
    deltaText: '잠실권 1위',
    deltaDirection: 'up'
  },
  {
    id: 'trending-keyword',
    label: '최고 트렌딩 키워드',
    value: 'BGN 잠실',
    deltaText: '멘션 +18%',
    deltaDirection: 'up'
  },
  {
    id: 'data-health',
    label: '데이터 건강도',
    value: '72/100',
    deltaText: '누락 18건',
    deltaDirection: 'down'
  }
];

export const mentionKpis: KpiSlot[] = [
  {
    id: 'mention-total',
    label: '총 멘션 수',
    value: '439',
    deltaText: '최근 7일 +35개',
    deltaDirection: 'up'
  },
  {
    id: 'positive-ratio',
    label: '긍정 비율',
    value: '80.2%',
    deltaText: '+4.8%p',
    deltaDirection: 'up'
  },
  {
    id: 'weekly-delta',
    label: '주간 증가율',
    value: '+35개',
    deltaText: '전주 대비',
    deltaDirection: 'up'
  },
  {
    id: 'negative-mentions',
    label: '부정 멘션',
    value: '24',
    deltaText: '검토 필요 6건',
    deltaDirection: 'down'
  }
];

// ===== AI 플랫폼 성능 비교 =====
export const enginePerformance: EnginePerformance[] = [
  { engine: 'chatgpt', label: '최고 노출', score: 87 },
  { engine: 'gemini', label: '보강 필요', score: 79 },
  { engine: 'perplexity', label: '출처 강점', score: 85 }
];

export const engineMetrics: EngineMetricRow[] = [
  { engine: 'chatgpt', accuracy: 92, mention: 88, positive: 84, relevance: 90, coverage: 82 },
  { engine: 'gemini', accuracy: 86, mention: 74, positive: 79, relevance: 81, coverage: 76 },
  { engine: 'perplexity', accuracy: 89, mention: 81, positive: 82, relevance: 84, coverage: 88 }
];

// ===== 플랫폼별 멘션 감성 =====
export const sentimentByEngine: SentimentByEngine[] = [
  { engine: 'chatgpt', positive: 82, neutral: 13, negative: 5 },
  { engine: 'gemini', positive: 76, neutral: 18, negative: 6 },
  { engine: 'perplexity', positive: 79, neutral: 16, negative: 5 },
  { engine: 'claude', positive: 72, neutral: 20, negative: 8 }
];

// ===== 키워드 최적화 현황 =====
export const keywordOptimization: KeywordOptimization[] = [
  {
    keyword: 'BGN밝은눈안과 잠실',
    searchVolume: 1800,
    aiMentions: 64,
    rank: 1,
    delta: 22,
    status: 'optimized'
  },
  {
    keyword: '잠실 라섹 전문의',
    searchVolume: 2400,
    aiMentions: 41,
    rank: 3,
    delta: 14,
    status: 'normal'
  },
  {
    keyword: '송파안과 백내장',
    searchVolume: 3100,
    aiMentions: 29,
    rank: 5,
    delta: -4,
    status: 'needs_update'
  },
  {
    keyword: '스마일라섹 후기',
    searchVolume: 2900,
    aiMentions: 36,
    rank: 4,
    delta: 8,
    status: 'review'
  },
  {
    keyword: '노안백내장 수술비용',
    searchVolume: 2100,
    aiMentions: 18,
    rank: 8,
    delta: 2,
    status: 'missing'
  }
];

// ===== 주간 멘션 트렌드 =====
export const mentionTrend: MentionTrendPoint[] = [
  { weekday: '월', count: 54 },
  { weekday: '화', count: 61 },
  { weekday: '수', count: 58 },
  { weekday: '목', count: 69 },
  { weekday: '금', count: 72 },
  { weekday: '토', count: 63 },
  { weekday: '일', count: 62 }
];

// ===== 실시간 AI 응답 피드 =====
export const liveFeed: LiveFeedItem[] = [
  {
    id: 'feed-1',
    engine: 'chatgpt',
    query: '잠실에서 스마일라섹 잘하는 안과 추천해줘',
    summary: 'BGN 밝은눈안과를 장비 보유와 검사 체계가 명확한 후보로 언급',
    sentiment: 'positive',
    capturedAt: '2026-05-24T10:42:00+09:00'
  },
  {
    id: 'feed-2',
    engine: 'perplexity',
    query: '송파안과 백내장 수술 비교',
    summary: '백내장 전문의 정보는 부족하나 접근성과 후기 데이터를 인용',
    sentiment: 'neutral',
    capturedAt: '2026-05-24T10:28:00+09:00'
  },
  {
    id: 'feed-3',
    engine: 'gemini',
    query: '라섹 라섹 가격 확인 가능한 병원',
    summary: '가격 이벤트 정보가 최신인지 병원 홈페이지 확인을 권장',
    sentiment: 'neutral',
    capturedAt: '2026-05-24T10:11:00+09:00'
  },
  {
    id: 'feed-4',
    engine: 'chatgpt',
    query: '20대 직장인 라섹 회복 빠른 곳',
    summary: '검사 프로세스와 사후관리 설명이 구체적인 병원으로 추천',
    sentiment: 'positive',
    capturedAt: '2026-05-24T09:54:00+09:00'
  }
];

// ===== 전체 감성 분포 =====
export const overallSentiment = {
  positive: 80.2,
  neutral: 14.3,
  negative: 5.5
};

// ===== 자주 언급된 주제 =====
export const topicRows: TopicRow[] = [
  { topic: '라섹·라식 비교 추천', mentions: 96, sentiment: 'positive', note: '장비·검사 프로세스 언급' },
  { topic: '스마일라섹 후기 문의', mentions: 78, sentiment: 'positive', note: '후기 출처 보강 필요' },
  { topic: '백내장 수술 명의', mentions: 54, sentiment: 'neutral', note: '전문의 상세 약력 부족' },
  { topic: '안과 종합검진 가격 문의', mentions: 43, sentiment: 'warning', note: '가격 업데이트 필요' },
  { topic: '드림렌즈 전문', mentions: 31, sentiment: 'neutral', note: '타겟 페이지 연결 필요' }
];

// ===== Data Feeding 카테고리 (9개) =====
export const feedingCategories: FeedingCategory[] = [
  {
    id: 'doctor',
    icon: 'Stethoscope',
    title: '의사 자격 정보',
    summary: '의료진 전문성, 경력, 인증 정보를 AI 추천 근거로 사용합니다.',
    totalFields: 4,
    filledFields: 0,
    status: 'pending',
    group: 'expertise'
  },
  {
    id: 'equipment',
    icon: 'Microscope',
    title: '의료 장비',
    summary: '장비명, 제조사, 적용 시술을 구조화해 답변 구체성을 높입니다.',
    totalFields: 5,
    filledFields: 2,
    status: 'in_progress',
    group: 'expertise'
  },
  {
    id: 'offer',
    icon: 'BadgePercent',
    title: '이벤트 가격',
    summary: '가격과 기간 정보를 검수 가능한 형태로 관리합니다.',
    totalFields: 4,
    filledFields: 1,
    status: 'in_progress',
    group: 'operation'
  },
  {
    id: 'hours',
    icon: 'Clock3',
    title: '진료시간·예약',
    summary: '진료 가능 시간과 예약 경로를 AI 답변에 정확히 노출합니다.',
    totalFields: 4,
    filledFields: 4,
    status: 'completed',
    group: 'operation'
  },
  {
    id: 'location',
    icon: 'MapPin',
    title: '위치·교통',
    summary: '주소, 주차, 대중교통 정보를 지역 추천 답변에 반영합니다.',
    totalFields: 4,
    filledFields: 3,
    status: 'in_progress',
    group: 'operation'
  },
  {
    id: 'procedure',
    icon: 'Syringe',
    title: '시술·수술 정보',
    summary: '시술 설명, 추천 대상, 사후관리를 문답형 답변으로 노출합니다.',
    totalFields: 5,
    filledFields: 1,
    status: 'in_progress',
    group: 'expertise'
  },
  {
    id: 'brand',
    icon: 'Megaphone',
    title: '브랜드 보이스',
    summary: '응답 톤, 미션, 금지 표현을 FAQ와 시뮬레이터에 일관 적용합니다.',
    totalFields: 4,
    filledFields: 0,
    status: 'pending',
    group: 'content'
  },
  {
    id: 'faq',
    icon: 'MessageCircleQuestion',
    title: 'FAQ',
    summary: '자주 묻는 질문을 Schema.org FAQ로 변환할 풀을 관리합니다.',
    totalFields: 4,
    filledFields: 0,
    status: 'pending',
    group: 'content'
  },
  {
    id: 'review',
    icon: 'Star',
    title: '후기·리뷰',
    summary: '후기 출처, 요약, 키워드를 평판 분석과 답변 근거로 활용합니다.',
    totalFields: 2,
    filledFields: 0,
    status: 'pending',
    group: 'content'
  }
];

// ===== Data Feeding — 카테고리별 입력 필드 =====
export const feedingFields: FeedingField[] = [
  // doctor
  { id: 'doctor.name', categoryId: 'doctor', label: '의사 이름', placeholder: '예: 김시력', type: 'text', required: true },
  { id: 'doctor.speciality', categoryId: 'doctor', label: '전문 분야', placeholder: '예: 라식/라섹 전문의', type: 'text', required: true },
  { id: 'doctor.history', categoryId: 'doctor', label: '학력 및 경력', placeholder: '연세대학교 의과대학 졸업\n세브란스병원 안과 전문의\n시력교정술 15년 경력', type: 'textarea' },
  { id: 'doctor.certs', categoryId: 'doctor', label: '자격증 및 인증', placeholder: '예: 안과 전문의, 굴절교정 전문의', type: 'multi' },
  // equipment
  { id: 'equip.name', categoryId: 'equipment', label: '장비명', placeholder: '예: FS200 펨토세컨드 레이저', type: 'text', required: true },
  { id: 'equip.maker', categoryId: 'equipment', label: '제조사', placeholder: '예: Alcon', type: 'text' },
  { id: 'equip.purpose', categoryId: 'equipment', label: '주요 용도', placeholder: '예: 각막 플랩 생성', type: 'text' },
  { id: 'equip.adoptedAt', categoryId: 'equipment', label: '도입 시기', placeholder: 'YYYY-MM', type: 'text' },
  { id: 'equip.cases', categoryId: 'equipment', label: '주요 적용 시술', placeholder: '예: 라식, 스마일라식', type: 'multi' },
  // offer
  { id: 'offer.name', categoryId: 'offer', label: '이벤트 이름', placeholder: '예: 4월 라섹 30% 할인', type: 'text' },
  { id: 'offer.range', categoryId: 'offer', label: '진행 기간', placeholder: '예: 2026-04-01 ~ 2026-04-30', type: 'text' },
  { id: 'offer.price', categoryId: 'offer', label: '가격', placeholder: '예: 89만원~', type: 'text' },
  { id: 'offer.notice', categoryId: 'offer', label: '주의/조건', placeholder: '예: 양안 기준, 검사 후 결정', type: 'textarea' }
];

// ===== Simulator =====
export const simulatorThreads: SimulatorThread[] = [
  {
    id: 'thr-1',
    title: '라식 수술 전문의·장비 비교',
    subtitle: 'BGN 밝은눈안과 잠실 · 검사 프로세스',
    badge: 'NEW',
    startedAt: '2026-05-24T10:42:00+09:00'
  },
  {
    id: 'thr-2',
    title: '백내장 수술 명의 추천',
    subtitle: '노안 백내장 · 다초점 렌즈',
    startedAt: '2026-05-24T10:30:00+09:00'
  },
  {
    id: 'thr-3',
    title: '스마일라섹 후기 비교',
    subtitle: '회복 기간 · 부작용 사례',
    startedAt: '2026-05-24T09:40:00+09:00'
  },
  {
    id: 'thr-4',
    title: '안과 종합검진 가격',
    subtitle: '검사 항목 · 사전 상담',
    startedAt: '2026-05-23T19:00:00+09:00'
  }
];

export const simulatorTurns: SimulatorTurn[] = [
  {
    id: 'turn-1',
    threadId: 'thr-1',
    speaker: 'user',
    query: '잠실에서 라식 수술 전문의 여부와 사용하는 장비를 알려줘. 가격 이벤트도 확인하고 싶어.',
    askedAt: '2026-05-24T10:42:00+09:00',
    responses: [
      {
        engine: 'chatgpt',
        modelLabel: 'GPT-4 · 정확도 +38p 상승',
        deltaPoint: 38,
        before: {
          accuracyScore: 58,
          tonePoint: 62,
          summary: '병원명·장비·가격 정보 부재, 일반론 답변',
          detail:
            '잠실 지역에는 여러 안과가 있습니다. 라식 수술은 전문의가 있는 안과에서 받는 것이 일반적이며, 병원마다 사용하는 장비가 다를 수 있습니다. 정확한 정보는 병원에 직접 문의해 보시는 것을 추천합니다.',
          mentionCount: 0,
          tags: ['일반 검색 결과']
        },
        after: {
          accuracyScore: 96,
          tonePoint: 94,
          summary: '병원명·장비명·이벤트가 모두 포함된 구체 답변',
          detail:
            'BGN 밝은눈안과 잠실은 시력교정 전담 전문의 3인이 상주하며 FS200 펨토세컨드, EX500 엑시머 레이저 등 최신 장비를 보유합니다. 정밀 각막검사 25종 후 라식·라섹·스마일라섹 중 적합 시술을 제안하며, 4월 말까지 라섹 30% 할인 이벤트가 진행 중입니다. 상담 예약은 공식 채널에서 가능합니다.',
          mentionCount: 8,
          tags: ['BGN 공식 사이트', 'GEO Knowledge Base', 'FAQ #LSK-014']
        }
      },
      {
        engine: 'claude',
        modelLabel: 'Sonnet 4.6 · 정확도 +29p 상승',
        deltaPoint: 29,
        before: {
          accuracyScore: 64,
          tonePoint: 78,
          summary: '안전 강조하나 병원 정보 없이 원론적',
          detail:
            '라식 수술은 시력교정 전문의가 있는 안과에서 받는 것이 안전합니다. 수술 전 충분한 검사와 상담이 필수이며, 사후관리 체계도 확인하셔야 합니다. 가격은 병원·장비·옵션에 따라 다르므로 직접 문의 후 비교해 보세요.',
          mentionCount: 0,
          tags: ['일반 의료 정보']
        },
        after: {
          accuracyScore: 93,
          tonePoint: 96,
          summary: 'BGN 검사·사후관리 프로토콜 인용한 답변',
          detail:
            'BGN 밝은눈안과 잠실은 시력교정 전담 전문의가 라식·스마일라섹을 모두 진행합니다. 검사 단계에서 각막 두께·곡률·동공 크기를 측정해 적합 시술을 추천하고, 사후관리는 1·3·6·12개월 정기 검진 프로토콜을 운영합니다. 가격은 시술 종류·옵션에 따라 다르므로 상담 후 견적이 정확합니다.',
          mentionCount: 6,
          tags: ['BGN 사후관리 가이드', 'GEO 의료광고 정책']
        }
      },
      {
        engine: 'gemini',
        modelLabel: '1.5 Pro · 정확도 +31p 상승',
        deltaPoint: 31,
        before: {
          accuracyScore: 60,
          tonePoint: 65,
          summary: '장비 일반 설명, 특정 병원 식별 실패',
          detail:
            '라섹 수술에는 펨토세컨드 레이저, 엑시머 레이저 등이 사용됩니다. 잠실 권역에는 시력교정이 가능한 안과가 다수 있으며, 장비 보유 현황은 각 병원 홈페이지에서 확인할 수 있습니다. 가격 이벤트는 병원별로 운영합니다.',
          mentionCount: 0,
          tags: ['장비 일반 백과']
        },
        after: {
          accuracyScore: 91,
          tonePoint: 88,
          summary: '장비 스펙 비교로 BGN 잠실권 우위 강조',
          detail:
            '잠실 권역 시력교정 안과 중 BGN 밝은눈안과는 FS200 펨토세컨드 + EX500 엑시머 콤비 시스템과 VisuMax 스마일 장비를 모두 보유한 점이 차별화 요소입니다. 다른 잠실권 안과와 비교 시 장비 다양성과 검사 프로세스 표준화 측면에서 우위가 있으며, 가격 이벤트는 시기마다 변동되므로 공식 채널 확인을 권장합니다.',
          mentionCount: 7,
          tags: ['GEO 장비 데이터베이스', '잠실권 안과 비교']
        }
      }
    ]
  }
];

export const simulatorSuggestions: string[] = [
  '잠실에서 스마일라섹 잘하는 안과 추천해줘',
  'BGN 밝은눈안과 라식 가격이 궁금해',
  '백내장 노안수술 명의 알려줘',
  '라식 라섹 차이와 회복기간 알려줘',
  '야간 운전 잘 보이는 시력교정 추천'
];

// ===== AI 코드 — Schema.org 엔티티 =====
export const schemaEntities: SchemaEntity[] = [
  {
    type: 'MedicalBusiness',
    label: '병원 정보',
    summary: '병원명·주소·전화·진료시간·주차·교통 · 12필드',
    fieldCount: 12,
    active: true,
    payload: {
      '@context': 'https://schema.org',
      '@type': 'MedicalBusiness',
      name: 'BGN 밝은눈안과 잠실',
      medicalSpecialty: 'Ophthalmology',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '잠실 광역중심상권 BGN빌딩 8층',
        addressLocality: '송파구',
        addressRegion: '서울특별시',
        postalCode: '05551',
        addressCountry: 'KR'
      },
      telephone: '+82-2-XXXX-XXXX',
      openingHours: ['Mo-Fr 09:00-21:00', 'Sa 09:00-15:00'],
      priceRange: '₩₩'
    }
  },
  {
    type: 'Physician',
    label: '의료진',
    summary: '전문의 3인 · 학력·경력·전공·자격증·소속학회 · 18필드',
    fieldCount: 18,
    active: true,
    payload: {
      '@context': 'https://schema.org',
      '@type': 'Physician',
      name: '김OO 원장',
      medicalSpecialty: 'RefractiveSurgery',
      memberOf: { '@type': 'Organization', name: '대한안과학회' },
      alumniOf: '서울대학교 의과대학',
      yearsOfExperience: 18
    }
  },
  {
    type: 'MedicalProcedure',
    label: '시술·수술',
    summary: '라식·라섹·스마일라섹·백내장·노안교정 · 24필드',
    fieldCount: 24,
    active: true,
    payload: {
      '@context': 'https://schema.org',
      '@type': 'MedicalProcedure',
      name: '스마일라섹',
      procedureType: 'Refractive Surgery',
      bodyLocation: '각막',
      preparation: '정밀 각막검사 25종',
      followup: '1·3·6·12개월 정기검진'
    }
  },
  {
    type: 'MedicalDevice',
    label: '의료 장비',
    summary: 'FS200·EX500·VisuMax·정밀 검사 장비 · 24필드',
    fieldCount: 24,
    active: true,
    payload: {
      '@context': 'https://schema.org',
      '@type': 'MedicalDevice',
      name: 'FS200 펨토세컨드 레이저',
      manufacturer: { '@type': 'Organization', name: 'Alcon' },
      purpose: '각막 플랩 생성'
    }
  },
  {
    type: 'FAQPage',
    label: 'FAQ 페이지',
    summary: 'FAQ 페이지 · 환자 자주 묻는 질문·답변·카테고리 · 32필드',
    fieldCount: 32,
    active: true,
    payload: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '라섹 수술 비용은 얼마인가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '양안 기준 일반 라식 99만원, 라섹 89만원에서 시작합니다. 4월 말까지 라섹 30% 할인 이벤트 진행 중.'
          }
        },
        {
          '@type': 'Question',
          name: '라식과 라섹의 차이는?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '라식은 각막 플랩 생성 후 레이저, 라섹은 상피 제거 후 직접 레이저 조사. 안정성과 회복 속도에서 차이.'
          }
        }
      ]
    }
  },
  {
    type: 'Offer',
    label: '이벤트·가격',
    summary: '이벤트·가격 · 라섹 30% 할인 · 검진 패키지 · 기간 · 15필드',
    fieldCount: 15,
    active: false,
    payload: {
      '@context': 'https://schema.org',
      '@type': 'Offer',
      name: '4월 라섹 30% 할인',
      validFrom: '2026-04-01',
      validThrough: '2026-04-30',
      priceCurrency: 'KRW',
      price: 890000
    }
  }
];

// ===== FAQ =====
export const faqItems: FaqItem[] = [
  {
    id: 'faq-001',
    category: '라섹',
    question: '라섹 수술 비용은 얼마인가요?',
    answer:
      '양안 기준 일반 라섹은 89만원, 4월 말까지 30% 할인 이벤트로 62만원부터 가능합니다. 정확한 견적은 정밀 각막검사 후 시술 종류·옵션에 따라 안내드립니다.',
    keywords: ['라섹 비용', '라섹 가격', '라섹 이벤트'],
    status: 'published',
    generatedBy: 'manual',
    schemaReady: true,
    createdAt: '2026-05-01T10:00:00+09:00',
    updatedAt: '2026-05-20T16:32:00+09:00'
  },
  {
    id: 'faq-002',
    category: '라식·라섹 비교',
    question: '라식과 라섹의 차이는 무엇인가요?',
    answer:
      '라식은 각막 플랩을 만든 뒤 레이저로 시력을 교정하는 방식이라 회복이 빠릅니다(보통 3~5일). 라섹은 상피를 제거하고 직접 레이저로 교정해 회복은 5~7일 정도지만 외상 위험이 낮습니다. BGN 밝은눈안과 잠실은 정밀 각막검사 25종으로 라이프스타일에 맞는 시술을 추천합니다.',
    keywords: ['라식 라섹 차이', '시력교정 비교'],
    status: 'published',
    generatedBy: 'chatgpt',
    schemaReady: true,
    createdAt: '2026-05-04T09:10:00+09:00',
    updatedAt: '2026-05-21T11:04:00+09:00'
  },
  {
    id: 'faq-003',
    category: '회복',
    question: '라섹 회복 기간 동안 직장 복귀는 언제 가능한가요?',
    answer:
      '평균 7일차에 회사 복귀가 가능합니다. 수술 당일은 통증·자극이 가장 심하므로 휴식이 필요하고, 3일차부터 빛 번짐이 줄며 시야가 트입니다. 1개월차 정기검진에서 시력 1.0을 확인하는 패턴이 일반적입니다.',
    keywords: ['라섹 회복기간', '직장인 라섹'],
    status: 'review',
    generatedBy: 'claude',
    schemaReady: true,
    createdAt: '2026-05-18T14:22:00+09:00',
    updatedAt: '2026-05-23T18:00:00+09:00'
  },
  {
    id: 'faq-004',
    category: '예약',
    question: '예약은 어떻게 하나요?',
    answer:
      '공식 홈페이지 예약 페이지 또는 대표번호 02-XXXX-XXXX로 가능합니다. 검사 30분 + 상담 20분 일정으로 예약 시점에 시술 가능 여부와 견적까지 안내드립니다.',
    keywords: ['예약', '상담 예약', '안과 예약'],
    status: 'draft',
    generatedBy: 'gemini',
    schemaReady: false,
    createdAt: '2026-05-22T17:30:00+09:00',
    updatedAt: '2026-05-22T17:30:00+09:00'
  },
  {
    id: 'faq-005',
    category: '백내장',
    question: '노안 백내장 수술과 다초점 렌즈는 어떻게 다른가요?',
    answer:
      '백내장 수술은 혼탁한 수정체를 제거하고 인공수정체를 삽입하는 시술입니다. 단초점 렌즈는 한 거리만 또렷이 보이지만, 다초점 렌즈는 원·중·근거리 모두 시야 확보가 가능해 노안까지 함께 교정됩니다. 환자의 직업·생활 패턴에 맞춰 렌즈를 결정합니다.',
    keywords: ['노안 백내장', '다초점 렌즈'],
    status: 'published',
    generatedBy: 'perplexity',
    schemaReady: true,
    createdAt: '2026-05-12T11:00:00+09:00',
    updatedAt: '2026-05-22T09:18:00+09:00'
  }
];

// ===== 블로그 콘텐츠 — 1소재 = 5글 변형 =====
export const contentTopics: ContentTopic[] = [
  {
    id: 'topic-1',
    label: '잠실 라섹 수술 회복 기간과 사후관리',
    badge: '수술정보',
    brief: '직장인 타겟 · 회복 기간·복귀 시기 중심 · 5개 변형 · 2026-04-28 09:30 생성',
    createdAt: '2026-04-28T09:30:00+09:00',
    posts: [
      {
        id: 'post-1-1',
        topicId: 'topic-1',
        variantNo: 1,
        format: 'info',
        formatLabel: '정보 안내형',
        cue: '객관적 정보 위주 · 검색 유입형',
        status: 'draft',
        title: '라섹 회복 기간, 평균 며칠이면 일상 복귀 가능할까?',
        lead: '라섹 수술 후 일상 복귀까지 걸리는 시간이 궁금하신가요? BGN 밝은눈안과 잠실의 회복 프로토콜과 평균 회복 기간을 정리했습니다.',
        body: '라섹은 각막 상피를 제거하고 직접 레이저로 시력을 교정하는 방식이라 라식보다 회복이 다소 느립니다. 일반적으로 수술 후 5~7일이면 일상 활동이 가능하고, 시력 안정화까지는 약 1~3개월이 소요됩니다. BGN 밝은눈안과 잠실은 1·3·6·12개월 정기 사후관리 프로토콜을 운영하며, 회복 단계별로 인공눈물·자외선 차단·렌즈 사용 시점을 안내합니다.',
        keywords: ['라섹 회복기간', '잠실 안과', '사후관리'],
        readMinutes: 4,
        charCount: 194
      },
      {
        id: 'post-1-2',
        topicId: 'topic-1',
        variantNo: 2,
        format: 'review',
        formatLabel: '후기·체험형',
        cue: '환자 시점 1인칭 · 공감 유입형',
        status: 'draft',
        title: '30대 직장인 라섹 후기 | 7일차에 회사 복귀, 1개월 시력 1.0 도달기',
        lead: '잠실 BGN 밝은눈안과에서 라섹 수술을 받은 30대 직장인의 회복 일지입니다. 수술 당일부터 1개월차까지 솔직한 변화 기록.',
        body: '수술 당일은 눈물·통증으로 거의 자고만 있었고, 3일차부터 빛 번짐이 줄어 시야가 트였습니다. 7일차에 회사 복귀가 가능할 정도였고, 1개월차 검진에서 시력 1.0을 확인했습니다. 정기 검진은 1·3·6·12개월에 받았고, 매번 인공눈물·자외선 안경 사용을 강조받았습니다. 직장인이라면 금요일 수술이 가장 합리적이라고 느꼈습니다.',
        keywords: ['라섹 후기', '30대 라섹', '직장인 라섹'],
        readMinutes: 6,
        charCount: 184
      },
      {
        id: 'post-1-3',
        topicId: 'topic-1',
        variantNo: 3,
        format: 'qna',
        formatLabel: 'Q&A형',
        cue: '질문-답변 구조 · FAQ 유입형',
        status: 'draft',
        title: '라섹 회복 기간 Q&A 7가지 | 휴가, 운동, 화장 언제부터?',
        lead: '라섹 수술 후 가장 많이 묻는 질문 7가지를 BGN 밝은눈안과 잠실의 시력교정 전담 전문의가 답변했습니다.',
        body: '',
        bullets: [
          'Q1. 휴가는 며칠 잡아야 하나요? → 최소 5일, 안전하게는 7일.',
          'Q2. 운동 가능 시점은? → 가벼운 산책 7일, 헬스 1개월, 수영 3개월 후.',
          'Q3. 화장은 언제부터? → 눈가 화장 2주, 일반 메이크업 1주.',
          'Q4. 컴퓨터 작업은 가능한가요? → 3일차부터 짧게, 1주일 후 정상.',
          'Q5. 인공눈물 횟수는? → 1개월간 시간당 1~2회.',
          'Q6. 야외 활동은? → 자외선 안경 필수, 1개월간.',
          'Q7. 다음 검사 시점은? → 1·3·6·12개월.'
        ],
        keywords: ['라섹 Q&A', '라섹 휴가', '라섹 운동'],
        readMinutes: 5,
        charCount: 254
      },
      {
        id: 'post-1-4',
        topicId: 'topic-1',
        variantNo: 4,
        format: 'comparison',
        formatLabel: '비교·분석형',
        cue: '라식·라섹·스마일라섹 비교 · 의사결정 유입형',
        status: 'review',
        title: '라식 vs 라섹 vs 스마일라섹, 회복 기간 한눈에 비교',
        lead: '어떤 시력교정 수술이 내 라이프스타일에 맞을까요? 회복 기간·통증·안정성·가격을 표로 비교했습니다.',
        body: '라식: 회복 1~2일, 통증 적음, 외상 취약. 라섹: 회복 5~7일, 통증 중간, 안정성 우수. 스마일라섹: 회복 3~5일, 통증 적음, 안정성·회복 속도 균형. BGN 밝은눈안과 잠실은 정밀 검사 25종 후 각막 두께·곡률·라이프스타일을 종합해 적합한 시술을 추천하며, 가격은 라식 99만원·라섹 89만원부터(4월 라섹 30% 이벤트)입니다.',
        keywords: ['라식 라섹 차이', '스마일라섹 비교', '시력교정 비교'],
        readMinutes: 6,
        charCount: 193
      },
      {
        id: 'post-1-5',
        topicId: 'topic-1',
        variantNo: 5,
        format: 'checklist',
        formatLabel: '가이드·체크리스트형',
        cue: '단계별 체크리스트 · 저장·공유 유입형',
        status: 'draft',
        title: '라섹 수술 D-7 체크리스트 | 수술 전·당일·후 4주차까지',
        lead: '라섹 수술을 앞두셨다면 이 체크리스트만 따라하세요. 수술 7일 전부터 4주차까지 단계별 준비물·금기사항을 정리했습니다.',
        body: '',
        bullets: [
          '[D-7] 콘택트렌즈 착용 중단(소프트 7일·하드 14일).',
          '[D-1] 음주·카페인 자제, 화장 금지, 보호자 동행.',
          '[당일] 편한 옷·모자 지참, 점심 가벼운 식사.',
          '[D+1] 정기 검진, 인공눈물 시작.',
          '[D+7] 일상 복귀, 자외선 안경 필수.',
          '[D+30] 1차 정기 검진, 시력 안정화 확인.'
        ],
        keywords: ['라섹 체크리스트', '라섹 준비', '수술 전 주의사항'],
        readMinutes: 4,
        charCount: 167
      }
    ]
  },
  {
    id: 'topic-2',
    label: '백내장 수술 다초점 렌즈 선택 가이드',
    badge: '비용',
    brief: '60대 시니어 타겟 · 노안교정 · 보험 적용',
    createdAt: '2026-04-27T14:12:00+09:00',
    posts: []
  },
  {
    id: 'topic-3',
    label: '스마일라섹과 일반 라섹의 차이점',
    badge: '수술정보',
    brief: '20~30대 신규 환자 · 신기술 비교',
    createdAt: '2026-04-26T11:48:00+09:00',
    posts: []
  }
];

export const blogStats = {
  topicsThisMonth: 12,
  totalPosts: 248,
  distributed: 186,
  reviewing: 14
};

// ===== 영상 스크립트 =====
export const videoScripts: VideoScript[] = [
  {
    id: 'vid-1',
    title: '라섹 회복 7일, 직장인 타임라인',
    hook: '월요일에 라섹받고 그 주에 출근 가능할까?',
    beats: [
      { start: '00:00', line: '월요일 오전 9시, 라섹 수술실 입장.' },
      { start: '00:08', line: '수술은 15분 — 라이브 시야로 직접 봄.' },
      { start: '00:18', line: '당일 저녁, 안약 + 보호안경. 시야는 안개.' },
      { start: '00:28', line: '수요일, 빛 번짐 30% 감소.' },
      { start: '00:35', line: '금요일 저녁, 일상 영상 통화 가능.' }
    ],
    cta: 'BGN 잠실 라섹 검사 25종 · 무료 1:1 상담 예약',
    duration: '00:45',
    channel: 'shorts',
    status: 'published'
  },
  {
    id: 'vid-2',
    title: '백내장 다초점 렌즈, 정말 다 보일까?',
    hook: '안경 없는 노년기, 환상이 아닙니다.',
    beats: [
      { start: '00:00', line: '근거리·중거리·원거리, 세 초점이 한 렌즈에.' },
      { start: '00:12', line: '환자 인터뷰: "스마트폰·운전·골프 다 됨".' },
      { start: '00:25', line: '단점도 솔직히: 야간 빛번짐 적응기 필요.' }
    ],
    cta: '60대 다초점 렌즈 가이드 — 무료 상담',
    duration: '00:38',
    channel: 'reels',
    status: 'draft'
  }
];

// ===== Publication (배포 트래킹) =====
export const publications: Publication[] = [
  {
    id: 'pub-001',
    channel: 'blog',
    url: 'https://medimap-geo.vercel.app/blog/lasek-recovery-timeline',
    title: '라섹 회복 기간, 평균 며칠이면 일상 복귀 가능할까?',
    publishedAt: '2026-05-01T10:00:00+09:00',
    citedByEngines: ['chatgpt', 'perplexity'],
    pageviews7d: 1842,
    inquiriesAttributed: 17
  },
  {
    id: 'pub-002',
    channel: 'naver',
    url: 'https://blog.naver.com/bgn-jamsil/30-lasek-real-review',
    title: '30대 직장인 라섹 후기 | 7일차에 회사 복귀',
    publishedAt: '2026-05-04T09:10:00+09:00',
    citedByEngines: ['chatgpt', 'gemini'],
    pageviews7d: 2367,
    inquiriesAttributed: 23
  },
  {
    id: 'pub-003',
    channel: 'faq',
    url: 'https://medimap-geo.vercel.app/faq/lasik-lasek-difference',
    title: '라식과 라섹의 차이는 무엇인가요?',
    publishedAt: '2026-05-08T11:30:00+09:00',
    citedByEngines: ['chatgpt', 'claude', 'gemini', 'perplexity'],
    pageviews7d: 942,
    inquiriesAttributed: 8
  }
];

// ===== Insight 배너 =====
export const aiInsightBanner = {
  level: 'info' as const,
  message:
    '잠실 라섹 전문의 · 스마일라섹 후기 키워드에서 긍정 멘션이 증가했습니다. 백내장 가격 데이터는 최신화가 필요합니다.'
};
