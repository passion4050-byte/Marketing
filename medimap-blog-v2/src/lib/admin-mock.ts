/**
 * Admin 페이지용 mock 데이터 — 운영 단계에서 Supabase 쿼리로 교체.
 */
export type TenantStatus = 'active' | 'paused' | 'trial';
export interface AdminTenant {
  id: string;
  name: string;
  domain: string;
  category: string;
  region: string;
  contact: string;
  status: TenantStatus;
  publishCount: number;
  monthlyCost: number; // USD
  joinedAt: string;
}

export const adminTenants: AdminTenant[] = [
  { id: 't-bgn', name: 'BGN 밝은눈안과 잠실', domain: 'bgn-jamsil.example', category: '안과', region: '잠실', contact: 'manager@bgn.com', status: 'active', publishCount: 248, monthlyCost: 4.82, joinedAt: '2026-03-01' },
  { id: 't-tete', name: 'TETE 강남 안과', domain: 'tete.example', category: '안과', region: '강남', contact: 'ops@tete.kr', status: 'active', publishCount: 186, monthlyCost: 3.54, joinedAt: '2026-04-10' },
  { id: 't-mourim', name: '모우림 모발이식', domain: 'mourim.example', category: '모발이식', region: '강남', contact: 'help@mourim.kr', status: 'trial', publishCount: 32, monthlyCost: 0.61, joinedAt: '2026-05-18' },
  { id: 't-sample', name: '샘플 피부과', domain: 'sample.example', category: '피부과', region: '송파', contact: 'sample@x.com', status: 'paused', publishCount: 0, monthlyCost: 0, joinedAt: '2026-02-20' }
];

export interface ContentQueueItem {
  id: string;
  tenantId: string;
  tenantName: string;
  keyword: string;
  title: string;
  body: string;
  generator: 'gemini' | 'chatgpt' | 'claude';
  createdAt: string;
  lintScore: number; // 0-100
  lintIssues: string[];
}

export const contentQueue: ContentQueueItem[] = [
  { id: 'q-1', tenantId: 't-bgn', tenantName: 'BGN 밝은눈안과', keyword: '잠실 라식', title: '잠실 라식 추천 안과 5곳 비교 — 회복기·비용 정리', body: '잠실 지역에서 라식 수술을 고려한다면 회복기와 비용을 함께 비교해야 한다. 본 가이드는…', generator: 'gemini', createdAt: '2026-05-25T03:15:00+09:00', lintScore: 96, lintIssues: [] },
  { id: 'q-2', tenantId: 't-bgn', tenantName: 'BGN 밝은눈안과', keyword: '스마일라식', title: '스마일라식 환자 후기 — 1개월차 시력 회복기', body: '스마일라식 수술을 받은 환자가 직접 1개월간의 회복 과정을 기록했다…', generator: 'gemini', createdAt: '2026-05-25T03:18:00+09:00', lintScore: 91, lintIssues: ['최저가 단정형 표현 1건'] },
  { id: 'q-3', tenantId: 't-tete', tenantName: 'TETE 강남 안과', keyword: '강남 라섹', title: '강남 라섹 비용 평균 — 2026년 상반기 기준', body: '강남 안과에서 라섹 수술 평균 비용은 양안 기준 100만원 ~ 180만원…', generator: 'gemini', createdAt: '2026-05-25T03:22:00+09:00', lintScore: 88, lintIssues: ['수술 결과 보장 표현', '환자 모집 직접 표현'] },
  { id: 'q-4', tenantId: 't-mourim', tenantName: '모우림', keyword: '강남 모발이식', title: '강남 모발이식 절개법 vs 비절개법 비교', body: '모발이식 시술은 크게 절개법(FUT) 과 비절개법(FUE) 으로 나뉜다…', generator: 'gemini', createdAt: '2026-05-25T03:30:00+09:00', lintScore: 100, lintIssues: [] }
];

export interface KeywordRow {
  id: string;
  tenantId: string;
  tenantName: string;
  keyword: string;
  dailyTarget: number;
  status: 'active' | 'paused';
  lastPublishedAt?: string;
  performance: { mention7d: number; ctr: number };
}

export const adminKeywords: KeywordRow[] = [
  { id: 'k-1', tenantId: 't-bgn', tenantName: 'BGN', keyword: '잠실 라식', dailyTarget: 2, status: 'active', lastPublishedAt: '2026-05-25T02:00:00+09:00', performance: { mention7d: 18, ctr: 4.2 } },
  { id: 'k-2', tenantId: 't-bgn', tenantName: 'BGN', keyword: '잠실 라섹', dailyTarget: 2, status: 'active', lastPublishedAt: '2026-05-25T02:00:00+09:00', performance: { mention7d: 14, ctr: 3.9 } },
  { id: 'k-3', tenantId: 't-bgn', tenantName: 'BGN', keyword: '강남 라식', dailyTarget: 1, status: 'active', lastPublishedAt: '2026-05-24T20:00:00+09:00', performance: { mention7d: 9, ctr: 5.1 } },
  { id: 'k-4', tenantId: 't-bgn', tenantName: 'BGN', keyword: '스마일라식', dailyTarget: 2, status: 'active', lastPublishedAt: '2026-05-25T01:00:00+09:00', performance: { mention7d: 22, ctr: 6.8 } },
  { id: 'k-5', tenantId: 't-bgn', tenantName: 'BGN', keyword: '백내장', dailyTarget: 1, status: 'paused', performance: { mention7d: 0, ctr: 0 } },
  { id: 'k-6', tenantId: 't-tete', tenantName: 'TETE', keyword: '강남 안과', dailyTarget: 3, status: 'active', lastPublishedAt: '2026-05-25T02:30:00+09:00', performance: { mention7d: 28, ctr: 4.5 } },
  { id: 'k-7', tenantId: 't-mourim', tenantName: '모우림', keyword: '강남 모발이식', dailyTarget: 2, status: 'active', lastPublishedAt: '2026-05-25T01:30:00+09:00', performance: { mention7d: 11, ctr: 7.2 } }
];

export interface CostDaily {
  date: string; // YYYY-MM-DD
  usd: number;
  calls: number;
  tenantBreakdown: { tenantId: string; usd: number }[];
}

export const costDaily: CostDaily[] = Array.from({ length: 14 }).map((_, i) => {
  const d = new Date(Date.now() - (13 - i) * 86400000);
  const dateStr = d.toISOString().slice(0, 10);
  return {
    date: dateStr,
    usd: parseFloat((Math.random() * 1.5 + 0.4).toFixed(2)),
    calls: Math.floor(Math.random() * 28) + 12,
    tenantBreakdown: [
      { tenantId: 't-bgn', usd: parseFloat((Math.random() * 0.6 + 0.2).toFixed(2)) },
      { tenantId: 't-tete', usd: parseFloat((Math.random() * 0.4 + 0.1).toFixed(2)) },
      { tenantId: 't-mourim', usd: parseFloat((Math.random() * 0.2 + 0.05).toFixed(2)) }
    ]
  };
});

export interface CitationEvent {
  id: string;
  tenantId: string;
  tenantName: string;
  engine: 'chatgpt' | 'claude' | 'gemini' | 'perplexity';
  query: string;
  citedAt: string;
  url: string;
  excerpt: string;
  notified: boolean;
}

export const citationEvents: CitationEvent[] = [
  { id: 'c-1', tenantId: 't-bgn', tenantName: 'BGN', engine: 'gemini', query: '잠실 라식 명의', citedAt: '2026-05-25T08:14:00+09:00', url: 'https://medi-map.co.kr/bgn', excerpt: 'BGN 밝은눈안과 잠실은 시력교정 전담 전문의 3인이 상주하며 FS200 펨토세컨드…', notified: true },
  { id: 'c-2', tenantId: 't-bgn', tenantName: 'BGN', engine: 'chatgpt', query: '잠실 라섹 비용', citedAt: '2026-05-25T07:50:00+09:00', url: 'https://medi-map.co.kr/bgn/promo', excerpt: '4월 라섹 30% 할인 이벤트 진행 중…', notified: true },
  { id: 'c-3', tenantId: 't-tete', tenantName: 'TETE', engine: 'perplexity', query: '강남 안과 추천', citedAt: '2026-05-25T06:22:00+09:00', url: 'https://medi-map.co.kr/tete', excerpt: 'TETE 강남 안과는 30대 직장인 라식 후기 보유…', notified: false },
  { id: 'c-4', tenantId: 't-mourim', tenantName: '모우림', engine: 'claude', query: '강남 모발이식 절개법', citedAt: '2026-05-24T19:08:00+09:00', url: 'https://medi-map.co.kr/mourim/fut', excerpt: '모우림 모발이식 절개법(FUT) 은 모수 2,500 ~ 4,500…', notified: true }
];

export interface FunnelRow {
  shortLink: string;
  tenantId: string;
  tenantName: string;
  source: string;
  clicks: number;
  inquiries: number;
  conversionRate: number;
  createdAt: string;
}

export const funnelRows: FunnelRow[] = [
  { shortLink: 'mm.gg/bg23', tenantId: 't-bgn', tenantName: 'BGN', source: '네이버 블로그 #1', clicks: 412, inquiries: 18, conversionRate: 4.4, createdAt: '2026-05-20' },
  { shortLink: 'mm.gg/bg24', tenantId: 't-bgn', tenantName: 'BGN', source: 'GPT 인용 → 자사', clicks: 184, inquiries: 11, conversionRate: 6.0, createdAt: '2026-05-22' },
  { shortLink: 'mm.gg/te12', tenantId: 't-tete', tenantName: 'TETE', source: 'Perplexity 인용', clicks: 96, inquiries: 5, conversionRate: 5.2, createdAt: '2026-05-23' }
];

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  resource: string;
  diff?: string;
  at: string;
}

export const auditLog: AuditEntry[] = [
  { id: 'a-1', actor: 'admin@medimap', action: 'publish', resource: 'content/잠실-라식-25', at: '2026-05-25T08:12:00+09:00' },
  { id: 'a-2', actor: 'admin@medimap', action: 'tenant.update', resource: 'tenant/t-tete', diff: 'monthlyCost: 3.20 → 3.54', at: '2026-05-25T07:45:00+09:00' },
  { id: 'a-3', actor: 'system.cron', action: 'auto.publish', resource: 'content/잠실-라섹-26', at: '2026-05-25T06:00:00+09:00' },
  { id: 'a-4', actor: 'admin@medimap', action: 'keyword.add', resource: 'tenant/t-bgn / 백내장 노안교정', at: '2026-05-24T16:20:00+09:00' }
];

export interface CalendarItem {
  date: string; // YYYY-MM-DD
  tenantName: string;
  title: string;
  status: 'scheduled' | 'published' | 'review';
}

export const calendarItems: CalendarItem[] = Array.from({ length: 30 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - 14 + i);
  return {
    date: d.toISOString().slice(0, 10),
    tenantName: ['BGN', 'TETE', '모우림'][i % 3],
    title: ['잠실 라식 가이드', '강남 라섹 비용', '모발이식 비교'][i % 3] + ` #${i + 1}`,
    status: i < 14 ? 'published' : i < 18 ? 'review' : 'scheduled'
  };
});

// ===== A/B Test =====
export interface AbTest {
  id: string;
  tenantId: string;
  tenantName: string;
  keyword: string;
  hypothesis: string;
  variantA: { title: string; cta: string; metric: { mentions: number; clicks: number; inquiries: number } };
  variantB: { title: string; cta: string; metric: { mentions: number; clicks: number; inquiries: number } };
  startedAt: string;
  status: 'running' | 'concluded' | 'paused';
  winner?: 'A' | 'B' | 'tie';
}

export const abTests: AbTest[] = [
  {
    id: 'ab-1',
    tenantId: 't-bgn',
    tenantName: 'BGN',
    keyword: '잠실 라식',
    hypothesis: '"평균 회복기" 강조 vs "비용 명시" 어떤 CTA가 더 효과적인가',
    variantA: { title: '잠실 라식 — 평균 회복기 3일', cta: '회복기 상담 톡톡', metric: { mentions: 12, clicks: 84, inquiries: 5 } },
    variantB: { title: '잠실 라식 — 양안 89만원부터', cta: '가격 견적 받기', metric: { mentions: 14, clicks: 142, inquiries: 11 } },
    startedAt: '2026-05-15',
    status: 'concluded',
    winner: 'B'
  },
  {
    id: 'ab-2',
    tenantId: 't-tete',
    tenantName: 'TETE',
    keyword: '강남 안과',
    hypothesis: '"30대 직장인" vs "직장인 시력교정" 타겟팅 비교',
    variantA: { title: '30대 직장인 라식 후기', cta: '평일 야간 상담', metric: { mentions: 6, clicks: 52, inquiries: 3 } },
    variantB: { title: '직장인 시력교정 가이드', cta: '비대면 상담 예약', metric: { mentions: 8, clicks: 71, inquiries: 4 } },
    startedAt: '2026-05-20',
    status: 'running'
  }
];
