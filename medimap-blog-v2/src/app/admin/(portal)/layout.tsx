import { redirect } from 'next/navigation';
import { isAdminConfigured, requireAdmin } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  if (isAdminConfigured()) {
    const ok = await requireAdmin();
    if (!ok) redirect('/admin/login');
  }
  return <AdminShell>{children}</AdminShell>;
}
