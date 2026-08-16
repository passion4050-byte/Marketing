'use client';

/**
 * Round 157 — 유입 추이 차트 (GSC 클릭 막대 + GA4 세션·AI 세션 라인).
 * recharts 사용 (ReportTrendChart 와 동일 스택). 데이터는 서버에서 집계해 props 로.
 */
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface TrendPoint {
  d: string;
  gscClicks: number;
  ga4Sessions: number;
  aiSessions: number;
}

export function TrafficTrendChart({ data }: { data: TrendPoint[] }) {
  const hasAny = data.some((p) => p.gscClicks > 0 || p.ga4Sessions > 0);
  if (!hasAny) {
    return (
      <div className="flex h-48 items-center justify-center rounded border border-dashed border-border text-[12px] text-ink-muted">
        아직 유입 데이터가 없습니다 — 크론 첫 적재 후 표시됩니다.
      </div>
    );
  }
  const ticks = data
    .map((p) => p.d)
    .filter((_, i) => i % Math.max(1, Math.floor(data.length / 8)) === 0);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="d" ticks={ticks} tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip
          labelFormatter={(v) => `${v}`}
          formatter={(value: number, name: string) => [value, name]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="gscClicks" name="Google 검색 클릭" fill="#94A3B8" fillOpacity={0.55} radius={[2, 2, 0, 0]} />
        <Line type="monotone" dataKey="ga4Sessions" name="전체 세션 (GA4)" stroke="#15B8A6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="aiSessions" name="AI 엔진 유입" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 2 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
