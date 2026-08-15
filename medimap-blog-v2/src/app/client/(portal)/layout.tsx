/**
 * Round 147 — 병원 클라이언트 포털 레이아웃 (가드).
 * 세션 없으면 /client/login 으로. 검색/AI 크롤러 인덱싱 금지.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getClientSession } from '@/lib/client-auth';
import { getServerClient } from '@/lib/supabase';
import { ClientShell } from '@/components/client/ClientShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  title: { default: '병원 관리자 · WECIRCLE', template: '%s · 병원 관리자 · WECIRCLE' },
};

export default async function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const session = getClientSession();
  if (!session) redirect('/client/login');

  let tenantName = `병원 #${session.tenantId}`;
  const sb = getServerClient();
  if (sb) {
    const { data } = await sb.from('tenants').select('name').eq('id', session.tenantId).maybeSingle();
    const n = (data as { name?: string } | null)?.name;
    if (n) tenantName = n;
  }

  return <ClientShell tenantName={tenantName}>{children}</ClientShell>;
}
