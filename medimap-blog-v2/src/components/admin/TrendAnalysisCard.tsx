/**
 * Round 65 (2026-06-22) — 추이 분석 카드.
 *
 * 경쟁사 페이지 상단. 키워드 드롭다운 + 보기 토글(AI엔진별/경쟁사 도메인별/클라이언트별)
 * + 30일 멀티라인 추이 + 요약 스탯. /api/admin/competitors/trends 소비.
 */
'use client';

import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Loader2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';

type Dim = { series: string[]; data: Array<Record<string, number | string>> };
type TrendData = {
  keywords: string[];
  dates: string[];
  byEngine: Dim;
  byCompetitor: Dim;
  byClient: Dim;
  summary: { total: number; top_engine: string | null; top_competitor: string | null };
};

type Mode = 'engine' | 'competitor' | 'client';

const MODE_META: Record<Mode, { label: string; dim: keyof Pick<TrendData, 'byEngine' | 'byCompetitor' | 'byClient'> }> = {
  engine: { label: 'AI 엔진별 인용', dim: 'byEngine' },
  competitor: { label: '경쟁사 도메인별', dim: 'byCompetitor' },
  client: { label: '클라이언트별', dim: 'byClient' },
};

const PALETTE = ['#1B68FF', '#15B8A6', '#A855F7', '#F59E0B', '#EF4444', '#0EA5E9', '#64748B'];
const ENGINE_COLORS: Record<string, string> = {
  claude: '#D97757',
  gemini: '#1B68FF',
  perplexity: '#20808D',
  openai: '#10A37F',
};
const ENGINE_LABELS: Record<string, string> = {
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  openai: 'ChatGPT',
};

function displayLabel(mode: Mode, name: string): string {
  if (mode === 'engine') return ENGINE_LABELS[name.toLowerCase()] ?? name;
  return name;
}
function colorFor(mode: Mode, name: string, i: number): string {
  if (mode === 'engine') return ENGINE_COLORS[name.toLowerCase()] ?? PALETTE[i % PALETTE.length];
  return PALETTE[i % PALETTE.length];
}

export function TrendAnalysisCard({ tenantId }: { tenantId: number | null }) {
  const [keyword, setKeyword] = useState<string>('');
  const [mode, setMode] = useState<Mode>('engine');
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (tenantId) params.set('tenantId', String(tenantId));
    if (keyword) params.set('keyword', keyword);
    fetch(`/api/admin/competitors/trends${params.toString() ? '?' + params.toString() : ''}`, {
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((j) => {
        if (alive && j.ok) setData(j as TrendData);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tenantId, keyword]);

  const dim = data ? data[MODE_META[mode].dim] : null;
  const hasData = !!data && data.summary.total > 0 && !!dim && dim.series.length > 0;

  return (
    <section className="mb-6 card card-pad print:hidden">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand" />
          <h2 className="section-title">추이 분석</h2>
          <span className="text-[10px] text-ink-muted">최근 30일 · AI 인용 흐름</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 키워드 드롭다운 */}
          <select
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="rounded-lg border border-border bg-surface-base px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
          >
            <option value="">전체 키워드</option>
            {(data?.keywords ?? []).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          {/* 보기 토글 */}
          <div className="flex rounded-lg border border-border bg-surface-base p-0.5">
            {(Object.keys(MODE_META) as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-semibold transition',
                  mode === m ? 'bg-brand text-white' : 'text-ink-soft hover:bg-surface-subtle'
                )}
              >
                {MODE_META[m].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 요약 스탯 */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-surface-subtle px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-muted">총 인용</div>
          <div className="text-lg font-bold text-ink">{data?.summary.total ?? 0}</div>
        </div>
        <div className="rounded-lg bg-surface-subtle px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-muted">최다 인용 엔진</div>
          <div className="truncate text-lg font-bold text-ink">
            {data?.summary.top_engine ? displayLabel('engine', data.summary.top_engine) : '—'}
          </div>
        </div>
        <div className="rounded-lg bg-surface-subtle px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-muted">최다 경쟁사</div>
          <div className="truncate font-mono text-sm font-bold text-ink" title={data?.summary.top_competitor ?? ''}>
            {data?.summary.top_competitor ?? '—'}
          </div>
        </div>
      </div>

      {/* 차트 */}
      {loading ? (
        <div className="flex h-56 items-center justify-center text-sm text-ink-muted">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 로드 중…
        </div>
      ) : !hasData ? (
        <div className="flex h-56 flex-col items-center justify-center text-sm text-ink-muted">
          <div>아직 추이 데이터가 부족합니다</div>
          <div className="mt-1 text-[11px] text-ink-faint">
            production 측정이 누적되면 채워집니다 (매주 월·목 06:00)
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dim!.data} margin={{ top: 4, right: 16, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5EBED" />
            <XAxis dataKey="date" fontSize={10} stroke="#64748B" interval="preserveStartEnd" minTickGap={24} />
            <YAxis fontSize={10} stroke="#64748B" allowDecimals={false} width={32} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5EBED' }}
              labelStyle={{ fontSize: 11, fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {dim!.series.map((name, i) => (
              <Line
                key={`v${i}`}
                type="monotone"
                dataKey={`v${i}`}
                name={displayLabel(mode, name)}
                stroke={colorFor(mode, name, i)}
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
