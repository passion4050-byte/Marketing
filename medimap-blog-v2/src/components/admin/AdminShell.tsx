'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Beaker,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  DollarSign,
  FileText,
  History,
  LayoutDashboard,
  LinkIcon,
  LogOut,
  Plug,
  Settings,
  ShieldCheck,
  Tag,
  UserCog,
  Users,
  Zap
} from 'lucide-react';
import { showToast } from '@/lib/clientActions';
import { cn } from '@/lib/cn';

const NAV = [
  { group: '운영', items: [
    { href: '/admin', label: '대시보드', icon: LayoutDashboard },
    { href: '/admin/tenants', label: '클라이언트', icon: Users },
    { href: '/admin/content-queue', label: '콘텐츠 관리', icon: ClipboardCheck },
    { href: '/admin/content-settings', label: '콘텐츠 설정', icon: Settings },
    { href: '/admin/keywords', label: '키워드 풀', icon: Tag },
    { href: '/admin/calendar', label: '콘텐츠 캘린더', icon: CalendarDays },
    { href: '/admin/ab-tests', label: 'A/B 테스트', icon: Beaker }
  ]},
  { group: '인사이트', items: [
    { href: '/admin/citations', label: 'AI 인용 추적', icon: Zap },
    { href: '/admin/learned-insights', label: '학습 인사이트', icon: BookOpen },
    { href: '/admin/funnel', label: 'Funnel · ROI', icon: LinkIcon },
    { href: '/admin/cost', label: '비용 모니터', icon: DollarSign },
    { href: '/admin/reports', label: '월간 보고서', icon: FileText }
  ]},
  { group: '시스템', items: [
    { href: '/admin/users', label: '사용자 관리', icon: UserCog },
    { href: '/admin/integrations', label: '연동 (YouTube 등)', icon: Plug },
    { href: '/admin/audit', label: '감사 로그', icon: History }
  ]}
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const onLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    showToast('로그아웃됨');
    window.location.href = '/admin/login';
  };

  return (
    <div className="flex min-h-screen bg-surface-subtle">
      <aside className="sticky top-0 flex h-screen w-[228px] shrink-0 flex-col border-r border-border bg-surface-base">
        <div className="border-b border-border px-5 pb-3 pt-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">MEDIMAP GEO</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-brand-700">
                Admin Console
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((g) => (
            <div key={g.group} className="mb-5">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                {g.group}
              </div>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = pathname === it.href || pathname?.startsWith(it.href + '/');
                  const Icon = it.icon;
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={cn(
                          'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition',
                          active
                            ? 'bg-brand-50 font-semibold text-brand-700'
                            : 'text-ink-soft hover:bg-surface-subtle'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {it.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-border px-3 py-3">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-muted hover:bg-surface-subtle hover:text-status-danger"
          >
            <LogOut className="h-4 w-4" /> 로그아웃
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
