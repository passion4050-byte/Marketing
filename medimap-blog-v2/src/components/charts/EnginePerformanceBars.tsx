import type { EnginePerformance, EngineMetricRow } from '@/lib/types';

const ENGINE_NAME: Record<EnginePerformance['engine'], string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity'
};

export function EnginePerformanceBars({ rows, metrics }: { rows: EnginePerformance[]; metrics: EngineMetricRow[] }) {
  return (
    <section className="card card-pad">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="section-title">AI 플랫폼 성능 비교</h3>
        <span className="section-subtle">5개 지표 평균</span>
      </header>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.engine} className="grid grid-cols-[140px_1fr_50px] items-center gap-4">
            <div>
              <div className="text-sm font-semibold text-ink">{ENGINE_NAME[r.engine]}</div>
              <div className="text-xs text-ink-muted">{r.label}</div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-brand-100">
              <div className="h-full rounded-full bg-brand" style={{ width: `${r.score}%` }} aria-hidden />
            </div>
            <div className="text-right text-sm font-semibold text-ink">{r.score}점</div>
          </li>
        ))}
      </ul>
      <div className="mt-5 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-subtle text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3 text-left">플랫폼</th>
              <th className="px-4 py-3 text-left">정확성</th>
              <th className="px-4 py-3 text-left">언급</th>
              <th className="px-4 py-3 text-left">긍정</th>
              <th className="px-4 py-3 text-left">관련성</th>
              <th className="px-4 py-3 text-right">포괄성</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {metrics.map((m) => (
              <tr key={m.engine}>
                <td className="px-4 py-3 font-medium text-ink">{ENGINE_NAME[m.engine]}</td>
                <td className="px-4 py-3 text-ink">{m.accuracy}점</td>
                <td className="px-4 py-3 text-ink">{m.mention}점</td>
                <td className="px-4 py-3 text-ink">{m.positive}점</td>
                <td className="px-4 py-3 text-ink">{m.relevance}점</td>
                <td className="px-4 py-3 text-right text-ink">{m.coverage}점</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
