'use client';

/**
 * Round 147 — 병원 클라이언트 포털 셸.
 * 바비톡 병원관리자 레퍼런스: 상단 병원명 + 얇은 네비 + 로그아웃.
 * 어드민 콘솔(AdminShell)과 완전 분리 — 병원에게 필요한 메뉴만.
 *
 * 🔴 Round 169 (2026-08-20) — 모바일 전면 재설계.
 *   실사고: 헤더가 한 줄에 [정체성 210px + 네비 340px + 패딩 40px] = 590px 를 요구해
 *   375px 기기에서 페이지 전체가 좌우로 흔들리고 병원명이 잘렸음. 반응형 분기 0개.
 *   이 화면은 "원장님이 물어본 30초" 안에 근거를 대는 자리 — 첫인상이 해지 여부를 가른다.
 *   재설계:
 *     ① 헤더 2단 — 1단 정체성(병원명 truncate + 로그아웃), 2단 가로 스크롤 탭
 *     ② 드릴다운 3개(AI 언급·출처 인용·상담 클릭)를 네비로 승격 — 홈 경유 없이 1탭 도달
 *     ③ 탭은 shrink-0 + whitespace-nowrap + 44px 타겟, 활성 탭은 자동 스크롤 인
 *     ④ 데스크톱(md+)은 기존 한 줄 레이아웃 그대로 복원
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/** Round 169 — 드릴다운 3개 승격. 순서 = 원장이 묻는 순서(무엇을 했나 → 어떻게 보이나 → 문의로 이어졌나). */
const NAV = [
  { href: '/client', label: '홈' },
  { href: '/client/contents', label: '발행 콘텐츠' },
  { href: '/client/mentions', label: 'AI 언급' },
  { href: '/client/citations', label: '출처 인용' },
  { href: '/client/traffic', label: '검색 유입' },
  { href: '/client/clicks', label: '상담 클릭' },
];

export function ClientShell({
  tenantName,
  children,
}: {
  tenantName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLElement | null>(null);

  // Round 169 — 활성 탭이 화면 밖에 있으면 스크롤해서 보이게 (모바일 가로 스크롤 네비 필수 UX)
  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [pathname]);

  async function logout() {
    await fetch('/api/client/logout', { method: 'POST' });
    router.replace('/client/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
        {/* 1단: 정체성 — 모바일에서도 병원명이 반드시 온전히 보이도록 truncate + min-w-0 */}
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 md:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-400">
              WECIRCLE
            </span>
            <span className="h-3 w-px shrink-0 bg-stone-300" />
            <span className="truncate text-[15px] font-bold md:text-sm">{tenantName}</span>
          </div>

          {/* 데스크톱: 기존 한 줄 네비 복원 */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    active
                      ? 'bg-stone-900 font-semibold text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
            <button
              onClick={logout}
              className="ml-2 rounded-lg px-3 py-1.5 text-sm text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
            >
              로그아웃
            </button>
          </nav>

          {/* 모바일: 로그아웃만 (44px 타겟) */}
          <button
            onClick={logout}
            className="-mr-2 flex h-11 shrink-0 items-center rounded-lg px-2 text-[13px] text-stone-400 transition active:bg-stone-100 md:hidden"
          >
            로그아웃
          </button>
        </div>

        {/* 2단(모바일 전용): 가로 스크롤 탭 — 6개 메뉴를 잘림 없이, 44px 타겟으로 */}
        <nav
          ref={navRef}
          aria-label="포털 메뉴"
          className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
        >
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                data-active={active}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[40px] shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition ${
                  active
                    ? 'bg-stone-900 font-semibold text-white'
                    : 'bg-stone-100 text-stone-600 active:bg-stone-200'
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:px-5 md:py-8">{children}</main>

      <footer className="mx-auto max-w-5xl border-t border-stone-200 px-4 py-6 text-[11px] leading-relaxed text-stone-400 md:px-5">
        본 콘솔의 지표는 위서클 GEO 측정 파이프라인의 실측 집계입니다. 문의: 위서클 담당자
      </footer>
    </div>
  );
}
