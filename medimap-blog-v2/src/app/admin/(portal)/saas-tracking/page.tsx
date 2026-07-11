/**
 * Round 38 (2026-05-31) — 위서클 SaaS 자체 시장 노출도 페이지.
 *
 * "GEO 최적화", "AEO 컨설팅" 같은 SaaS 카테고리 키워드에서:
 *   - 위서클 자체 도메인이 인용되는 정도 (T1 share)
 *   - 경쟁 SaaS 도메인 자동 발견 ranking
 *   - 키워드별 grounding rate
 *
 * 자사 (/admin/citations) / 경쟁사 (/admin/competitors) 와 별개 — SaaS 자체 메타 측정.
 */
'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Sparkles, Target, TrendingUp, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { useListView, PageBar, SearchBox } from '@/components/admin/ListView';

type ApiResponse = {
  ok: boolean;
  error?: string;
  keywords: Array<{ id: number; text: string; is_active: boolean; last_measured_at: string | null }>;
  mention_count: number;
  t1_count: number;
  competitor_count: number;
  daily_trend: Array<{ date: string; t1: number; total: number; t1_share: number }>;
  competitor_domains: Array<{ domain: string; count: number; urls: string[] }>;
  keyword_grounding: Array<{ keyword: string; queries: number; grounded: number; t1: number; rate: number }>;
  note?: string;
};

export default function SaasTrackingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const groundLv = useListView(data?.keyword_grounding ?? [], {
    size: 15,
    search: (k, q) => k.keyword.toLowerCase().includes(q),
  });
  const domainLv = useListView(data?.competitor_domains ?? [], {
    size: 20,
    search: (c, q) => c.domain.toLowerCase().includes(q),
  });

  useEffect(() => {
    fetch('/api/admin/saas-tracking')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({
        ok: false,
        error: 'fetch failed',
        keywords: [],
        mention_count: 0,
        t1_count: 0,
        competitor_count: 0,
        daily_trend: [],
        competitor_domains: [],
        keyword_grounding: [],
      }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-8">
        <Loader2 className="inline h-5 w-5 animate-spin text-ink-soft" /> 로딩 중...
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <div className="px-4 py-6 md:px-8">
        <div className="rounded border border-status-danger/30 bg-status-dangerSoft/40 px-3 py-2 text-sm text-status-danger">
          <AlertCircle className="mr-1 inline h-4 w-4" />
          {data?.error ?? '데이터 로드 실패'}
        </div>
      </div>
    );
  }

  const t1Share =
    data.mention_count > 0
      ? Math.round((data.t1_count / data.mention_count) * 100)
      : 0;

  return (
    <div className="space-y-5 px-4 py-6 md:px-8">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-ink-soft" />
            GEO 최적화 관리
          </h1>
          <div className="admin-page-desc">
            잠재 고객이 AI 에 "GEO 최적화", "AEO 컨설팅" 등을 검색했을 때 위서클이 얼마나 노출되는지 측정하고, 경쟁 SaaS 도메인을 자동으로 발견합니다.
          </div>
        </div>
      </header>

      {data.note && (
        <div className="rounded border border-status-warning/30 bg-status-warningSoft/30 px-3 py-2 text-[11px] text-status-warning">
          <AlertCircle className="mr-1 inline h-3 w-3" />
          {data.note}
        </div>
      )}

      {/* Round 56 (2026-05-31) — KPI 카드 클릭 시 해당 섹션으로 scroll */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="추적 중인 키워드"
          value={`${data.keywords.length}`}
          suffix="개"
          href="#keyword-grounding"
        />
        <KpiCard
          label="최근 30일 AI 인용"
          value={`${data.mention_count}`}
          suffix="건"
          subtext={data.t1_count > 0 ? `위서클 인용 ${data.t1_count}건` : '위서클 인용 0건'}
          href="#share-trend"
        />
        <KpiCard
          label="위서클 점유율"
          value={`${t1Share}%`}
          highlight={t1Share >= 5}
          subtext="목표 5% 이상"
          href="#share-trend"
        />
        <KpiCard
          label="경쟁 SaaS 발견"
          value={`${data.competitor_domains.length}`}
          suffix="곳"
          href="#competitor-saas"
        />
      </div>

      {/* 차트: 위서클 점유율 추이 */}
      <section id="share-trend" className="card scroll-mt-20">
        <header className="border-b border-border px-4 py-3 md:px-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <TrendingUp className="h-4 w-4 text-ink-soft" />
            위서클 점유율 추이 (최근 30일)
          </h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            AI 가 "GEO/AEO" 카테고리 검색에서 위서클을 인용한 비율 — 콘텐츠 누적 효과 확인
          </div>
        </header>
        <div className="p-2 md:p-4">
          {data.daily_trend.every((d) => d.total === 0) ? (
            <div className="flex h-32 items-center justify-center text-[12px] text-ink-muted">
              아직 측정 데이터가 없습니다 — 매일 22:00 UTC (KST 익일 07시) 자동 수집 후 누적됩니다
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.daily_trend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                />
                <Tooltip formatter={(v: number) => `${Math.round(v * 100)}%`} />
                <Line
                  type="monotone"
                  dataKey="t1_share"
                  name="위서클 share"
                  stroke="#7C3AED"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* 키워드별 grounding rate */}
      <section id="keyword-grounding" className="card scroll-mt-20">
        <header className="border-b border-border px-4 py-3 md:px-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Target className="h-4 w-4 text-ink-soft" />
            SaaS 키워드별 grounding rate
          </h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            각 키워드 측정 시 AI 가 출처 URL 명시하는 비율 + 위서클 T1 카운트
          </div>
        </header>
        {data.keyword_grounding.length > 0 && (
          <div className="px-4 pt-3 md:px-5">
            <SearchBox lv={groundLv} placeholder="키워드 검색" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-3 py-2 text-left">키워드</th>
                <th className="px-3 py-2 text-right">측정 수</th>
                <th className="px-3 py-2 text-right">grounding</th>
                <th className="px-3 py-2 text-right">grounding rate</th>
                <th className="px-3 py-2 text-right">위서클 T1</th>
              </tr>
            </thead>
            <tbody>
              {data.keyword_grounding.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-ink-muted">
                    아직 측정 데이터 없음
                  </td>
                </tr>
              ) : (
                groundLv.view.map((k) => (
                  <tr key={k.keyword} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold">{k.keyword}</td>
                    <td className="px-3 py-2 text-right">{k.queries}</td>
                    <td className="px-3 py-2 text-right">{k.grounded}</td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={
                          k.rate >= 0.5
                            ? 'font-bold text-ink-soft'
                            : k.rate >= 0.2
                              ? 'text-ink'
                              : 'text-status-danger'
                        }
                      >
                        {Math.round(k.rate * 100)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {k.t1 > 0 ? (
                        <span className="rounded bg-surface-muted px-1.5 py-0.5 font-bold text-ink-soft">
                          {k.t1}
                        </span>
                      ) : (
                        <span className="text-ink-faint">0</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {groundLv.total > 0 && (
          <div className="px-4 pb-4 md:px-5">
            <PageBar lv={groundLv} />
          </div>
        )}
      </section>

      {/* 경쟁 SaaS 도메인 ranking */}
      <section id="competitor-saas" className="card scroll-mt-20">
        <header className="border-b border-border px-4 py-3 md:px-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Sparkles className="h-4 w-4 text-ink-soft" />
            경쟁 SaaS 도메인 자동 발견
          </h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            위서클 SaaS 와 같은 카테고리 키워드에서 AI 가 인용한 외부 도메인 — 잠재 경쟁자 / 인사이트 출처
          </div>
        </header>
        {data.competitor_domains.length > 0 && (
          <div className="px-3 pt-3 md:px-4">
            <SearchBox lv={domainLv} placeholder="도메인 검색" />
          </div>
        )}
        <div className="p-2 md:p-4">
          {data.competitor_domains.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-[12px] text-ink-muted">
              경쟁 SaaS 도메인 발견 안 됨 — 위서클이 시장 선점 중이거나 측정 데이터 부족
            </div>
          ) : (
            <ul className="space-y-1.5">
              {domainLv.view.map((c) => {
                const isOpen = expandedDomain === c.domain;
                return (
                  <li key={c.domain} className="rounded border border-border">
                    <button
                      type="button"
                      onClick={() => setExpandedDomain(isOpen ? null : c.domain)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-surface-subtle"
                    >
                      <span className="font-mono text-[12px]">{c.domain}</span>
                      <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-ink-soft">
                        ×{c.count}
                      </span>
                    </button>
                    {isOpen && c.urls.length > 0 && (
                      <div className="border-t border-border bg-surface-subtle px-3 py-2">
                        <ul className="space-y-1">
                          {c.urls.map((url, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-ink-soft" />
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-ink underline decoration-dotted hover:text-ink"
                              >
                                {decodeURIComponent(url).slice(0, 110)}
                                {url.length > 110 && '…'}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {domainLv.total > 0 && (
          <div className="px-3 pb-4 md:px-4">
            <PageBar lv={domainLv} />
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  subtext,
  highlight,
  href,
}: {
  label: string;
  value: string;
  suffix?: string;
  subtext?: string;
  highlight?: boolean;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-1">
        <div className="text-[11px] text-ink-muted">{label}</div>
        {href && <span className="text-[10px] text-ink-faint transition group-hover:text-ink">↓ 자세히</span>}
      </div>
      <div className={`mt-1 text-2xl font-bold ${highlight ? 'text-ink-soft' : 'text-ink'}`}>
        {value}
        {suffix && <span className="ml-1 text-sm font-normal text-ink-muted">{suffix}</span>}
      </div>
      {subtext && <div className="mt-0.5 text-[10px] text-ink-faint">{subtext}</div>}
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        className="card card-pad group block cursor-pointer transition hover:border-border-strong hover:shadow-sm"
      >
        {inner}
      </a>
    );
  }
  return <div className="card card-pad">{inner}</div>;
}
