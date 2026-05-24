/**
 * Admin / Funnel — Publication별 ROI + 일일 깔때기.
 * Supabase가 없으면 mock-data로 표시.
 */

import { Header } from '@/components/Header';
import { publications } from '@/lib/mock-data';
import { formatKstDateTime } from '@/lib/format';
import { getServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

async function loadRoi(): Promise<typeof publications> {
  const client = getServerClient();
  if (!client) return publications;
  const { data, error } = await client.from('v_publication_roi').select('*').order('published_at', { ascending: false });
  if (error || !data) return publications;
  return data as unknown as typeof publications;
}

export default async function FunnelAdminPage() {
  const rows = await loadRoi();

  return (
    <>
      <Header
        title="Funnel · 발행 → 클릭 → 문의 ROI"
        subtitle="각 발행물의 클릭 수, 문의 매칭, 전환율을 한 화면에서 확인합니다."
      />

      <section className="px-8 py-6">
        <div className="card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="section-title">Publication ROI ({rows.length}건)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-subtle text-xs font-semibold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3 text-left">채널</th>
                  <th className="px-4 py-3 text-left">제목</th>
                  <th className="px-4 py-3 text-left">발행일</th>
                  <th className="px-4 py-3 text-right">7일 PV</th>
                  <th className="px-4 py-3 text-right">총 클릭</th>
                  <th className="px-4 py-3 text-right">문의 매칭</th>
                  <th className="px-4 py-3 text-right">전환율</th>
                  <th className="px-4 py-3 text-left">AI 인용 엔진</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r: any) => {
                  const clicks = Number(r.total_clicks ?? r.pageviews_7d ?? 0);
                  const inq = Number(r.inquiries_attributed ?? 0);
                  const pct = clicks > 0 ? ((inq / clicks) * 100).toFixed(2) : '—';
                  return (
                    <tr key={r.id ?? r.url}>
                      <td className="px-4 py-3">
                        <span className="chip-brand">{r.channel}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {r.title}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{formatKstDateTime(r.published_at).slice(0, 10)}</td>
                      <td className="px-4 py-3 text-right text-ink">{(r.pageviews_7d ?? 0).toLocaleString('ko-KR')}</td>
                      <td className="px-4 py-3 text-right text-ink">{clicks.toLocaleString('ko-KR')}</td>
                      <td className="px-4 py-3 text-right font-semibold text-brand-700">{inq}</td>
                      <td className="px-4 py-3 text-right text-ink">{pct === '—' ? '—' : `${pct}%`}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(r.citedByEngines ?? r.cited_by_engines ?? []).map((e: string) => (
                            <span key={e} className="chip-success">{e}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-xs text-ink-muted">
          ※ 전환율 = (문의 매칭 / 총 클릭) × 100. 같은 visitor가 여러 ShortLink를 거친 경우 <b>마지막 클릭</b>에 attribution 적립.
        </p>
      </section>
    </>
  );
}
