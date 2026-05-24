'use client';

import { Download } from 'lucide-react';
import { currentTenant } from '@/lib/mock-data';
import { cn } from '@/lib/cn';

export interface HeaderTab {
  label: string;
  href?: string;
  active?: boolean;
}

interface Props {
  title: string;
  subtitle?: string;
  tabs?: HeaderTab[];
  actionLabel?: string;
  onAction?: () => void;
}

export function Header({ title, subtitle, tabs, actionLabel, onAction }: Props) {
  return (
    <header className="flex items-start justify-between gap-6 border-b border-border bg-surface-base px-8 py-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-4">
        {tabs && tabs.length > 0 && (
          <nav className="flex items-center gap-1 rounded-lg bg-surface-muted p-1">
            {tabs.map((t) => (
              <a
                key={t.label}
                href={t.href ?? '#'}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  t.active ? 'bg-surface-base text-brand-700 shadow-card' : 'text-ink-muted hover:text-ink'
                )}
              >
                {t.label}
              </a>
            ))}
          </nav>
        )}
        <div className="rounded-md bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
          {currentTenant.name} · {currentTenant.cycleLabel}
        </div>
        {actionLabel && (
          <button type="button" onClick={onAction} className="btn-primary">
            <Download className="h-4 w-4" /> {actionLabel}
          </button>
        )}
      </div>
    </header>
  );
}
