import type { TopicRow } from '@/lib/types';
import { cn } from '@/lib/cn';

const SENTIMENT_LABEL: Record<TopicRow['sentiment'], { text: string; cls: string }> = {
  positive: { text: '긍정', cls: 'chip-success' },
  neutral: { text: '중립', cls: 'chip-neutral' },
  negative: { text: '부정', cls: 'chip-danger' },
  warning: { text: '주의', cls: 'chip-warning' }
};

export function TopicsTable({ rows }: { rows: TopicRow[] }) {
  return (
    <section className="card card-pad">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="section-title">자주 언급된 주제</h3>
        <span className="section-subtle">주제별 멘션 / 감성 / 메모</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="pb-3 text-left">주제</th>
              <th className="pb-3 text-left">멘션 수</th>
              <th className="pb-3 text-left">감성</th>
              <th className="pb-3 text-right">분석 메모</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.topic}>
                <td className="py-3 font-medium text-ink">{row.topic}</td>
                <td className="py-3 text-ink">{row.mentions}</td>
                <td className="py-3">
                  <span className={cn(SENTIMENT_LABEL[row.sentiment].cls)}>{SENTIMENT_LABEL[row.sentiment].text}</span>
                </td>
                <td className="py-3 text-right text-ink-muted">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
