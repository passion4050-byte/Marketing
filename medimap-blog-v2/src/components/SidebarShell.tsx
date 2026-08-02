'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';

export function SidebarShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  // 마케팅/영업 앞문(잠재고객용) — 콘솔 사이드바 없이 깨끗한 풀블리드 렌더.
  const isMarketing =
    pathname === '/scanner' ||
    (pathname?.startsWith('/scanner/') ?? false) ||
    pathname === '/geo' ||
    (pathname?.startsWith('/geo/') ?? false);

  // Round 144 — 클라이언트 공개 월간 보고서(/r/{tenant}/{period}).
  //   병원 담당자가 받는 링크라 콘솔 사이드바(다른 메뉴·타 클라이언트 동선)가
  //   보이면 안 됨. 단독 문서로 렌더.
  const isClientReport = pathname?.startsWith('/r/') ?? false;

  // Admin pages render their own layout (AdminShell). Skip client Sidebar.
  // Marketing pages are prospect-facing — no console chrome.
  if (isAdmin || isMarketing || isClientReport) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
