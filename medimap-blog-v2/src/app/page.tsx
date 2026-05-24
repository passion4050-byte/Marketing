/**
 * 통합 대시보드 & AI 모니터링 — 메인 화면.
 * Figma 시안(node 804:386) IA 100% 싱크로.
 */

import { Header } from '@/components/Header';
import { KpiGrid } from '@/components/KpiCard';
import { InsightBanner } from '@/components/InsightBanner';
import { EnginePerformanceBars } from '@/components/charts/EnginePerformanceBars';
import { SentimentByEngineChart } from '@/components/charts/SentimentByEngineChart';
import { MentionTrendChart } from '@/components/charts/MentionTrendChart';
import { OverallSentimentBars } from '@/components/charts/OverallSentimentBars';
import { KeywordOptimizationTable } from '@/components/tables/KeywordOptimizationTable';
import { LiveFeedPanel } from '@/components/feed/LiveFeedPanel';
import { TopicsTable } from '@/components/tables/TopicsTable';
import {
  aiInsightBanner,
  engineMetrics,
  enginePerformance,
  keywordOptimization,
  liveFeed,
  mentionKpis,
  mentionTrend,
  overallSentiment,
  sentimentByEngine,
  topicRows,
  visibilityKpis
} from '@/lib/mock-data';

export const dynamic = 'force-static';
export const revalidate = 60;

export default function DashboardPage() {
  return (
    <>
      <Header
        title="통합 대시보드 & AI 모니터링"
        subtitle="AI 검색 가시성, 멘션 트렌드, 감성 분석을 한 화면에서 확인하고 PDF로 공유합니다."
        tabs={[
          { label: '통합 대시보드 & AI 모니터링', active: true },
          { label: '데이터 피딩', href: '/data-feeding' }
        ]}
        actionLabel="PDF 다운로드"
      />

      <div className="space-y-6 px-8 py-6">
        <InsightBanner message={aiInsightBanner.message} />

        <section className="space-y-2">
          <div className="section-subtle">GEO 가시성 지표</div>
          <KpiGrid slots={visibilityKpis} />
        </section>

        <section className="space-y-2">
          <div className="section-subtle">AI 멘션 지표</div>
          <KpiGrid slots={mentionKpis} />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <EnginePerformanceBars rows={enginePerformance} metrics={engineMetrics} />
            <KeywordOptimizationTable rows={keywordOptimization} />
          </div>
          <div className="space-y-6 lg:col-span-1">
            <SentimentByEngineChart rows={sentimentByEngine} />
            <MentionTrendChart points={mentionTrend} />
            <OverallSentimentBars
              positive={overallSentiment.positive}
              neutral={overallSentiment.neutral}
              negative={overallSentiment.negative}
            />
          </div>
          <div className="lg:col-span-1">
            <LiveFeedPanel items={liveFeed} />
          </div>
        </div>

        <TopicsTable rows={topicRows} />
      </div>
    </>
  );
}
