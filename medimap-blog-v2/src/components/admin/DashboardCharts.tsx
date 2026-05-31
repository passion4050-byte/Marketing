/**
 * Round 37 H (2026-05-31) — 운영 대시보드 차트 3개.
 *
 * 1. 메디맵 AI 인용 점유율(T1 share) 추이 — 라인 차트 (30일)
 *    "메디맵 자체 도메인이 AI 응답에 인용되는 비율" — SaaS 직접 효과 검증.
 *
 * 2. 5-tier 점유율 추이 — stacked area (30일)
 *    T1(메디맵) / T3(권위) / T4(플랫폼) / T5(외부·경쟁) / NOISE.
 *    시장 점유율 변화 한눈에. 메디맵 T1 증가 + T5 감소가 가치 증명.
 *
 * 3. 클라이언트별 AI 인용 ranking — 가로 막대 (Top 5)
 *    어느 클라이언트의 키워드에서 가장 많이 인용되는지 — 영업 우선순위 결정.
 */
'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp, BarChart3, Users, Target, AlertCircle } from 'lucide-react';

export type TierTrendPoint = {
  date: string;       // 'MM-DD'
  t1: number;
  t3: number;
  t4: number;
  t5: number;
  noise: number;
  total: number;
  t1_share: number;   // 0~1
};

export type ClientRankingItem = {
  tenant_name: string;
  total: number;
  t1: number;          // 메디맵 인용 (좋음)
  t5: number;          // 경쟁사 인용 (나쁨)
};

export type KeywordGroundingItem = {
  keyword: string;
  tenant_name: string;
  queries: number;     // 측정 시도 수
  grounded: number;    // grounding (source_domains 있는) 응답 수
  rate: number;        // 0~1
};

export type NewDomainItem = {
  domain: string;
  tier: string;
  first_seen: string;  // 'MM-DD'
  occurrences: number; // 7일 내 등장 횟수
};

const TIER_COLORS = {
  t1: '#1B68FF',      // 메디맵 블루
  t3: '#15CBA8',      // 권위 — 민트
  t4: '#A855F7',      // 플랫폼 — 퍼플
  t5: '#F59E0B',      // 외부/경쟁 — 앰버
  noise: '#94A3B8',   // noise — 회색
};

export function DashboardCharts({
  tierTrend,
  clientRanking,
  keywordGrounding = [],
  newDomains = [],
}: {
  tierTrend: TierTrendPoint[];
  clientRanking: ClientRankingItem[];
  keywordGrounding?: KeywordGroundingItem[];
  newDomains?: NewDomainItem[];
}) {
  const noData = tierTrend.length === 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 차트 1: 메디맵 T1 share 추이 */}
      <section className="card">
        <header className="border-b border-border px-4 py-3 md:px-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <TrendingUp className="h-4 w-4 text-brand" />
            메디맵 AI 인용 점유율 추이 (30일)
          </h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            전체 인용 sources 중 메디맵 자체 도메인 비율 (T1 share) — SaaS 누적 효과 검증
          </div>
        </header>
        <div className="p-2 md:p-4">
          {noData ? (
            <EmptyChart message="아직 측정 데이터 없음 — 매일 22:00 UTC cron 후 누적" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={tierTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  formatter={(v: number, name: string) => {
                    if (name === '메디맵 share') return `${Math.round(v * 100)}%`;
                    return v;
                  }}
                  labelFormatter={(d) => `${d}`}
                />
                <Line
                  type="monotone"
                  dataKey="t1_share"
                  name="메디맵 share"
                  stroke={TIER_COLORS.t1}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* 차트 2: 5-tier stacked area */}
      <section className="card">
        <header className="border-b border-border px-4 py-3 md:px-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <BarChart3 className="h-4 w-4 text-brand" />
            5-tier 점유율 추이 (30일)
          </h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            메디맵(T1) · 권위(T3) · 플랫폼(T4) · 외부/경쟁(T5) · noise 일자별 stacked.
            <span className="ml-1 text-brand">T1 ↑ + T5 ↓</span> 가 가치 증명
          </div>
        </header>
        <div className="p-2 md:p-4">
          {noData ? (
            <EmptyChart message="아직 측정 데이터 없음" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={tierTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="t1"
                  name="메디맵 T1"
                  stackId="a"
                  stroke={TIER_COLORS.t1}
                  fill={TIER_COLORS.t1}
                  fillOpacity={0.7}
                />
                <Area
                  type="monotone"
                  dataKey="t3"
                  name="권위 T3"
                  stackId="a"
                  stroke={TIER_COLORS.t3}
                  fill={TIER_COLORS.t3}
                  fillOpacity={0.7}
                />
                <Area
                  type="monotone"
                  dataKey="t4"
                  name="플랫폼 T4"
                  stackId="a"
                  stroke={TIER_COLORS.t4}
                  fill={TIER_COLORS.t4}
                  fillOpacity={0.7}
                />
                <Area
                  type="monotone"
                  dataKey="t5"
                  name="외부/경쟁 T5"
                  stackId="a"
                  stroke={TIER_COLORS.t5}
                  fill={TIER_COLORS.t5}
                  fillOpacity={0.7}
                />
                <Area
                  type="monotone"
                  dataKey="noise"
                  name="NOISE"
                  stackId="a"
                  stroke={TIER_COLORS.noise}
                  fill={TIER_COLORS.noise}
                  fillOpacity={0.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* 차트 3: 클라이언트별 인용 ranking */}
      <section className="card">
        <header className="border-b border-border px-4 py-3 md:px-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Users className="h-4 w-4 text-brand" />
            클라이언트별 AI 인용 ranking (Top 5)
          </h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            최근 30일 클라이언트 키워드 측정에서 발견된 총 인용 source 수 — 영업 우선순위
          </div>
        </header>
        <div className="p-2 md:p-4">
          {clientRanking.length === 0 ? (
            <EmptyChart message="아직 측정 데이터 없음" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, clientRanking.length * 50)}>
              <BarChart
                data={clientRanking}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="tenant_name"
                  tick={{ fontSize: 11 }}
                  width={110}
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" name="총 인용 수" fill={TIER_COLORS.t4} radius={[0, 4, 4, 0]}>
                  {clientRanking.map((entry, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={entry.t1 > 0 ? TIER_COLORS.t1 : TIER_COLORS.t4}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {clientRanking.length > 0 && (
            <div className="mt-2 text-[10px] text-ink-faint">
              💡 색상: <span className="font-semibold" style={{ color: TIER_COLORS.t1 }}>파란색</span> = 메디맵 T1 인용 있음 / <span style={{ color: TIER_COLORS.t4 }}>보라색</span> = 외부 인용만
            </div>
          )}
        </div>
      </section>

      {/* 차트 4: Top 키워드 grounding rate */}
      <section className="card">
        <header className="border-b border-border px-4 py-3 md:px-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Target className="h-4 w-4 text-brand" />
            Top 키워드 grounding rate (30일)
          </h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            "이 키워드 측정 시 AI가 출처 URL을 명시하는 비율" — 콘텐츠 우선순위 결정.
            <span className="ml-1 text-brand">낮은 rate</span> = 콘텐츠 보강 기회
          </div>
        </header>
        <div className="p-2 md:p-4">
          {keywordGrounding.length === 0 ? (
            <EmptyChart message="아직 측정 데이터 없음" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, keywordGrounding.length * 36)}>
              <BarChart
                data={keywordGrounding}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  type="number"
                  domain={[0, 1]}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                />
                <YAxis
                  type="category"
                  dataKey="keyword"
                  tick={{ fontSize: 11 }}
                  width={120}
                />
                <Tooltip
                  formatter={(v: number) => `${Math.round(v * 100)}%`}
                  labelFormatter={(k, payload) => {
                    const item = payload?.[0]?.payload as KeywordGroundingItem | undefined;
                    return item ? `${k} (${item.tenant_name})` : k;
                  }}
                />
                <Bar dataKey="rate" name="grounding rate" fill={TIER_COLORS.t3} radius={[0, 4, 4, 0]}>
                  {keywordGrounding.map((entry, i) => (
                    <Cell
                      key={`kw-cell-${i}`}
                      fill={
                        entry.rate >= 0.5
                          ? TIER_COLORS.t3       // 50%+ 권위 색
                          : entry.rate >= 0.2
                            ? TIER_COLORS.t4    // 20~50% 플랫폼 색
                            : TIER_COLORS.t5    // 20% 미만 경고 색 (보강 필요)
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* 차트 5: 신규 T5 도메인 알림 (최근 7일) */}
      <section className="card">
        <header className="border-b border-border px-4 py-3 md:px-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <AlertCircle className="h-4 w-4 text-status-warning" />
            신규 등장 도메인 (최근 7일)
          </h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            지난 7일에 처음 인용된 외부 도메인 — 시장 변화 / 신규 경쟁사 감지
          </div>
        </header>
        <div className="p-2 md:p-4">
          {newDomains.length === 0 ? (
            <EmptyChart message="신규 도메인 없음 — 시장 안정" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">도메인</th>
                    <th className="px-3 py-2 text-left">tier</th>
                    <th className="px-3 py-2 text-right">첫 등장</th>
                    <th className="px-3 py-2 text-right">등장 횟수</th>
                    <th className="px-3 py-2 text-center">분류 등록</th>
                  </tr>
                </thead>
                <tbody>
                  {newDomains.map((d) => (
                    <tr key={d.domain} className="border-t border-border">
                      <td className="px-3 py-2 font-mono">{d.domain}</td>
                      <td className="px-3 py-2">
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                          style={{
                            backgroundColor:
                              d.tier === 'T3' ? TIER_COLORS.t3
                              : d.tier === 'T4' ? TIER_COLORS.t4
                              : d.tier === 'NOISE' ? TIER_COLORS.noise
                              : TIER_COLORS.t5,
                          }}
                        >
                          {d.tier}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-ink-soft">{d.first_seen}</td>
                      <td className="px-3 py-2 text-right font-semibold text-ink">{d.occurrences}</td>
                      <td className="px-3 py-2 text-center">
                        <a
                          href="/admin/domain-classifications"
                          className="text-[10px] text-brand hover:underline"
                        >
                          분류 →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 text-[10px] text-ink-faint">
                💡 신규 T5 도메인은 default 분류 — 운영자가 도메인 분류 사전에서 T3/T4/NOISE 로 명시 권장
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-32 items-center justify-center text-[12px] text-ink-muted">
      {message}
    </div>
  );
}
