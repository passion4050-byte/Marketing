import type { MentionTrendPoint } from '@/lib/types';

export function MentionTrendChart({ points }: { points: MentionTrendPoint[] }) {
  const max = Math.max(...points.map((p) => p.count), 1);
  return (
    <section className="card card-pad">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="section-title">주간 멘션 트렌드</h3>
        <span className="section-subtle">최근 7일</span>
      </header>
      <div className="flex h-[220px] items-end gap-3 px-1">
        {points.map((p) => {
          const ratio = p.count / max;
          const height = Math.max(8, ratio * 200);
          return (
            <div key={p.weekday} className="flex flex-1 flex-col items-center gap-2">
              <div className="text-xs font-semibold text-ink">{p.count}</div>
              <div
                className="w-full rounded-t-md bg-brand"
                style={{ height: `${height}px` }}
                aria-label={`${p.weekday}요일 ${p.count}건`}
              />
              <div className="text-xs font-medium text-ink-muted">{p.weekday}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
