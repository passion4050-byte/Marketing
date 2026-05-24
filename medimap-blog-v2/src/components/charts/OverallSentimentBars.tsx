interface Props {
  positive: number;
  neutral: number;
  negative: number;
}

export function OverallSentimentBars({ positive, neutral, negative }: Props) {
  const rows = [
    { key: '긍정', value: positive, color: 'bg-status-success' },
    { key: '중립', value: neutral, color: 'bg-status-neutral' },
    { key: '부정', value: negative, color: 'bg-status-danger' }
  ];
  return (
    <section className="card card-pad">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="section-title">전체 감성 분포</h3>
        <span className="section-subtle">전 플랫폼 통합</span>
      </header>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[60px_1fr_60px] items-center gap-3">
            <span className="text-sm font-semibold text-ink">{r.key}</span>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
              <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.value}%` }} aria-hidden />
            </div>
            <span className="text-right text-sm font-semibold text-ink">{r.value}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
