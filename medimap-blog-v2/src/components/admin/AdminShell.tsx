'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ScopeSelector,
  SCOPES,
  SCOPE_EVENT,
  persistScope,
  readScope,
  scopeShortLabel,
} from '@/components/admin/ScopeSelector';
import {
  Beaker,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  DollarSign,
  FileText,
  Check,
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
  Zap,
  Target,
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
  // Round 174 (2026-08-23) — 실사용 기준 재편.
  //   ① 키워드 풀을 '클라이언트' → '매일'로 승격: content_eligible/measure_eligible 분리
  //      이후 발행 대상을 정하는 1차 레버가 됐다(헤드 텀 90개 발행 제외 / 롱테일 196개 시드).
  //   ② 경쟁사 분석은 실제로 쓰는데 NAV 에 아예 없어서 URL 을 직접 쳐야 했다 → 추가.
  //   ③ 실험·학습(A/B·학습 인사이트·자사 영업)은 최근 사용 이력이 없어 기본 접힘으로 강등.
  //      삭제가 아니라 강등인 이유: 내부 콘솔이라 언제든 다시 필요해질 수 있다.
  { group: '매일', items: [
    { href: '/admin', label: '대시보드', icon: LayoutDashboard, hint: '오늘 상태 · 성과 요약' },
    // Round 180 (2026-08-30) — 제품 축 전환. 파는 것이 '월 N편'이 아니라
    //   '키워드 N개 상위 진입 + AI 인용 증명'이므로, 그 이행 상태가 콘텐츠 관리보다 위에 온다.
    { href: '/admin/performance', label: '성과 보드', icon: Target, hint: '추적 키워드 순위 · AI 인용' },
    { href: '/admin/content-queue', label: '콘텐츠 관리', icon: ClipboardCheck, badge: 'pendingContent', hint: '검수 · 발행물 확인' },
    { href: '/admin/keywords', label: '키워드 풀', icon: Tag, hint: '발행 대상 · 측정 대상 분리 관리' },
    { href: '/admin/scanner-leads', label: '클라이언트 문의', icon: Inbox, badge: 'newLeads', hint: '진단 신청 · 상담 요청' },
  ]},
  { group: '성과 · 보고', items: [
    { href: '/admin/citations', label: 'AI 인용 추적', icon: Zap, hint: '실제 출처 인용 (북극성)' },
    { href: '/admin/competitors', label: '경쟁사 분석', icon: Beaker, hint: '경쟁 도메인 인용 점유' },
    { href: '/admin/reports', label: '월간 보고서', icon: FileText, hint: '클라이언트 발송' },
    { href: '/admin/funnel', label: '유입 · 전환', icon: LinkIcon, hint: '발행 → 언급 → 클릭' },
    { href: '/admin/traffic', label: '유입 분석', icon: BarChart3, hint: 'GSC · GA4 실측 (병원·검색어·콘텐츠)' },
  ]},
  { group: '클라이언트', items: [
    { href: '/admin/tenants', label: '클라이언트 목록', icon: Users, hint: '등록 · 요금 · 상태' },
    { href: '/admin/clients', label: '병원 계정 발급', icon: UserCog, hint: '병원 전용 콘솔 id/pw' },
    { href: '/admin/calendar', label: '콘텐츠 캘린더', icon: CalendarDays, hint: '발행 일정' },
    { href: '/admin/overseas', label: '해외 관리', icon: Globe, hint: 'EN · JA · ZH 전용' },
  ]},
  { group: '실험 · 학습', defaultCollapsed: true, items: [
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
  const router = useRouter();
  // Round 37 G (2026-05-31) — 모바일 햄버거 사이드바.
  // md (768px) 이상: 고정 사이드바. 미만: 햄버거 + drawer overlay.
  const [mobileOpen, setMobileOpen] = useState(false);

  // 라우트 변경 시 자동 close (모바일 drawer)
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /*
   * Round 169 (2026-08-20) — 모바일: 언어 스코프 바텀시트.
   * 저장 로직은 ScopeSelector 의 persistScope 를 그대로 재사용 —
   * localStorage(wc_admin_scope) + cookie(max-age=31536000) + wc-scope 이벤트.
   */
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scope, setScope] = useState('all');
  useEffect(() => {
    setScope(readScope());
    const onEvt = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string') setScope(detail);
    };
    window.addEventListener(SCOPE_EVENT, onEvt);
    return () => window.removeEventListener(SCOPE_EVENT, onEvt);
  }, []);
  const pickScope = (k: string) => {
    setScope(k);
    persistScope(k);
    setScopeOpen(false);
    router.refresh();
  };

  // drawer / 바텀시트 열렸을 때 body scroll lock
  useEffect(() => {
    if (mobileOpen || scopeOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen, scopeOpen]);

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
  // Round 169 — 모바일 헤더 pill / 햄버거 점에 쓰는 처리 대기 합계
  const totalPending = badges.pendingContent + badges.newLeads;

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

      {/* 모바일 햄버거 헤더 (md 미만)
          Round 169 (2026-08-20) — 모바일:
            · 우측의 빈 스페이서 <div className="w-10" /> 를 언어 스코프 칩으로 대체.
              (기존엔 스코프 셀렉터가 md:flex 바에만 있어 모바일에선 전환 자체가 불가능)
            · 처리 대기(검수+문의) 합계를 숫자 pill 로 노출 — 탭하면 콘텐츠 관리로.
            · 햄버거에도 빨간 점 — 서랍을 열지 않아도 할 일 유무를 알 수 있게. */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface-subtle px-3 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="메뉴 열기"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-soft active:bg-surface-muted"
        >
          <Menu className="h-5 w-5" />
          {totalPending > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-status-danger ring-2 ring-surface-subtle" />
          )}
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <span className="truncate text-[13px] font-black tracking-tight text-ink">WECIRCLE GEO</span>
        </div>

        {totalPending > 0 && (
          <Link
            href="/admin/content-queue"
            aria-label={`처리 대기 ${totalPending}건`}
            className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-full bg-status-danger px-2.5 text-[12px] font-bold tabular-nums text-white active:scale-95"
          >
            <Inbox className="h-3.5 w-3.5" />
            {totalPending > 99 ? '99+' : totalPending}
          </Link>
        )}

        <button
          type="button"
          onClick={() => setScopeOpen(true)}
          aria-label="언어 스코프 변경"
          aria-haspopup="dialog"
          className="flex min-h-[36px] shrink-0 items-center gap-1 rounded-full border border-border bg-surface-base px-2.5 text-[12px] font-bold text-ink-soft active:scale-95"
        >
          <Globe className="h-3.5 w-3.5 text-ink-muted" />
          {scopeShortLabel(scope)}
          <ChevronDown className="h-3 w-3 text-ink-muted" />
        </button>
      </div>

      {/* 모바일 언어 스코프 바텀시트 — 엄지가 닿는 화면 하단에서 선택 */}
      {scopeOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 md:hidden"
            onClick={() => setScopeOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="언어 스코프"
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl md:hidden"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <div className="mb-1 flex items-center justify-between">
              <div>
                <div className="text-[15px] font-black tracking-tight text-ink">언어 스코프</div>
                <div className="mt-0.5 text-[11px] text-ink-muted">
                  선택한 언어의 데이터만 어드민 전체에 적용됩니다
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScopeOpen(false)}
                aria-label="닫기"
                className="-mr-1 flex h-10 w-10 items-center justify-center rounded-md text-ink-muted active:bg-surface-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-2 divide-y divide-border/70">
              {SCOPES.map((sc) => {
                const active = scope === sc.key;
                return (
                  <button
                    key={sc.key}
                    type="button"
                    onClick={() => pickScope(sc.key)}
                    className={cn(
                      'flex min-h-[52px] w-full items-center gap-3 px-1 text-left transition active:bg-surface-muted',
                      active && 'font-bold',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-11 shrink-0 items-center justify-center rounded-md text-[11px] font-bold',
                        active ? 'bg-ink text-white' : 'bg-surface-muted text-ink-soft',
                      )}
                    >
                      {sc.short}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-ink">{sc.label}</span>
                      <span className="block truncate text-[11px] text-ink-muted">{sc.desc}</span>
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-ink" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

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
