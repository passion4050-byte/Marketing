/**
 * Round 32 (2026-05-30) — AI 인용 분석 페이지.
 *
 * 5-Tier source 분류 + 차트 4개:
 *   1. Mention trend (line, 30일)
 *   2. Source tier 도넛 — T1(메디맵)/T2(클라이언트)/T3(권위)/T4(플랫폼)/T5(기타)
 *   3. Top 10 domains (bar)
 *   4. 메디맵 source share trend (line, 30일) — T1 share % 점진 증가 (진짜 ROI)
 */
'use client';

import { useEffect, useState } from 'react';
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
import { Loader2, RefreshCw } from 'lucide-react';

type CitationsData = {
  mention_trend: Array<{ date: string; count: number }>;
  source_tier: { T1: number; T2: number; T3: number; T4: number; T5: number; total: number };
  top_domains: Array<{ domain: string; count: number; tier: string }>;
  medimap_share_trend: Array<{ date: string; share_pct: number }>;
};

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  T1: { label: '메디맵 자체 ⭐', color: '#1B68FF' },
  T2: { label: '클라이언트 자체', color: '#15B8A6' },
  T3: { label: '권위/공식', color: '#F59E0B' },
  T4: { label: '의료 플랫폼', color: '#A855F7' },
  T5: { label: '기타 (경쟁사)', color: '#94A3B8' },
};

export default function CitationsPage() {
  const [data, setData] = useState<CitationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/citations', { cache: 'no-store' });
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
  }, []);

  if (loading) {
    return (
      <div className="px-8 py-6">
        <header className="mb-5">
          <h1 className="text-2xl font-bold text-ink">AI 인용 추적</h1>
        </header>
        <div className="card flex items-center justify-center px-6 py-12 text-sm text-ink-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 데이터 로드 중…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-8 py-6">
        <header className="mb-5">
          <h1 className="text-2xl font-bold text-ink">AI 인용 추적</h1>
        </header>
        <div className="card border-status-danger/30 bg-status-dangerSoft/30 px-6 py-4 text-sm text-status-danger">
          데이터 로드 실패: {error}
        </div>
      </div>
    );
  }

  const totalMentions = data.mention_trend.reduce((s, d) => s + d.count, 0);
  const totalSources = data.source_tier.total;
  const medimapShare =
    totalSources > 0 ? Math.round((data.source_tier.T1 / totalSources) * 1000) / 10 : 0;
  const clientShare =
    totalSources > 0 ? Math.round((data.source_tier.T2 / totalSources) * 1000) / 10 : 0;

  const tierPieData = (['T1', 'T2', 'T3', 'T4', 'T5'] as const)
    .map((k) => ({
      name: TIER_LABELS[k].label,
      value: data.source_tier[k],
      color: TIER_LABELS[k].color,
    }))
    .filter((d) => d.value > 0);

  return (
    <div className="px-8 py-6">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">AI 인용 추적</h1>
        <button onClick={() => void load()} className="btn-secondary text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> 새로고침
        </button>
      </header>

      {/* === KPI 카드 4개 === */}
      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card card-pad">
          <div className="kpi-label">30일 mention</div>
          <div className="mt-2 kpi-value text-brand">{totalMentions}</div>
          <div className="text-[11px] text-ink-muted">자사 tenant 가 AI 응답에 언급됨</div>
        </div>
        <div className="card card-pad">
          <div className="kpi-label">30일 source 추적</div>
          <div className="mt-2 kpi-value text-ink">{totalSources}</div>
          <div className="text-[11px] text-ink-muted">총 Gemini citation 도메인 count</div>
        </div>
        <div className="card card-pad border-brand/30">
          <div className="kpi-label">메디맵 source share ⭐</div>
          <div className="mt-2 kpi-value text-brand">{medimapShare}%</div>
          <div className="text-[11px] text-ink-muted">
            {data.source_tier.T1} / {totalSources} — SaaS 직접 효과
          </div>
        </div>
        <div className="card card-pad">
          <div className="kpi-label">클라이언트 자체 share</div>
          <div className="mt-2 kpi-value text-accent">{clientShare}%</div>
          <div className="text-[11px] text-ink-muted">
            {data.source_tier.T2} / {totalSources} — baseline
          </div>
        </div>
      </section>

      {/* === 차트 4개 === */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 1. Mention trend */}
        <div className="card card-pad">
          <h2 className="section-title mb-3">30일 Mention Trend</h2>
          {totalMentions === 0 ? (
            <div className="flex h-60 items-center justify-center text-sm text-ink-muted">
              아직 데이터 없음 — daily cron 누적 후 표시
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.mention_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EBED" />
                <XAxis dataKey="date" fontSize={10} stroke="#64748B" />
                <YAxis fontSize={10} stroke="#64748B" allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Mention"
                  stroke="#1B68FF"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 2. Source tier 도넛 */}
        <div className="card card-pad">
          <h2 className="section-title mb-3">Source 분류 (5-Tier)</h2>
          {tierPieData.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-sm text-ink-muted">
              아직 source 추적 데이터 없음
            </div>
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
                  label={(entry: { value: number }) => `${entry.value}`}
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
        </div>

        {/* 3. Top 10 domains */}
        <div className="card card-pad">
          <h2 className="section-title mb-3">Top 10 Source Domain</h2>
          {data.top_domains.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-sm text-ink-muted">
              아직 source 추적 데이터 없음
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.top_domains} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EBED" />
                <XAxis type="number" fontSize={10} stroke="#64748B" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="domain"
                  fontSize={10}
                  stroke="#64748B"
                  width={150}
                />
                <Tooltip />
                <Bar dataKey="count" name="Count">
                  {data.top_domains.map((d, i) => (
                    <Cell key={i} fill={TIER_LABELS[d.tier]?.color ?? '#94A3B8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 4. 메디맵 source share trend */}
        <div className="card card-pad border-brand/30">
          <h2 className="section-title mb-3">
            메디맵 Source Share Trend ⭐{' '}
            <span className="text-[11px] font-normal text-ink-muted">(SaaS 직접 ROI)</span>
          </h2>
          {data.medimap_share_trend.every((d) => d.share_pct === 0) ? (
            <div className="flex h-60 flex-col items-center justify-center text-sm text-ink-muted">
              <div>현재 메디맵 콘텐츠 source share = 0%</div>
              <div className="mt-1 text-[11px] text-ink-faint">
                3~6개월 콘텐츠 누적 후 점진 증가 예상
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.medimap_share_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5EBED" />
                <XAxis dataKey="date" fontSize={10} stroke="#64748B" />
                <YAxis
                  fontSize={10}
                  stroke="#64748B"
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Line
                  type="monotone"
                  dataKey="share_pct"
                  name="메디맵 share"
                  stroke="#1B68FF"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* === Tier 설명 === */}
      <section className="card card-pad mt-6">
        <h2 className="section-title mb-3">5-Tier 분류 설명</h2>
        <div className="grid grid-cols-1 gap-2 text-xs text-ink-soft sm:grid-cols-2">
          {(['T1', 'T2', 'T3', 'T4', 'T5'] as const).map((k) => (
            <div key={k} className="flex items-start gap-2">
              <span
                className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: TIER_LABELS[k].color }}
              />
              <div>
                <strong>{TIER_LABELS[k].label}</strong> ({data.source_tier[k]}건)
                <span className="ml-1 text-ink-muted">
                  {k === 'T1' && '— medi-map.co.kr, medimap-blog 등'}
                  {k === 'T2' && '— 각 클라이언트 tenant.homepage'}
                  {k === 'T3' && '— MSD 매뉴얼, 종합병원 (아산/삼성/서울대 등)'}
                  {k === 'T4' && '— 모두닥, 강남언니, 더드맨디 등'}
                  {k === 'T5' && '— 경쟁사 + 기타 (대부분 경쟁사 의료 사이트)'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
