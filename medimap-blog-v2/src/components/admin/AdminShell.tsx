'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ScopeSelector } from '@/components/admin/ScopeSelector';
import {
  Beaker,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  DollarSign,
  FileText,
  Globe,
  History,
  Inbox,
  LayoutDashboard,
  LinkIcon,
  LogOut,
  Menu,
  Plug,
  BarChart3,
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
// Round 143 (2026-07-14) — IA 재정리(직무 기준). 이전엔 최적화/분석 항목이 '운영'에,
//   매일 보는 리드·캘린더가 '분석'·'설정'에 흩어져 동선이 꼬였음.
//   운영(매일 손대는 것) / 측정·분석(주간 판단) / 설정(가끔 조정) / 시스템(거의 안 봄)으로 정렬.
/**
 * Round 144 (2026-08-02) — IA 재편.
 *
 * 이전 문제 (E2E 감사):
 *   · 19개 항목이 평평하게 나열돼 매일 쓰는 것과 분기에 한 번 쓰는 것이 같은 무게
 *   · '측정·분석' 그룹에 클라이언트 보고(월간 보고서)와 내부 실험(A/B)이 섞여 목적이 뒤엉킴
 *   · 거의 안 보는 시스템 항목이 항상 펼쳐져 스크롤을 잡아먹음
 *
 * 재편 기준 = **운영자가 언제 여는가**:
 *   매일 / 성과·보고(주간) / 클라이언트(개별 작업) / 실험·학습 / 시스템(기본 접힘)
 *
 * 라우트는 하나도 바꾸지 않는다(안전). 그룹·순서·라벨·접힘·배지만 조정.
 */
type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** 사이드바 처리 대기 배지 */
  badge?: 'pendingContent' | 'newLeads';
  /** 처음 보는 사람도 뭘 하는 화면인지 알 수 있게 */
  hint?: string;
};
type NavGroup = { group: string; items: NavItem[]; defaultCollapsed?: boolean };

const NAV: NavGroup[] = [
  { group: '매일', items: [
    { href: '/admin', label: '대시보드', icon: LayoutDashboard, hint: '오늘 상태 · 성과 요약' },
    { href: '/admin/content-queue', label: '콘텐츠 관리', icon: ClipboardCheck, badge: 'pendingContent', hint: '검수 · 발행물 확인' },
    { href: '/admin/scanner-leads', label: '클라이언트 문의', icon: Inbox, badge: 'newLeads', hint: '진단 신청 · 상담 요청' },
  ]},
  { group: '성과 · 보고', items: [
    { href: '/admin/citations', label: 'AI 인용 추적', icon: Zap, hint: '실제 출처 인용 (북극성)' },
    { href: '/admin/reports', label: '월간 보고서', icon: FileText, hint: '클라이언트 발송' },
    { href: '/admin/funnel', label: '유입 · 전환', icon: LinkIcon, hint: '발행 → 언급 → 클릭' },
    { href: '/admin/traffic', label: '유입 분석', icon: BarChart3, hint: 'GSC · GA4 실측 (병원·검색어·콘텐츠)' },
  ]},
  { group: '클라이언트', items: [
    { href: '/admin/tenants', label: '클라이언트 목록', icon: Users, hint: '등록 · 요금 · 상태' },
    { href: '/admin/clients', label: '병원 계정 발급', icon: UserCog, hint: '병원 전용 콘솔 id/pw' },
    { href: '/admin/keywords', label: '키워드 풀', icon: Tag, hint: '측정 대상 키워드' },
    { href: '/admin/calendar', label: '콘텐츠 캘린더', icon: CalendarDays, hint: '발행 일정' },
    { href: '/admin/overseas', label: '해외 관리', icon: Globe, hint: 'EN · JA · ZH 전용' },
  ]},
  { group: '실험 · 학습', items: [
    { href: '/admin/ab-tests', label: 'A/B 테스트', icon: Beaker, hint: '변형 비교' },
    { href: '/admin/learned-insights', label: '학습 인사이트', icon: BookOpen, hint: '생성 프롬프트 규칙' },
    { href: '/admin/saas-tracking', label: '자사 영업 키워드', icon: Sparkles, hint: '위서클 자체 노출도' },
  ]},
  { group: '시스템', defaultCollapsed: true, items: [
    { href: '/admin/content-settings', label: '콘텐츠 설정', icon: Settings },
    { href: '/admin/domain-classifications', label: '도메인 분류 사전', icon: ShieldCheck },
    { href: '/admin/cost', label: '비용 모니터', icon: DollarSign },
    { href: '/admin/integrations', label: '연동', icon: Plug },
    { href: '/admin/users', label: '사용자 관리', icon: UserCog },
    { href: '/admin/audit', label: '감사 로그', icon: History },
  ]}
];

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

  /*
   * Round 144 — 사이드바 처리 대기 배지.
   * 운영자가 어드민을 열자마자 "손댈 게 있는지"를 메뉴에서 바로 알 수 있게 한다.
   * 기존엔 콘텐츠 관리/문의에 몇 건이 밀려 있는지 각 화면에 들어가야만 알 수 있었음.
   * 실패해도 배지만 안 보이면 되므로 전부 graceful.
   */
  const [badges, setBadges] = useState<{ pendingContent: number; newLeads: number }>({
    pendingContent: 0,
    newLeads: 0,
  });
  useEffect(() => {
    let alive = true;
    fetch('/api/admin/nav-badges', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (alive && j?.ok) {
          setBadges({ pendingContent: j.pendingContent ?? 0, newLeads: j.newLeads ?? 0 });
        }
      })
      .catch(() => {
        /* 배지는 부가 정보 — 실패해도 무시 */
      });
    return () => {
      alive = false;
    };
  }, [pathname]);

  /* 그룹 접힘 — 시스템처럼 거의 안 보는 그룹은 기본 접힘. 선택은 localStorage 유지. */
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('admin-nav-collapsed') || '{}');
      const init: Record<string, boolean> = {};
      for (const g of NAV) init[g.group] = saved[g.group] ?? !!g.defaultCollapsed;
      setCollapsed(init);
    } catch {
      const init: Record<string, boolean> = {};
      for (const g of NAV) init[g.group] = !!g.defaultCollapsed;
      setCollapsed(init);
    }
  }, []);
  const toggleGroup = (g: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [g]: !prev[g] };
      try {
        localStorage.setItem('admin-nav-collapsed', JSON.stringify(next));
      } catch {
        /* private mode 등 — 무시 */
      }
      return next;
    });
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
        {NAV.map((g) => {
          // 접힌 그룹 안에 현재 페이지가 있으면 강제로 펼침 — 사용자가 길을 잃지 않게
          const hasActive = g.items.some(
            (it) => pathname === it.href || (it.href !== '/admin' && pathname?.startsWith(it.href + '/')),
          );
          const isCollapsed = (collapsed[g.group] ?? !!g.defaultCollapsed) && !hasActive;
          // 접힌 상태에서도 처리 대기가 있으면 알 수 있게 그룹 합계 표시
          const groupPending = g.items.reduce(
            (s, it) => s + (it.badge ? badges[it.badge] ?? 0 : 0),
            0,
          );
          return (
            <div key={g.group} className="mb-4">
              <button
                type="button"
                onClick={() => toggleGroup(g.group)}
                className="flex w-full items-center gap-1.5 rounded px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-iris transition hover:text-ink"
              >
                <ChevronDown
                  className={cn('h-3 w-3 transition-transform', isCollapsed && '-rotate-90')}
                />
                {g.group}
                {isCollapsed && groupPending > 0 && (
                  <span className="ml-auto rounded-full bg-status-danger px-1.5 py-0.5 text-[9px] font-bold text-white tracking-normal">
                    {groupPending}
                  </span>
                )}
              </button>
              {!isCollapsed && (
                <ul className="space-y-0.5">
                  {g.items.map((it) => {
                    const active =
                      pathname === it.href ||
                      (it.href !== '/admin' && pathname?.startsWith(it.href + '/'));
                    const Icon = it.icon;
                    const count = it.badge ? badges[it.badge] ?? 0 : 0;
                    return (
                      <li key={it.href}>
                        <Link
                          href={it.href}
                          title={it.hint}
                          className={cn(
                            'flex min-h-[40px] items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition',
                            active
                              ? 'bg-ink font-bold text-white'
                              : 'text-ink-soft hover:bg-surface-muted',
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{it.label}</span>
                          {count > 0 && (
                            <span
                              className={cn(
                                'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                                active ? 'bg-white/20 text-white' : 'bg-status-danger text-white',
                              )}
                            >
                              {count > 99 ? '99+' : count}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
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
      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        {/* 전역 언어 스코프 바 — 어드민 전역 통합/국내/EN/JA/ZH 컨텍스트 */}
        <div className="sticky top-0 z-20 hidden items-center justify-end gap-3 border-b border-border bg-surface-subtle/95 px-6 py-2 backdrop-blur md:flex">
          <ScopeSelector />
        </div>
        {children}
      </main>
    </div>
  );
}
