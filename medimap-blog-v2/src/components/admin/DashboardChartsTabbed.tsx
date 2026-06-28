/**
 * Round 93 (2026-06-28) — 분석 차트 3개 탭 통합.
 *
 * 사용자 요구: "탭 형태로 한 컨테이너에서 보는게 관리하는게 좋을 것 같고"
 * - 5-tier 점유율 추이
 * - 클라이언트별 AI 인용 ranking
 * - 키워드 grounding rate
 *
 * 신규 컴포넌트로 안전하게 분리 (기존 DashboardCharts 는 신규 도메인만 렌더).
 */
'use client';

import { useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { BarChart3, Users, Target } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { TierTrendPoint, ClientRankingItem, KeywordGroundingItem } from './DashboardCharts';

const TIER_COLORS = {
  t1: '#1B68FF', t3: '#15CBA8', t4: '#A855F7', t5: '#F59E0B', noise: '#94A3B8',
};

type Tab = 'tier' | 'ranking' | 'grounding';
const TAB_META: Record<Tab, { label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = {
  tier: { label: '5-tier 점유율 추이', icon: BarChart3, desc: '메디맵(T1) ↑ + 외부(T5) ↓ 가 가치 증명' },
  ranking: { label: '클라이언트 ranking', icon: Users, desc: 'T1 vs 외부 — 영업 성과 비중' },
  grounding: { label: '키워드 grounding', icon: Target, desc: 'AI 가 출처로 명시한 비율' },
};

interface Props {
  tierTrend: TierTrendPoint[];
  clientRanking: ClientRankingItem[];
  keywordGrounding: KeywordGroundingItem[];
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-ink-muted">{message}</div>
  );
}

export function DashboardChartsTabbed({ tierTrend, clientRanking, keywordGrounding }: Props) {
  const [tab, setTab] = useState<Tab>('ranking');
  const noData = tierTrend.length === 0 && clientRanking.length === 0 && keywordGrounding.length === 0;

  if (noData) {
    return (
      <section className="card">
        <header className="border-b border-border px-4 py-3 md:px-5">
          <h2 className="text-sm font-semibold text-ink">분석 차트</h2>
        </header>
        <EmptyChart message="아직 측정 데이터 없음 — 매일 KST 07:00 cron 후 누적" />
      </section>
    );
  }

  return (
    <section className="card overflow-hidden">
      <header className="border-b border-border bg-surface-subtle/40 px-4 py-3 md:px-5">
        {/* 탭 헤더 */}
        <div className="mb-3 flex items-center gap-1.5 overflow-x-auto">
          {(Object.keys(TAB_META) as Tab[]).map((t) => {
            const meta = TAB_META[t];
            const Icon = meta.icon;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                  tab === t
                    ? 'border-brand bg-brand text-white shadow-sm'
                    : 'border-border bg-white text-ink-soft hover:bg-surface-subtle'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-ink-muted">
          {TAB_META[tab].desc}
        </div>
      </header>

      <div className="p-3 md:p-5">
        {/* 5-tier stacked area */}
        {tab === 'tier' && (
          tierTrend.length === 0 ? <EmptyChart message="측정 데이터 없음" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={tierTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="t1" name="메디맵 T1" stackId="a" stroke={TIER_COLORS.t1} fill={TIER_COLORS.t1} fillOpacity={0.7} />
                <Area type="monotone" dataKey="t3" name="권위 T3" stackId="a" stroke={TIER_COLORS.t3} fill={TIER_COLORS.t3} fillOpacity={0.7} />
                <Area type="monotone" dataKey="t4" name="플랫폼 T4" stackId="a" stroke={TIER_COLORS.t4} fill={TIER_COLORS.t4} fillOpacity={0.7} />
                <Area type="monotone" dataKey="t5" name="외부/경쟁 T5" stackId="a" stroke={TIER_COLORS.t5} fill={TIER_COLORS.t5} fillOpacity={0.7} />
                <Area type="monotone" dataKey="noise" name="NOISE" stackId="a" stroke={TIER_COLORS.noise} fill={TIER_COLORS.noise} fillOpacity={0.5} />
              </AreaChart>
            </ResponsiveContainer>
          )
        )}

        {/* 클라이언트 ranking */}
        {tab === 'ranking' && (
          clientRanking.length === 0 ? <EmptyChart message="측정 데이터 없음" /> : (
            <ResponsiveContainer width="100%" height={Math.max(200, clientRanking.length * 50)}>
              <BarChart
                data={clientRanking.map((c) => ({ ...c, other: Math.max(0, c.total - c.t1 - c.t5) }))}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="tenant_name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="t1" name="메디맵 T1" stackId="r" fill={TIER_COLORS.t1} />
                <Bar dataKey="other" name="권위/플랫폼" stackId="r" fill={TIER_COLORS.t3} />
                <Bar dataKey="t5" name="외부/경쟁 T5" stackId="r" fill={TIER_COLORS.t5} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )
        )}

        {/* 키워드 grounding */}
        {tab === 'grounding' && (
          keywordGrounding.length === 0 ? <EmptyChart message="측정 데이터 없음" /> : (
            <ResponsiveContainer width="100%" height={Math.max(220, keywordGrounding.length * 32)}>
              <BarChart
                data={keywordGrounding}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                <YAxis type="category" dataKey="keyword" tick={{ fontSize: 11 }} width={120} />
                <Tooltip
                  formatter={(v: number) => `${Math.round(v * 100)}%`}
                  labelFormatter={(k, payload) => {
                    const item = payload?.[0]?.payload as KeywordGroundingItem | undefined;
                    return item ? `${k} (${item.tenant_name})` : k;
                  }}
                />
                <Bar dataKey="rate" name="grounding rate" radius={[0, 4, 4, 0]}>
                  {keywordGrounding.map((k, i) => {
                    const color =
                      k.rate >= 0.5 ? TIER_COLORS.t3 :
                      k.rate >= 0.2 ? TIER_COLORS.t4 : TIER_COLORS.t5;
                    return <Cell key={i} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        )}
      </div>

      {/* 색상 범례 (tab 별) */}
      <div className="border-t border-border bg-surface-subtle/30 px-4 py-2 text-[10px] text-ink-muted md:px-5">
        {tab === 'tier' && (
          <span>
            <span className="font-semibold" style={{ color: TIER_COLORS.t1 }}>메디맵</span> ↑ +{' '}
            <span style={{ color: TIER_COLORS.t5 }}>외부</span> ↓ = 시장 점유 증가
          </span>
        )}
        {tab === 'ranking' && (
          <span>
            <span className="font-semibold" style={{ color: TIER_COLORS.t1 }}>메디맵 T1</span> 비중이 영업 성과 ·{' '}
            <span style={{ color: TIER_COLORS.t5 }}>외부 T5</span> 우세 = 영업 보강 필요
          </span>
        )}
        {tab === 'grounding' && (
          <span>
            <span style={{ color: TIER_COLORS.t3 }}>50%+ 안정</span> ·{' '}
            <span style={{ color: TIER_COLORS.t4 }}>20~50% 보강 가능</span> ·{' '}
            <span style={{ color: TIER_COLORS.t5 }}>20% 미만 시급</span>
          </span>
        )}
      </div>
    </section>
  );
}
