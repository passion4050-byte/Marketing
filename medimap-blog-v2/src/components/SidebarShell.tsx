'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';

export function SidebarShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  // Admin pages render their own layout (AdminShell). Skip client Sidebar.
  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
