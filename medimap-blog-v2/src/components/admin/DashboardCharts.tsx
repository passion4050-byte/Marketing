/**
 * Round 37 H (2026-05-31) — 운영 대시보드 차트 3개.
 *
 * 1. 위서클 AI 인용 점유율(T1 share) 추이 — 라인 차트 (30일)
 *    "위서클 자체 도메인이 AI 응답에 인용되는 비율" — SaaS 직접 효과 검증.
 *
 * 2. 5-tier 점유율 추이 — stacked area (30일)
 *    T1(위서클) / T3(권위) / T4(플랫폼) / T5(외부·경쟁) / NOISE.
 *    시장 점유율 변화 한눈에. 위서클 T1 증가 + T5 감소가 가치 증명.
 *
 * 3. 클라이언트별 AI 인용 ranking — 가로 막대 (Top 5)
 *    어느 클라이언트의 키워드에서 가장 많이 인용되는지 — 영업 우선순위 결정.
 */
'use client';

import { useState } from 'react';
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
import { AutoClassifyButton } from './AutoClassifyButton';
import { cn } from '@/lib/cn';

// Round 87 (2026-06-28) — 차트 3개 탭 통합.
// 사용자 요구: "탭 형태로 한 컨테이너에서 보는게 관리하는게 좋을 것 같고"
type AnalysisTab = 'tier' | 'ranking' | 'grounding';
const TAB_META: Record<AnalysisTab, { label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = {
  tier: { label: '5-tier 점유율 추이', icon: BarChart3, desc: '시장 점유율 변화 (T1↑ T5↓ 가 가치 증명)' },
  ranking: { label: '클라이언트별 ranking', icon: Users, desc: '클라이언트 키워드별 위서클 vs 외부 비중' },
  grounding: { label: '키워드 grounding rate', icon: Target, desc: '어느 키워드가 AI 출처로 인식되는지' },
};

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
  t1: number;          // 위서클 인용 (좋음)
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
  sample_urls?: string[];     // Round 39 — 인용된 세부 URL (어떤 콘텐츠 때문인지)
  keywords?: string[];        // Round 39 — 등장한 키워드 (어느 검색에서)
  tenants?: string[];         // Round 39 — 어느 클라이언트 측정에서
};

// Round 124-B (2026-07-04) — 차트 팔레트 차분화 (ink 모노톤 + 민트 단일 액센트).
//   기존 블루/퍼플/앰버 5색이 대시보드 정신사나움의 주범 → 위서클(ink 앵커)과
//   권위(민트)만 유채색, 나머지는 회색 단계로 후퇴.
const TIER_COLORS = {
  // Round 124-C — 조화 팔레트: 자사=민트(아이덴티티), 권위=뮤트 골드, 나머지 slate 단계
  t1: '#15B8A6',      // 위서클 — 민트
  t3: '#D9A441',      // 권위 — 뮤트 골드
  t4: '#64748B',      // 플랫폼 — slate
  t5: '#94A3B8',      // 외부/경쟁 — 연slate
  noise: '#E2E8F0',   // noise — 최후경
};

export function DashboardCharts({
  tierTrend,
  clientRanking,
  keywordGrounding = [],
  newDomains = [],
  showTierAndRankingCharts = true,
}: {
  tierTrend: TierTrendPoint[];
  clientRanking: ClientRankingItem[];
  keywordGrounding?: KeywordGroundingItem[];
  newDomains?: NewDomainItem[];
  showTierAndRankingCharts?: boolean;  // Round 93 — false 면 신규도메인만 (탭 컴포넌트가 차트 담당)
}) {
  const noData = tierTrend.length === 0;
  // Round 87 — 3차트 탭 활성화. 기본은 가장 임팩트 큰 클라이언트 ranking.
  const [tab, setTab] = useState<AnalysisTab>('ranking');

  // 인용 0 키워드 자동 highlight (drill-down)
  const zeroGroundingKeywords = keywordGrounding.filter(
    (k) => k.rate === 0 || (k.queries > 0 && k.grounded === 0)
  );
  const lowGroundingKeywords = keywordGrounding.filter(
    (k) => k.rate > 0 && k.rate < 0.2
  );
  // T5 (경쟁사) 우세 클라이언트 — 영업 보강 우선순위
  const t5DominantClients = clientRanking.filter((c) => c.total > 0 && c.t5 > c.t1);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Round 92 — 차트 1 (위서클 share 추이) 제거.
          medimap-blog 도메인 인용 0건 상태라 차트가 비어있어 화면 낭비.
          AI 시장 점유 진단 위젯이 같은 정보를 더 풍부하게 표시. */}

      {/* Round 87 — drill-down 권고 배너 (3차트 위 공통) */}
      {showTierAndRankingCharts && (zeroGroundingKeywords.length > 0 || t5DominantClients.length > 0) && (
        <section className="card border-border-strong bg-surface-subtle/60 px-4 py-3 text-[11px] text-ink-soft md:px-5">
          <div className="font-semibold text-ink">💡 차트 액션 권고</div>
          <div className="mt-1">
            {zeroGroundingKeywords.length > 0 && (
              <span>
                위서클 인용 0인 키워드 <strong>{zeroGroundingKeywords.length}개</strong>
                {zeroGroundingKeywords.length > 0 && ` (${zeroGroundingKeywords.slice(0, 2).map((k) => k.keyword).join(', ')}${zeroGroundingKeywords.length > 2 ? ' 외' : ''})`}
                — 콘텐츠 추가 발행 권장.
              </span>
            )}
            {t5DominantClients.length > 0 && (
              <span className="ml-2">
                외부 우세 클라이언트 <strong>{t5DominantClients.length}곳</strong> — 영업 보강 필요.
              </span>
            )}
          </div>
        </section>
      )}

      {/* 차트 2: 5-tier stacked area */}
      {showTierAndRankingCharts && (
      <section className="card">
        <header className="border-b border-border px-4 py-3 md:px-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <BarChart3 className="h-4 w-4 text-ink-soft" />
            5-tier 점유율 추이 (30일)
          </h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            위서클(T1) · 권위(T3) · 플랫폼(T4) · 외부/경쟁(T5) · noise 일자별 stacked.
            <span className="ml-1 text-ink-soft">T1 ↑ + T5 ↓</span> 가 가치 증명
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
                  name="위서클 T1"
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
      )}

      {/* 차트 3: 클라이언트별 인용 ranking — T1/외부 stacked */}
      {showTierAndRankingCharts && (
      <section className="card">
        <header className="border-b border-border px-4 py-3 md:px-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Users className="h-4 w-4 text-ink-soft" />
            클라이언트별 AI 인용 ranking (Top 5) — T1 vs 외부 stacked
          </h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            클라이언트 키워드 측정에서 발견된 인용 — <span style={{ color: TIER_COLORS.t1 }}>위서클 T1</span> + <span style={{ color: TIER_COLORS.t5 }}>외부(T5)</span> 비율로 분리. T1 비중이 영업 성과
          </div>
        </header>
        <div className="p-2 md:p-4">
          {clientRanking.length === 0 ? (
            <EmptyChart message="아직 측정 데이터 없음" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, clientRanking.length * 50)}>
              <BarChart
                data={clientRanking.map((c) => ({
                  ...c,
                  other: Math.max(0, c.total - c.t1 - c.t5),
                }))}
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
                <Bar dataKey="t1" name="위서클 T1" stackId="r" fill={TIER_COLORS.t1} />
                <Bar dataKey="other" name="권위/플랫폼" stackId="r" fill={TIER_COLORS.t3} />
                <Bar dataKey="t5" name="외부/경쟁 T5" stackId="r" fill={TIER_COLORS.t5} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {clientRanking.length > 0 && (
            <div className="mt-2 text-[10px] text-ink-faint">
              💡 막대 안 색상 비율: <span className="font-semibold" style={{ color: TIER_COLORS.t1 }}>위서클 인용(좋음)</span> /
              <span style={{ color: TIER_COLORS.t3 }}>권위·플랫폼(중립)</span> /
              <span style={{ color: TIER_COLORS.t5 }}>외부 경쟁(보강 기회)</span>
            </div>
          )}
        </div>
      </section>
      )}

      {/* 차트 4: Top 키워드 grounding rate */}
      {showTierAndRankingCharts && (
      <section className="card">
        <header className="border-b border-border px-4 py-3 md:px-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Target className="h-4 w-4 text-ink-soft" />
            Top 키워드 grounding rate
          </h2>
          <div className="mt-1 space-y-1 text-[11px] text-ink-muted">
            <div>
              <strong>이 차트의 역할</strong> — 키워드를 AI 에 query 했을 때 AI가 "출처 URL을 명시한 답변" 을 주는 비율. 즉 그 키워드가 AI 의 정보 출처 grounding 으로 인식되는 정도.
            </div>
            <div>
              <strong>해석</strong>: <span style={{ color: TIER_COLORS.t3 }}>50%+ (민트)</span> = 안정적 grounding, 콘텐츠 충분 / <span style={{ color: TIER_COLORS.t4 }}>20~50% (퍼플)</span> = 보강 가능 / <span style={{ color: TIER_COLORS.t5 }}>20% 미만 (앰버)</span> = <strong>콘텐츠 보강 시급</strong>
            </div>
            <div>
              <strong>활용</strong>: 낮은 rate 키워드 → 위서클 콘텐츠 가이드 (learned_insights 적용) 로 새 글 생성 우선순위
            </div>
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
      )}

      {/* 차트 5: 신규 등장 도메인 (Round 39 — 세부 URL + 키워드 + 클라이언트 컨텍스트) */}
      <section className="card">
        <header className="border-b border-border px-4 py-3 md:px-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <AlertCircle className="h-4 w-4 text-ink-muted" />
              신규 등장 도메인 (최근 7일) — 세부 인사이트
            </h2>
            {/* Round 42 A — 자동 분류 일괄 등록 버튼 */}
            {newDomains.length > 0 && (
              <AutoClassifyButton
                candidateDomains={newDomains.map((d) => d.domain)}
                label={`자동 분류 (${newDomains.length}건)`}
              />
            )}
          </div>
          <div className="mt-1 text-[11px] text-ink-muted">
            지난 7일 첫 인용 외부 도메인 + <strong>어떤 키워드/콘텐츠</strong>로 등장했는지. 시장 변화 / 신규 경쟁사 / 인사이트 출처 감지.
            <span className="ml-1 text-ink-soft">자동 분류</span> 버튼으로 rule-based 매칭 도메인 일괄 등록 가능
          </div>
        </header>
        <div className="p-2 md:p-4">
          {newDomains.length === 0 ? (
            <EmptyChart message="신규 도메인 없음 — 시장 안정 또는 측정 데이터 부족" />
          ) : (
            <div className="space-y-2">
              {newDomains.map((d) => (
                <details key={d.domain} className="rounded border border-border">
                  <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[12px] hover:bg-surface-subtle">
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
                    <span className="flex-1 font-mono">{d.domain}</span>
                    <span className="text-[10px] text-ink-muted">첫 등장 {d.first_seen}</span>
                    <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-ink-soft">
                      ×{d.occurrences}
                    </span>
                  </summary>
                  <div className="space-y-2 border-t border-border bg-surface-subtle px-3 py-2 text-[11px]">
                    {d.keywords && d.keywords.length > 0 && (
                      <div>
                        <span className="font-semibold text-ink-muted">등장 키워드:</span>{' '}
                        {d.keywords.map((k, i) => (
                          <span key={i} className="ml-1 inline-block rounded bg-surface-base px-1.5 py-0.5 font-mono">
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                    {d.tenants && d.tenants.length > 0 && (
                      <div>
                        <span className="font-semibold text-ink-muted">측정 클라이언트:</span>{' '}
                        <span className="text-ink-soft">{d.tenants.join(', ')}</span>
                      </div>
                    )}
                    {d.sample_urls && d.sample_urls.length > 0 && (
                      <div>
                        <span className="font-semibold text-ink-muted">실제 인용된 URL (어떤 콘텐츠 때문에):</span>
                        <ul className="mt-1 space-y-0.5">
                          {d.sample_urls.map((url, i) => (
                            <li key={i}>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-ink underline decoration-dotted hover:text-ink"
                              >
                                {decodeURIComponent(url).slice(0, 110)}
                                {url.length > 110 && '…'}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex justify-end pt-1">
                      <a
                        href={`/admin/domain-classifications`}
                        className="text-[10px] text-ink-soft hover:underline"
                      >
                        분류 사전에서 편집 →
                      </a>
                    </div>
                  </div>
                </details>
              ))}
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
