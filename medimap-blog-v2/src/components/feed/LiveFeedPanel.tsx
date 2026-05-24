import type { LiveFeedItem } from '@/lib/types';
import { formatKstDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';

const ENGINE_BADGE: Record<LiveFeedItem['engine'], { label: string; tone: string }> = {
  chatgpt: { label: 'ChatGPT', tone: 'bg-engine-chatgpt text-white' },
  claude: { label: 'Claude', tone: 'bg-engine-claude text-white' },
  gemini: { label: 'Gemini', tone: 'bg-engine-gemini text-white' },
  perplexity: { label: 'Perplexity', tone: 'bg-engine-perplexity text-white' }
};

const SENTIMENT_CHIP = {
  positive: 'chip-success',
  neutral: 'chip-neutral',
  negative: 'chip-danger'
} as const;

const SENTIMENT_LABEL = {
  positive: '긍정',
  neutral: '중립',
  negative: '부정'
} as const;

export function LiveFeedPanel({ items }: { items: LiveFeedItem[] }) {
  return (
    <section className="card card-pad">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="section-title">실시간 AI 응답 피드</h3>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-success">
          <span className="h-2 w-2 animate-live-pulse rounded-full bg-status-success" aria-hidden />
          LIVE
        </span>
      </header>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-border bg-surface-subtle px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', ENGINE_BADGE[item.engine].tone)}>
                {ENGINE_BADGE[item.engine].label}
              </span>
              <span className="text-ink-muted">{formatKstDateTime(item.capturedAt).slice(11)} 수집</span>
            </div>
            <div className="mt-2 text-sm font-semibold text-ink">{item.query}</div>
            <p className="mt-1 text-xs text-ink-muted">{item.summary}</p>
            <div className="mt-2">
              <span className={SENTIMENT_CHIP[item.sentiment]}>{SENTIMENT_LABEL[item.sentiment]}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
