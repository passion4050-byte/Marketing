'use client';

/**
 * Round 147 — 병원 클라이언트 포털 셸.
 * 바비톡 병원관리자 레퍼런스: 상단 병원명 + 얇은 네비 + 로그아웃.
 * 어드민 콘솔(AdminShell)과 완전 분리 — 병원에게 필요한 메뉴만.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/client', label: '홈' },
  { href: '/client/contents', label: '발행 콘텐츠' },
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

  async function logout() {
    await fetch('/api/client/logout', { method: 'POST' });
    router.replace('/client/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-400">
              WECIRCLE
            </span>
            <span className="h-3 w-px bg-stone-300" />
            <span className="text-sm font-bold">{tenantName}</span>
          </div>
          <nav className="flex items-center gap-1">
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
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
      <footer className="mx-auto max-w-5xl border-t border-stone-200 px-5 py-6 text-[11px] text-stone-400">
        본 콘솔의 지표는 위서클 GEO 측정 파이프라인의 실측 집계입니다. 문의: 위서클 담당자
      </footer>
    </div>
  );
}
