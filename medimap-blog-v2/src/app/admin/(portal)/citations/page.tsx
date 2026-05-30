/**
 * Round 32 phase C (2026-05-30) — AI 인용 분석 페이지 + 클라이언트 selector + 세부 데이터.
 *
 * 구조:
 *   상단: 클라이언트 selector (탭/드롭다운) + 새로고침
 *   KPI 카드 4개 — 선택된 클라이언트 기준
 *   차트 4개:
 *     1. 30일 Mention Trend (line)
 *     2. Source 분류 도넛 (T1~T5)
 *     3. Top 10 Source Domain (bar)
 *     4. 메디맵 Source Share Trend (line)
 *   세부 데이터:
 *     - 키워드별 인용 분석 (mention/source/T1/T2/T5 카운트)
 *     - 경쟁사/플랫폼 도메인 분석 (어떤 키워드에서 인용됐는지)
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronDown, ChevronRight, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';

type TenantOption = { id: number; name: string; is_self: boolean };

type CitationsData = {
  tenants: TenantOption[];
  selected_tenant: TenantOption | null;
  mention_trend: Array<{ date: string; count: number }>;
  source_tier: { T1: number; T2: number; T3: number; T4: number; T5: number; total: number };
  top_domains: Array<{ domain: string; count: number; tier: string; keywords: string[] }>;
  medimap_share_trend: Array<{ date: string; share_pct: number }>;
  keyword_breakdown: Array<{
    keyword: string;
    source_count: number;
    t1: number;
    t2: number;
    t5: number;
    mention_count: number;
  }>;
  competitor_breakdown: Array<{
    domain: string;
    tier: string;
    count: number;
    keywords: string[];
    urls: string[];
  }>;
};

const TIER_LABELS: Record<string, { label: string; color: string; short: string }> = {
  T1: { label: '메디맵 자체 ⭐', color: '#1B68FF', short: '메디맵' },
  T2: { label: '클라이언트 자체', color: '#15B8A6', short: '클라이언트' },
  T3: { label: '권위/공식', color: '#F59E0B', short: '권위' },
  T4: { label: '의료 플랫폼', color: '#A855F7', short: '플랫폼' },
  T5: { label: '기타 (경쟁사)', color: '#94A3B8', short: '경쟁사' },
};

export default function CitationsPage() {
  const [tenantId, setTenantId] = useState<number | null>(null); // null = 전체
  const [data, setData] = useState<CitationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 도메인 expand state (URL 목록 펼치기)
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = tenantId
        ? `/api/admin/citations?tenantId=${tenantId}`
        : '/api/admin/citations';
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'fetch failed');
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const totalMentions = useMemo(
    () => (data ? data.mention_trend.reduce((s, d) => s + d.count, 0) : 0),
    [data]
  );
  const totalSources = data?.source_tier.total ?? 0;
  const medimapShare =
    totalSources > 0 && data
      ? Math.round((data.source_tier.T1 / totalSources) * 1000) / 10
      : 0;
  const clientShare =
    totalSources > 0 && data
      ? Math.round((data.source_tier.T2 / totalSources) * 1000) / 10
      : 0;

  const tierPieData = data
    ? (['T1', 'T2', 'T3', 'T4', 'T5'] as const)
        .map((k) => ({
          name: TIER_LABELS[k].label,
          value: data.source_tier[k],
          color: TIER_LABELS[k].color,
        }))
        .filter((d) => d.value > 0)
    : [];

  const tenants = data?.tenants ?? [];
  const selectedName = data?.selected_tenant?.name ?? '전체 클라이언트';

  return (
    <div className="px-8 py-6">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">AI 인용 추적</h1>
        <button onClick={() => void load()} className="btn-secondary text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> 새로고침
        </button>
      </header>

      {/* === 클라이언트 selector === */}
      <section className="card mb-5 p-4">
        <div className="mb-2 text-xs font-semibold text-ink-muted">클라이언트 선택</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTenantId(null)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
              tenantId === null
                ? 'border-brand bg-brand text-white'
                : 'border-border bg-surface-base text-ink-muted hover:border-brand-200'
            )}
          >
            전체 보기
          </button>
          {tenants.map((t) => (
            <button
              key={t.id}
              onClick={() => setTenantId(t.id)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                tenantId === t.id
                  ? 'border-brand bg-brand text-white'
                  : 'border-border bg-surface-base text-ink-muted hover:border-brand-200'
              )}
            >
              {t.name}
              {t.is_self && <span className="ml-1 text-[9px]">⭐</span>}
            </button>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-ink-muted">
          현재 선택: <strong className="text-ink">{selectedName}</strong> · 최근 30일 기준
        </div>
      </section>

      {loading ? (
        <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 데이터 로드 중…
        </div>
      ) : error || !data ? (
        <div className="card border-status-danger/30 bg-status-dangerSoft/30 px-6 py-4 text-sm text-status-danger">
          데이터 로드 실패: {error}
        </div>
      ) : (
        <>
          {/* === KPI 카드 4개 — 의미 명확한 한국어 === */}
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card card-pad">
              <div className="kpi-label">AI 추천 언급</div>
              <div className="mt-2 kpi-value text-brand">{totalMentions}<span className="ml-1 text-base">건</span></div>
              <div className="text-[11px] text-ink-muted">{selectedName} 가 AI 응답에 직접 언급된 횟수 (30일)</div>
            </div>
            <div className="card card-pad">
              <div className="kpi-label">인용 출처 도메인</div>
              <div className="mt-2 kpi-value text-ink">{totalSources}<span className="ml-1 text-base">개</span></div>
              <div className="text-[11px] text-ink-muted">AI 가 정보 출처로 사용한 사이트 총합</div>
            </div>
            <div className="card card-pad border-brand/30">
              <div className="kpi-label">메디맵 콘텐츠 인용률 ⭐</div>
              <div className="mt-2 kpi-value text-brand">{medimapShare}%</div>
              <div className="text-[11px] text-ink-muted">
                {data.source_tier.T1} / {totalSources} — 메디맵이 발행한 글이 AI 출처로 사용됨
              </div>
            </div>
            <div className="card card-pad">
              <div className="kpi-label">병원 홈페이지 노출률</div>
              <div className="mt-2 kpi-value text-accent">{clientShare}%</div>
              <div className="text-[11px] text-ink-muted">
                {data.source_tier.T2} / {totalSources} — 병원 자체 사이트가 AI 출처에 등장
              </div>
            </div>
          </section>

          {/* === 차트 4개 === */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="30일 Mention Trend">
              {totalMentions === 0 ? (
                <EmptyState text="아직 데이터 없음" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.mention_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EBED" />
                    <XAxis dataKey="date" fontSize={10} stroke="#64748B" />
                    <YAxis fontSize={10} stroke="#64748B" allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="Mention" stroke="#1B68FF" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Source 5-Tier 분포">
              {tierPieData.length === 0 ? (
                <EmptyState text="아직 source 데이터 없음" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={tierPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      label={(e: { value: number }) => `${e.value}`}
                      labelLine={false}
                    >
                      {tierPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Top 10 Source Domain">
              {data.top_domains.length === 0 ? (
                <EmptyState text="아직 source 데이터 없음" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.top_domains} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EBED" />
                    <XAxis type="number" fontSize={10} stroke="#64748B" allowDecimals={false} />
                    <YAxis type="category" dataKey="domain" fontSize={10} stroke="#64748B" width={150} />
                    <Tooltip />
                    <Bar dataKey="count" name="Count">
                      {data.top_domains.map((d, i) => (
                        <Cell key={i} fill={TIER_LABELS[d.tier]?.color ?? '#94A3B8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="메디맵 Source Share Trend ⭐" subtitle="(SaaS 직접 ROI)" border="brand">
              {data.medimap_share_trend.every((d) => d.share_pct === 0) ? (
                <div className="flex h-60 flex-col items-center justify-center text-sm text-ink-muted">
                  <div>현재 메디맵 콘텐츠 source share = 0%</div>
                  <div className="mt-1 text-[11px] text-ink-faint">3~6개월 콘텐츠 누적 후 점진 증가 예상</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.medimap_share_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5EBED" />
                    <XAxis dataKey="date" fontSize={10} stroke="#64748B" />
                    <YAxis fontSize={10} stroke="#64748B" tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Line type="monotone" dataKey="share_pct" name="메디맵 share" stroke="#1B68FF" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </section>

          {/* === 세부 데이터 === */}
          <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* 키워드별 분석 */}
            <div className="card">
              <header className="border-b border-border px-5 py-3">
                <h2 className="section-title">키워드별 인용 분석</h2>
                <div className="mt-1 text-[11px] text-ink-muted">
                  {selectedName} 의 키워드별 mention + source 카운트
                </div>
              </header>
              {data.keyword_breakdown.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-ink-muted">
                  아직 측정된 키워드 없음
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">키워드</th>
                        <th className="px-2 py-2 text-right">Mention</th>
                        <th className="px-2 py-2 text-right">Source</th>
                        <th className="px-2 py-2 text-right text-brand">메디맵</th>
                        <th className="px-2 py-2 text-right text-accent">자체</th>
                        <th className="px-2 py-2 text-right text-ink-muted">경쟁</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.keyword_breakdown.map((k, i) => (
                        <tr key={i} className="border-t border-border hover:bg-surface-subtle">
                          <td className="px-3 py-2 font-semibold text-ink">{k.keyword}</td>
                          <td className="px-2 py-2 text-right font-mono">{k.mention_count}</td>
                          <td className="px-2 py-2 text-right font-mono">{k.source_count}</td>
                          <td className="px-2 py-2 text-right font-mono text-brand">{k.t1}</td>
                          <td className="px-2 py-2 text-right font-mono text-accent">{k.t2}</td>
                          <td className="px-2 py-2 text-right font-mono text-ink-muted">{k.t5}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 경쟁사/플랫폼 도메인 분석 — URL drill-down */}
            <div className="card">
              <header className="border-b border-border px-5 py-3">
                <h2 className="section-title">경쟁사/플랫폼 도메인 분석</h2>
                <div className="mt-1 text-[11px] text-ink-muted">
                  AI 가 정보 출처로 사용한 사이트 — <strong>행 클릭</strong>으로 실제 인용 URL 펼치기
                </div>
              </header>
              {data.competitor_breakdown.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-ink-muted">
                  아직 측정된 출처 없음
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      <tr>
                        <th className="w-8 px-2 py-2"></th>
                        <th className="px-3 py-2 text-left">도메인</th>
                        <th className="px-2 py-2 text-left">Tier</th>
                        <th className="px-2 py-2 text-right">횟수</th>
                        <th className="px-3 py-2 text-left">인용된 키워드</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.competitor_breakdown.slice(0, 15).map((c, i) => {
                        const isOpen = expandedDomain === c.domain;
                        return (
                          <>
                            <tr
                              key={`${c.domain}-${i}`}
                              className="cursor-pointer border-t border-border hover:bg-surface-subtle"
                              onClick={() => setExpandedDomain(isOpen ? null : c.domain)}
                            >
                              <td className="px-2 py-2 text-ink-muted">
                                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </td>
                              <td className="px-3 py-2 font-mono text-ink">{c.domain}</td>
                              <td className="px-2 py-2">
                                <span
                                  className="inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                                  style={{
                                    backgroundColor: `${TIER_LABELS[c.tier]?.color}20`,
                                    color: TIER_LABELS[c.tier]?.color ?? '#64748B',
                                  }}
                                >
                                  {TIER_LABELS[c.tier]?.short ?? c.tier}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-right font-mono">{c.count}</td>
                              <td className="px-3 py-2 text-[11px] text-ink-soft line-clamp-1">
                                {c.keywords.join(', ')}
                              </td>
                            </tr>
                            {isOpen && (
                              <tr key={`${c.domain}-expand`} className="bg-brand-50/40">
                                <td colSpan={5} className="px-4 py-3">
                                  <div className="mb-2 text-[11px] font-semibold text-ink-muted">
                                    실제 인용된 URL ({c.urls.length}개) — 클릭하면 새 탭에서 열림
                                  </div>
                                  {c.urls.length === 0 ? (
                                    <div className="text-[11px] text-ink-faint">URL 데이터 없음</div>
                                  ) : (
                                    <ul className="space-y-1.5">
                                      {c.urls.map((url, ui) => (
                                        <li key={ui} className="flex items-start gap-2">
                                          <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-brand" />
                                          <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[11px] text-brand-700 underline decoration-dotted hover:text-brand"
                                          >
                                            {decodeURIComponent(url).slice(0, 110)}
                                            {url.length > 110 && '…'}
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  <div className="mt-2 text-[10px] text-ink-muted">
                                    💡 <strong>학습 포인트</strong> — 위 URL 의 페이지 구조 (제목 패턴, FAQ schema,
                                    글 길이) 를 분석해 메디맵 콘텐츠 가이드에 반영
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  border,
  children,
}: {
  title: string;
  subtitle?: string;
  border?: 'brand';
  children: React.ReactNode;
}) {
  return (
    <div className={cn('card card-pad', border === 'brand' && 'border-brand/30')}>
      <h2 className="section-title mb-3">
        {title}
        {subtitle && <span className="ml-2 text-[11px] font-normal text-ink-muted">{subtitle}</span>}
      </h2>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex h-60 items-center justify-center text-sm text-ink-muted">{text}</div>;
}
