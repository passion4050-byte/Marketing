/**
 * Round 147 — 어드민: 병원 클라이언트 포털 계정 발급/관리.
 * 바비톡 병원관리자 모델 — 병원별 id/pw 를 발급해 전달, 병원은 /client 로 접속.
 */
import { getServerClient } from '@/lib/supabase';
import { ClientAccounts } from '@/components/admin/ClientAccounts';

export const dynamic = 'force-dynamic';

export const metadata = { title: '병원 계정 발급' };

export default async function AdminClientsPage() {
  const sb = getServerClient();
  let tenants: Array<{ id: number; name: string }> = [];
  if (sb) {
    const { data } = await sb
      .from('tenants')
      .select('id, name, status')
      .order('name', { ascending: true })
      .limit(200);
    tenants = ((data ?? []) as Array<{ id: number; name: string; status: string | null }>)
      .filter((t) => t.status !== 'archived')
      .map((t) => ({ id: t.id, name: t.name }));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-ink">병원 계정 발급</h1>
        <p className="mt-1 text-sm text-ink-subtle">
          병원(클라이언트)이 직접 로그인해 자기 지표만 보는 전용 콘솔(
          <span className="font-mono text-xs">/client</span>) 계정을 발급합니다. 발급된 접속정보를
          복사해 병원 담당자에게 전달하세요.
        </p>
      </div>
      <ClientAccounts tenants={tenants} />
    </div>
  );
}
