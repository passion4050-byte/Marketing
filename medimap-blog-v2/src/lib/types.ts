/**
 * MEDIMAP GEO — 데이터 모델
 *
 * Figma 레퍼런스(804:353)의 모든 데이터 요소를 타입으로 매핑한다.
 * 실제 운영에서는 Supabase Postgres와 1:1 매칭되도록 설계.
 */

export type LlmEngine = 'chatgpt' | 'claude' | 'gemini' | 'perplexity';

export type ContentChannel = 'blog' | 'naver' | 'instagram' | 'video' | 'faq';

export type SourceFormat = 'info' | 'review' | 'qna' | 'comparison' | 'checklist';

export type ComplianceStatus = 'pass' | 'warn' | 'fail';

export type PublishStatus = 'draft' | 'review' | 'published' | 'archived';

export type Sentiment = 'positive' | 'neutral' | 'negative';

export type FeedingCategoryId =
  | 'doctor'
  | 'equipment'
  | 'offer'
  | 'hours'
  | 'location'
  | 'procedure'
  | 'brand'
  | 'faq'
  | 'review';

export type SchemaEntityType =
  | 'MedicalBusiness'
  | 'Physician'
  | 'MedicalProcedure'
  | 'MedicalDevice'
  | 'FAQPage'
  | 'Offer';

// ===== 테넌트 =====
export interface Tenant {
  id: string;
  name: string;          // 예: "BGN 밝은눈안과"
  region: string;        // 예: "잠실"
  specialty: string;     // 예: "안과"
  tagline: string;       // 예: "AI 가시성 관리"
  cycleLabel: string;    // 예: "2026.04"
}

// ===== 데이터 피딩 =====
export interface FeedingCategory {
  id: FeedingCategoryId;
  icon: string;                  // lucide icon name
  title: string;
  summary: string;
  totalFields: number;
  filledFields: number;
  status: 'pending' | 'in_progress' | 'completed';
  group: 'expertise' | 'operation' | 'content';
}

export interface FeedingField {
  id: string;
  categoryId: FeedingCategoryId;
  label: string;
  placeholder: string;
  type: 'text' | 'textarea' | 'select' | 'multi';
  options?: string[];
  required?: boolean;
}

// ===== KPI / 대시보드 =====
export interface KpiSlot {
  id: string;
  label: string;
  value: string;
  deltaText: string;       // "+9점 상승" / "↓ 누락 18건"
  deltaDirection: 'up' | 'down' | 'flat';
  subtle?: string;
}

export interface EnginePerformance {
  engine: LlmEngine;
  label: string;            // "최고 노출" / "보강 필요" / "출처 강점"
  score: number;            // 0-100
}

export interface EngineMetricRow {
  engine: LlmEngine;
  accuracy: number;
  mention: number;
  positive: number;
  relevance: number;
  coverage: number;
}

export interface KeywordOptimization {
  keyword: string;
  searchVolume: number;
  aiMentions: number;
  rank: number;
  delta: number;            // %
  status: 'optimized' | 'normal' | 'needs_update' | 'review' | 'missing';
}

export interface SentimentByEngine {
  engine: LlmEngine;
  positive: number;
  neutral: number;
  negative: number;
}

export interface MentionTrendPoint {
  weekday: string;           // 월~일
  count: number;
}

export interface LiveFeedItem {
  id: string;
  engine: LlmEngine;
  query: string;
  summary: string;
  sentiment: Sentiment;
  capturedAt: string;        // ISO
}

export interface TopicRow {
  topic: string;
  mentions: number;
  sentiment: Sentiment | 'warning';
  note: string;
}

// ===== Simulator =====
export interface SimulatorThread {
  id: string;
  title: string;
  subtitle: string;
  badge?: 'NEW';
  startedAt: string;        // ISO
}

export interface SimulatorTurn {
  id: string;
  threadId: string;
  speaker: 'user' | 'system';
  query: string;
  askedAt: string;            // ISO
  // 시스템 응답이 있을 때
  responses?: Array<{
    engine: LlmEngine;
    modelLabel: string;
    deltaPoint: number;
    before: {
      accuracyScore: number;
      tonePoint: number;
      summary: string;
      detail: string;
      mentionCount: number;
      tags: string[];
    };
    after: {
      accuracyScore: number;
      tonePoint: number;
      summary: string;
      detail: string;
      mentionCount: number;
      tags: string[];
    };
  }>;
}

// ===== AI 코드 (JSON-LD) =====
export interface SchemaEntity {
  type: SchemaEntityType;
  label: string;
  summary: string;
  fieldCount: number;
  active: boolean;
  payload: Record<string, unknown>;
}

// ===== FAQ =====
export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  status: PublishStatus;
  generatedBy: LlmEngine | 'manual';
  schemaReady: boolean;
  createdAt: string;
  updatedAt: string;
}

// ===== 블로그 콘텐츠 =====
export interface ContentTopic {
  id: string;
  label: string;            // 예: "잠실 라섹 수술 회복 기간과 사후관리"
  badge: '수술정보' | '비용' | '이벤트' | '후기' | '비교';
  brief: string;
  posts: BlogPostVariant[];
  createdAt: string;
}

export interface BlogPostVariant {
  id: string;
  topicId: string;
  variantNo: number;
  format: SourceFormat;
  formatLabel: string;       // 정보 안내형 / 후기-체험형 ...
  cue: string;               // "객관적 정보 위주 · 검색 유입형"
  status: PublishStatus;
  title: string;
  lead: string;
  body: string;
  bullets?: string[];
  keywords: string[];
  readMinutes: number;
  charCount: number;
}

// ===== 영상 스크립트 =====
export interface VideoScript {
  id: string;
  title: string;
  hook: string;
  beats: Array<{ start: string; line: string }>;
  cta: string;
  duration: string;          // "00:45"
  channel: 'shorts' | 'reels' | 'youtube';
  status: PublishStatus;
}

// ===== Publication (배포 트래킹) =====
export interface Publication {
  id: string;
  channel: ContentChannel;
  url: string;
  title: string;
  publishedAt: string;
  citedByEngines: LlmEngine[];
  pageviews7d: number;
  inquiriesAttributed: number;
}
