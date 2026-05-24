import type { SentimentByEngine } from '@/lib/types';

const ENGINE_NAME: Record<SentimentByEngine['engine'], string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity'
};

export function SentimentByEngineChart({ rows }: { rows: SentimentByEngine[] }) {
  return (
    <section className="card card-pad">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="section-title">플랫폼별 멘션 감성</h3>
        <span className="section-subtle">긍정 / 중립 / 부정</span>
      </header>
      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.engine} className="grid grid-cols-[110px_1fr_110px] items-center gap-3">
            <div className="text-sm font-semibold text-ink">{ENGINE_NAME[r.engine]}</div>
            <div className="flex h-3 overflow-hidden rounded-full bg-status-neutralSoft">
              <div className="bg-status-success" style={{ width: `${r.positive}%` }} aria-label="긍정" />
              <div className="bg-status-neutral" style={{ width: `${r.neutral}%` }} aria-label="중립" />
              <div className="bg-status-danger" style={{ width: `${r.negative}%` }} aria-label="부정" />
            </div>
            <div className="text-right text-xs font-medium text-ink-muted">
              <span className="text-status-success">+{r.positive}%</span>{' '}/{' '}
              <span className="text-status-danger">-{r.negative}%</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-status-success" aria-hidden /> 긍정
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-status-neutral" aria-hidden /> 중립
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-status-danger" aria-hidden /> 부정
        </span>
      </div>
    </section>
  );
}
