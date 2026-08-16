/**
 * Round 152 — 포털 드릴다운: 상담 클릭 세부 내역.
 * 발행 콘텐츠의 상담 버튼(/r/ 추적 링크) 클릭 로그 — 최근 30일.
 */
import Link from 'next/link';
import { getClientSession } from '@/lib/client-auth';
import { getServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default async function ClientClicksPage() {
  const session = getClientSession();
  const sb = getServerClient();
  if (!session || !sb) return null;

  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data } = await sb
    .from('shortlink_clicks')
    .select('clicked_at, country, referer')
    .eq('tenant_id', session.tenantId)
    .gte('clicked_at', since)
    .order('clicked_at', { ascending: false })
    .limit(200);

  const rows = (data ?? []) as Array<{
    clicked_at: string | null;
    country: string | null;
    referer: string | null;
  }>;

  return (
    <div>
      <Link href="/client" className="text-xs text-stone-500 underline underline-offset-4 hover:text-stone-900">
        ← 홈
      </Link>
      <div className="mb-6 mt-3">
        <h1 className="text-xl font-bold tracking-tight">상담 클릭</h1>
        <p className="mt-1 text-sm text-stone-500">
          발행 콘텐츠의 상담 버튼이 눌린 기록입니다 (최근 30일{' '}
          <span className="font-semibold tabular-nums text-stone-700">{rows.length}</span>건).
          클릭 후 메신저 대화는 카카오톡/메신저 앱에서 이어집니다.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-none border border-stone-200 bg-white p-6 text-sm text-stone-400">
          최근 30일 클릭 기록이 없습니다. 콘텐츠가 AI 에 인용되기 시작하면 이 지표가 먼저 움직입니다.
        </p>
      ) : (
        <div className="overflow-x-auto border-t-2 border-stone-900 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                <th className="px-4 py-2.5 font-medium">시각</th>
                <th className="px-4 py-2.5 font-medium">국가</th>
                <th className="px-4 py-2.5 font-medium">유입 경로</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={i} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-2.5 tabular-nums text-stone-700">{fmtDateTime(c.clicked_at)}</td>
                  <td className="px-4 py-2.5 text-stone-600">{c.country ?? '—'}</td>
                  <td className="max-w-[360px] truncate px-4 py-2.5 text-stone-500">
                    {(() => {
                      // Round 153 (감사 P2-12) — 긴 URL 대신 경로만 (모바일 가로스크롤 완화)
                      if (!c.referer) return '직접 접속';
                      try {
                        const u = new URL(c.referer);
                        const path = decodeURIComponent(u.pathname);
                        return u.hostname.includes('wecircle')
                          ? path
                          : `${u.hostname.replace(/^www\./, '')}${path === '/' ? '' : path}`;
                      } catch {
                        return c.referer.replace(/^https?:\/\//, '');
                      }
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
