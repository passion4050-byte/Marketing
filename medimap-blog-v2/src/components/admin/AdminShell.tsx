'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Beaker,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  DollarSign,
  FileText,
  History,
  Inbox,
  LayoutDashboard,
  LinkIcon,
  LogOut,
  Menu,
  Plug,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
  UserCog,
  Users,
  X,
  Zap
} from 'lucide-react';
import { showToast } from '@/lib/clientActions';
import { cn } from '@/lib/cn';

// Round 84 (2026-06-28) — IA 재설계: 운영자 행동 빈도 기반 4그룹.
//   ① 일상 운영(매일 봄, 4개) ② 측정·분석(주간 봄, 6개)
//   ③ 설정(가끔 조정, 5개) ④ 시스템(거의 안 봄, 3개)
// 이전: 운영 7 + 인사이트 7 + 시스템 3 = 운영 그룹 비대화 → 운영자가 핵심 4개 못 찾음.
const NAV = [
  { group: '일상 운영', items: [
    { href: '/admin', label: '대시보드', icon: LayoutDashboard },
    { href: '/admin/content-queue', label: '콘텐츠 관리', icon: ClipboardCheck },
    { href: '/admin/learned-insights', label: '학습 인사이트', icon: BookOpen },
    { href: '/admin/ab-tests', label: 'A/B 테스트', icon: Beaker }
  ]},
  { group: '측정 · 분석', items: [
    { href: '/admin/scanner-leads', label: '클라이언트 문의', icon: Inbox },
    { href: '/admin/citations', label: 'AI 인용 추적', icon: Zap },
    { href: '/admin/saas-tracking', label: 'SaaS 시장 노출도', icon: Sparkles },
    { href: '/admin/funnel', label: 'Funnel · ROI', icon: LinkIcon },
    { href: '/admin/reports', label: '월간 보고서', icon: FileText },
    { href: '/admin/cost', label: '비용 모니터', icon: DollarSign }
  ]},
  { group: '설정', items: [
    { href: '/admin/tenants', label: '클라이언트', icon: Users },
    { href: '/admin/keywords', label: '키워드 풀', icon: Tag },
    { href: '/admin/content-settings', label: '콘텐츠 설정', icon: Settings },
    { href: '/admin/calendar', label: '콘텐츠 캘린더', icon: CalendarDays },
    { href: '/admin/domain-classifications', label: '도메인 분류 사전', icon: ShieldCheck }
  ]},
  { group: '시스템', items: [
    { href: '/admin/users', label: '사용자 관리', icon: UserCog },
    { href: '/admin/integrations', label: '연동 (YouTube 등)', icon: Plug },
    { href: '/admin/audit', label: '감사 로그', icon: History }
  ]}
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Round 37 G (2026-05-31) — 모바일 햄버거 사이드바.
  // md (768px) 이상: 고정 사이드바. 미만: 햄버거 + drawer overlay.
  const [mobileOpen, setMobileOpen] = useState(false);

  // 라우트 변경 시 자동 close (모바일 drawer)
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // drawer 열렸을 때 body scroll lock
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const onLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    showToast('로그아웃됨');
    window.location.href = '/admin/login';
  };

  const sidebarContent = (
    <>
      {/* Round 116 (2026-07-02) — Editorial 톤. warm off-white + stone hairline + ink 로고. */}
      <div className="border-b border-border px-5 pb-4 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[13px] font-black tracking-[-0.01em] text-ink">WECIRCLE GEO</div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-ink-muted">
              Admin Console
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((g) => (
          <div key={g.group} className="mb-5">
            {/* Round 124-D — 그룹 라벨 iris (레퍼런스: 다크 사이드바의 바이올렛 그룹 라벨) */}
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-iris">
              {g.group}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = pathname === it.href || (it.href !== '/admin' && pathname?.startsWith(it.href + '/')) || pathname === it.href;
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={cn(
                        'flex min-h-[40px] items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition',
                        active
                          ? 'bg-ink font-bold text-white'
                          : 'text-ink-soft hover:bg-surface-muted'
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
          className="flex min-h-[40px] w-full items-center gap-2 rounded-md px-3 py-2 text-[13px] text-ink-muted transition hover:bg-surface-muted hover:text-ink"
        >
          <LogOut className="h-4 w-4" /> 로그아웃
        </button>
      </div>
    </>
  );

  return (
    <div className="admin-scope flex min-h-screen bg-surface-subtle">
      {/* 데스크탑 사이드바 (md+) */}
      <aside className="sticky top-0 hidden h-screen w-[228px] shrink-0 flex-col border-r border-border bg-surface-subtle md:flex">
        {sidebarContent}
      </aside>

      {/* 모바일 햄버거 헤더 (md 미만) */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface-subtle px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="메뉴 열기"
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-md text-ink-soft hover:bg-surface-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-white">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-black tracking-tight text-ink">WECIRCLE GEO</span>
        </div>
        <div className="w-10" />
      </div>

      {/* 모바일 drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* 모바일 drawer 사이드바 */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-border bg-surface-subtle transition-transform md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="메뉴 닫기"
          className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-md text-ink-soft hover:bg-surface-subtle"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* 메인 콘텐츠 — 모바일은 햄버거 헤더 높이만큼 padding-top */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0">{children}</main>
    </div>
  );
}
