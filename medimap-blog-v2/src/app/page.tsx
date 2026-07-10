/**
 * 콘솔 홈 — AI 인용 현황 대시보드 (실측 데이터).
 * mentions/responses/queries/keywords 실집계를 /api/dashboard/overview 에서 로드.
 * 데모 mock-data 제거 완료. 경쟁사 SOV·인용순위는 측정 파서 보강(경로 2) 후 추가.
 */
'use client';

import { useEffect, useState } from 'react';
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
import { printCurrentPage, showToast } from '@/lib/clientActions';
import type {
  EngineMetricRow,
  EnginePerformance,
  KeywordOptimization,
  KpiSlot,
  LiveFeedItem,
  MentionTrendPoint,
  SentimentByEngine,
  TopicRow
} from '@/lib/types';

interface Overview {
  tenant: string;
  visibilityKpis: KpiSlot[];
  mentionKpis: KpiSlot[];
  enginePerformance: EnginePerformance[];
  engineMetrics: EngineMetricRow[];
  keywordOptimization: KeywordOptimization[];
  sentimentByEngine: SentimentByEngine[];
  mentionTrend: MentionTrendPoint[];
  overallSentiment: { positive: number; neutral: number; negative: number };
  liveFeed: LiveFeedItem[];
  topicRows: TopicRow[];
  aiInsightBanner: { message: string };
}

export default function DashboardPage() {
  const [d, setD] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/dashboard/overview', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (j.ok && j.data) setD(j.data as Overview);
        else setErr(j.error ?? '데이터를 불러오지 못했습니다.');
      })
      .catch((e) => alive && setErr(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  const handlePdf = () => {
    showToast('PDF 인쇄 다이얼로그 — "PDF로 저장" 선택', { kind: 'info', ms: 3000 });
    setTimeout(() => printCurrentPage(), 280);
  };

  return (
    <>
      <Header
        title="AI 인용 현황 대시보드"
        subtitle={
          d
            ? `${d.tenant} · ChatGPT·Claude·Gemini가 실제로 인용한 데이터 (실측)`
            : 'AI 검색엔진 인용 실측 데이터를 불러오는 중…'
        }
        tabs={[{ label: 'AI 인용 현황', active: true }]}
        actionLabel="PDF 다운로드"
        onAction={handlePdf}
      />

      <div className="space-y-6 px-8 py-6">
        {err && (
          <div className="rounded-xl border border-status-danger/30 bg-status-danger/5 px-5 py-4 text-sm text-status-danger">
            데이터 로드 실패: {err}
          </div>
        )}
        {!d && !err && (
          <div className="px-1 py-12 text-sm text-ink-soft">실측 인용 데이터를 불러오는 중…</div>
        )}
        {d && (
          <>
            <InsightBanner message={d.aiInsightBanner.message} />

            <section className="space-y-2">
              <div className="section-subtle">GEO 가시성 지표 (실측)</div>
              <KpiGrid slots={d.visibilityKpis} />
            </section>

            <section className="space-y-2">
              <div className="section-subtle">AI 멘션 지표 (실측)</div>
              <KpiGrid slots={d.mentionKpis} />
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-1">
                <EnginePerformanceBars rows={d.enginePerformance} metrics={d.engineMetrics} />
                <KeywordOptimizationTable rows={d.keywordOptimization} />
              </div>
              <div className="space-y-6 lg:col-span-1">
                <SentimentByEngineChart rows={d.sentimentByEngine} />
                <MentionTrendChart points={d.mentionTrend} />
                <OverallSentimentBars
                  positive={d.overallSentiment.positive}
                  neutral={d.overallSentiment.neutral}
                  negative={d.overallSentiment.negative}
                />
              </div>
              <div className="lg:col-span-1">
                <LiveFeedPanel items={d.liveFeed} />
              </div>
            </div>

            <TopicsTable rows={d.topicRows} />
          </>
        )}
      </div>
    </>
  );
}
