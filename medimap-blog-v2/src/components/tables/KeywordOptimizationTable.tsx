import type { KeywordOptimization } from '@/lib/types';
import { cn } from '@/lib/cn';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

const STATUS_LABEL: Record<KeywordOptimization['status'], string> = {
  optimized: '최적화됨',
  normal: '정상',
  needs_update: '업데이트 필요',
  review: '검수 필요',
  missing: '누락'
};

const STATUS_CLASS: Record<KeywordOptimization['status'], string> = {
  optimized: 'chip-success',
  normal: 'chip-brand',
  needs_update: 'chip-warning',
  review: 'chip-warning',
  missing: 'chip-danger'
};

export function KeywordOptimizationTable({ rows }: { rows: KeywordOptimization[] }) {
  return (
    <section className="card card-pad">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="section-title">키워드 최적화 현황</h3>
        <span className="section-subtle">상위 5개</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="pb-3 text-left">키워드</th>
              <th className="pb-3 text-left">검색량</th>
              <th className="pb-3 text-left">AI 멘션</th>
              <th className="pb-3 text-left">순위</th>
              <th className="pb-3 text-left">추세</th>
              <th className="pb-3 text-right">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const up = row.delta >= 0;
              const Icon = up ? ArrowUpRight : ArrowDownRight;
              return (
                <tr key={row.keyword}>
                  <td className="py-3 font-medium text-ink">{row.keyword}</td>
                  <td className="py-3 text-ink">{(row.searchVolume / 1000).toFixed(1)}K</td>
                  <td className="py-3 text-ink">{row.aiMentions}</td>
                  <td className="py-3 text-ink">{row.rank}위</td>
                  <td className="py-3">
                    <span className={cn('inline-flex items-center gap-1 font-semibold', up ? 'text-status-success' : 'text-status-danger')}>
                      <Icon className="h-3.5 w-3.5" /> {up ? '+' : ''}
                      {row.delta}%
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className={STATUS_CLASS[row.status]}>{STATUS_LABEL[row.status]}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
