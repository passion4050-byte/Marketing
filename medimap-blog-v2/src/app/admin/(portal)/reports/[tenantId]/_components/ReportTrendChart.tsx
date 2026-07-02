'use client';

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

type Point = { date: string; t1: number; total: number; t1_share: number };

export function ReportTrendChart({ data }: { data: Point[] }) {
  if (data.every((d) => d.total === 0)) {
    return (
      <div className="flex h-40 items-center justify-center rounded border border-dashed border-border text-[12px] text-ink-muted">
        이번 달 측정 데이터 없음
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 10 }}
          label={{ value: '인용 수', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94A3B8' } }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 10 }}
          domain={[0, 1]}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
        />
        <Tooltip
          formatter={(v: number, name: string) => {
            if (name === '위서클 share') return `${Math.round(v * 100)}%`;
            return v;
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="left" dataKey="total" name="총 인용" fill="#94A3B8" fillOpacity={0.4} radius={[2, 2, 0, 0]} />
        <Bar yAxisId="left" dataKey="t1" name="위서클 T1" fill="#1B68FF" radius={[2, 2, 0, 0]} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="t1_share"
          name="위서클 share"
          stroke="#1B68FF"
          strokeWidth={2.5}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
