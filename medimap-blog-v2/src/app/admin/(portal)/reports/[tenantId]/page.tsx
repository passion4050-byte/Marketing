'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { adminTenants, costDaily, citationEvents, funnelRows } from '@/lib/admin-mock';
import { printCurrentPage } from '@/lib/clientActions';

export default function TenantReportPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const tenant = adminTenants.find((t) => t.id === tenantId);

  useEffect(() => {
    // Apply print-friendly styles
    document.body.classList.add('print-report');
    return () => document.body.classList.remove('print-report');
  }, []);

  if (!tenant) {
    return <div className="p-10 text-center text-ink-muted">테넌트를 찾을 수 없습니다.</div>;
  }

  const cited = citationEvents.filter((c) => c.tenantId === tenantId);
  const funnel = funnelRows.filter((f) => f.tenantId === tenantId);
  const totalClicks = funnel.reduce((s, r) => s + r.clicks, 0);
  const totalInq = funnel.reduce((s, r) => s + r.inquiries, 0);
  const tenantCost = costDaily.reduce((s, d) => {
    const b = d.tenantBreakdown.find((x) => x.tenantId === tenantId);
    return s + (b?.usd ?? 0);
  }, 0);
  const period = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  return (
    <div className="mx-auto max-w-3xl px-8 py-10 print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-ink">월간 보고서 미리보기</h1>
        <button onClick={printCurrentPage} className="btn-primary text-xs">
          <Printer className="h-3.5 w-3.5" /> 인쇄 / PDF 저장
        </button>
      </div>

      <article className="card p-8 print:border-0 print:shadow-none">
        <header className="border-b border-border pb-5">
          <div className="text-[11px] font-bold uppercase tracking-widest text-brand-700">
            MEDIMAP GEO · Monthly Report
          </div>
          <h1 className="mt-2 text-2xl font-bold text-ink">{tenant.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">기간: {period} · 카테고리: {tenant.category} · 지역: {tenant.region}</p>
        </header>

        <section className="mt-6">
          <h2 className="text-base font-bold text-ink">핵심 지표</h2>
          <div className="mt-3 grid grid-cols-2 gap-4">
            {[
              { l: '월 발행', v: tenant.publishCount, u: '건' },
              { l: 'AI 인용', v: cited.length, u: '회' },
              { l: '클릭', v: totalClicks, u: '회' },
              { l: '문의 전환', v: totalInq, u: '건' }
            ].map((k) => (
              <div key={k.l} className="rounded-lg bg-surface-subtle p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{k.l}</div>
                <div className="mt-1 text-2xl font-bold text-ink">{k.v.toLocaleString()}<span className="ml-1 text-xs font-semibold text-ink-muted">{k.u}</span></div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-bold text-ink">AI 인용 이벤트 ({cited.length})</h2>
          <ul className="mt-3 space-y-2">
            {cited.map((c) => (
              <li key={c.id} className="rounded-md border border-border p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-brand-50 px-1.5 py-0.5 font-bold uppercase text-brand-700">{c.engine}</span>
                  <span className="font-semibold text-ink">"{c.query}"</span>
                </div>
                <p className="mt-1 text-ink-soft">{c.excerpt}</p>
              </li>
            ))}
            {cited.length === 0 && <li className="text-xs text-ink-muted">인용 이벤트 없음</li>}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-bold text-ink">Funnel · ROI</h2>
          <table className="mt-3 w-full text-xs">
            <thead className="bg-surface-subtle text-[10px] font-bold uppercase">
              <tr>
                <th className="px-3 py-2 text-left">ShortLink</th>
                <th className="px-3 py-2 text-left">소스</th>
                <th className="px-3 py-2 text-right">클릭</th>
                <th className="px-3 py-2 text-right">문의</th>
                <th className="px-3 py-2 text-right">전환</th>
              </tr>
            </thead>
            <tbody>
              {funnel.map((r) => (
                <tr key={r.shortLink} className="border-t border-border">
                  <td className="px-3 py-2 font-mono">{r.shortLink}</td>
                  <td className="px-3 py-2">{r.source}</td>
                  <td className="px-3 py-2 text-right">{r.clicks}</td>
                  <td className="px-3 py-2 text-right">{r.inquiries}</td>
                  <td className="px-3 py-2 text-right font-bold text-status-success">{r.conversionRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6">
          <h2 className="text-base font-bold text-ink">LLM 비용</h2>
          <p className="mt-2 text-sm text-ink-soft">
            기간 누적 LLM API 비용: <strong>${tenantCost.toFixed(2)}</strong> (일 평균 ${(tenantCost / 14).toFixed(2)})
          </p>
        </section>

        <footer className="mt-8 border-t border-border pt-4 text-center text-[10px] text-ink-muted">
          MEDIMAP GEO · Hospital AI Platform · {new Date().toLocaleString('ko-KR')}
        </footer>
      </article>
    </div>
  );
}
