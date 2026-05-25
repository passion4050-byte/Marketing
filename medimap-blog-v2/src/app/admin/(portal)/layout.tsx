import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isAdminConfigured, requireAdmin } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

// SaaS 콘솔은 검색 엔진 / AI 크롤러 인덱싱 금지
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false }
  },
  title: { default: 'Admin · MEDIMAP GEO', template: '%s · Admin · MEDIMAP GEO' }
};

export default async function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  if (isAdminConfigured()) {
    const ok = await requireAdmin();
    if (!ok) redirect('/admin/login');
  }
  return <AdminShell>{children}</AdminShell>;
}
