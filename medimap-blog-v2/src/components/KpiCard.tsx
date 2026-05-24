import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { KpiSlot } from '@/lib/types';

export function KpiCard({ slot }: { slot: KpiSlot }) {
  const Icon = slot.deltaDirection === 'up' ? ArrowUpRight : slot.deltaDirection === 'down' ? ArrowDownRight : Minus;
  const tone =
    slot.deltaDirection === 'up'
      ? 'text-status-success'
      : slot.deltaDirection === 'down'
        ? 'text-status-danger'
        : 'text-ink-muted';

  return (
    <article className="kpi-card">
      <div className="kpi-label">{slot.label}</div>
      <div className="kpi-value">{slot.value}</div>
      <div className={cn('inline-flex items-center gap-1 text-sm font-semibold', tone)}>
        <Icon className="h-3.5 w-3.5" /> {slot.deltaText}
      </div>
      {slot.subtle && <p className="text-xs text-ink-muted">{slot.subtle}</p>}
    </article>
  );
}

export function KpiGrid({ slots }: { slots: KpiSlot[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {slots.map((s) => (
        <KpiCard key={s.id} slot={s} />
      ))}
    </div>
  );
}
