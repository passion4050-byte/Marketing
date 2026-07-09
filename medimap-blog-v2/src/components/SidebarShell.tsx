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

  // Admin pages render their own layout (AdminShell). Skip client Sidebar.
  // Marketing pages are prospect-facing — no console chrome.
  if (isAdmin || isMarketing) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
