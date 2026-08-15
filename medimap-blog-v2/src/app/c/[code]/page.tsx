/**
 * Round 148-d — 병원 클라이언트 고유 진입 링크 (/c/{code}).
 * 어드민이 발급한 access_code 로 진입 → 병원명·아이디가 프리필된 로그인으로 안내.
 * ⚠️ Next 14 — params 는 동기 객체 (Promise 금지, CLAUDE.md 게이트 대상).
 * ⚠️ 신규 최상위 동적 라우트 — 예약 경로 /r(ShortLink)·/report(보고서)와 무충돌 확인됨.
 */
import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function ClientEntryPage({ params }: { params: { code: string } }) {
  const code = (params.code || '').trim();
  const sb = getServerClient();
  if (sb && /^[a-z0-9]{6,20}$/i.test(code)) {
    const { data } = await sb
      .from('client_accounts')
      .select('username, active, tenants(name)')
      .eq('access_code', code)
      .maybeSingle();
    type Row = {
      username: string;
      active: boolean;
      tenants: { name: string | null } | Array<{ name: string | null }> | null;
    };
    const row = data as unknown as Row | null;
    if (row && row.active) {
      const t = row.tenants;
      const name = (Array.isArray(t) ? t[0]?.name : t?.name) ?? '';
      const q = new URLSearchParams({ u: row.username, ...(name ? { h: name } : {}) });
      redirect(`/client/login?${q.toString()}`);
    }
  }
  redirect('/client/login');
}
