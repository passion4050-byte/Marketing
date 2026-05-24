'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BadgePercent,
  BookOpenText,
  ChevronsLeft,
  ChevronsRight,
  Clapperboard,
  Clock3,
  Code2,
  Database,
  FileText,
  LayoutDashboard,
  MapPin,
  Megaphone,
  MessageCircleQuestion,
  MessageSquareDot,
  Microscope,
  Star,
  Stethoscope,
  Syringe
} from 'lucide-react';
import { navGroups, siteConfig } from '@/lib/site-config';
import { currentTenant } from '@/lib/mock-data';
import { cn } from '@/lib/cn';

const iconMap = {
  LayoutDashboard,
  Database,
  MessageSquareDot,
  Code2,
  FileText,
  BookOpenText,
  Clapperboard,
  Stethoscope,
  Microscope,
  BadgePercent,
  Clock3,
  MapPin,
  Syringe,
  Megaphone,
  MessageCircleQuestion,
  Star
} as const;

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen flex-col border-r border-border bg-surface-base transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-[252px]'
      )}
    >
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <Link href="/" className="flex flex-col" aria-label={siteConfig.name}>
          <span className={cn('text-base font-bold tracking-tight text-brand', collapsed && 'sr-only')}>
            {siteConfig.name}
          </span>
          <span className={cn('text-[11px] font-medium text-ink-muted', collapsed && 'sr-only')}>
            {siteConfig.subtitle}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="rounded-md p-1 text-ink-muted hover:bg-surface-muted hover:text-ink"
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="mx-5 mb-4 rounded-lg border border-border bg-surface-subtle px-3 py-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">현재 고객사</div>
          <div className="mt-1 text-sm font-semibold text-ink">{currentTenant.name}</div>
          <div className="text-[11px] text-ink-muted">
            {currentTenant.region} · {currentTenant.specialty} · {currentTenant.tagline}
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-5 px-3">
        {navGroups.map((group) => (
          <div key={group.id}>
            <div
              className={cn(
                'mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint',
                collapsed && 'sr-only'
              )}
            >
              {group.label}
            </div>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                const Icon = iconMap[item.icon as keyof typeof iconMap] ?? LayoutDashboard;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(active ? 'sidebar-link-active' : 'sidebar-link', collapsed && 'justify-center px-0')}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn('px-5 pb-5 pt-3 text-[11px] text-ink-faint', collapsed && 'sr-only')}>
        {siteConfig.copyright}
      </div>
    </aside>
  );
}
