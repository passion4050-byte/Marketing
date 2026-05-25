'use client';

import { useMemo } from 'react';
import { calendarItems } from '@/lib/admin-mock';
import { cn } from '@/lib/cn';

export default function CalendarPage() {
  const grouped = useMemo(() => {
    const byDate: Record<string, typeof calendarItems> = {};
    calendarItems.forEach((it) => {
      if (!byDate[it.date]) byDate[it.date] = [];
      byDate[it.date].push(it);
    });
    return byDate;
  }, []);

  const dates = Object.keys(grouped).sort();

  return (
    <div className="px-8 py-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-ink">콘텐츠 캘린더</h1>
        <p className="mt-1 text-sm text-ink-muted">발행 예정 + 발행 완료 콘텐츠를 날짜별로 확인</p>
      </header>

      <div className="space-y-3">
        {dates.map((d) => (
          <div key={d} className="card">
            <header className="border-b border-border bg-surface-subtle px-5 py-2 text-xs font-bold text-ink">
              {d} ({new Date(d).toLocaleDateString('ko-KR', { weekday: 'short' })})
            </header>
            <ul className="divide-y divide-border">
              {grouped[d].map((it, i) => (
                <li key={i} className="flex items-center justify-between px-5 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="chip-brand">{it.tenantName}</span>
                    <span className="text-ink">{it.title}</span>
                  </div>
                  <span className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    it.status === 'published' ? 'bg-status-successSoft text-status-success' :
                    it.status === 'review' ? 'bg-status-warningSoft text-status-warning' :
                    'bg-brand-50 text-brand-700'
                  )}>
                    {it.status === 'published' ? '발행됨' : it.status === 'review' ? '검수 중' : '예정'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
