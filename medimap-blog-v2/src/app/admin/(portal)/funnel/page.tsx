'use client';

import { funnelRows } from '@/lib/admin-mock';

export default function FunnelPage() {
  const totalClicks = funnelRows.reduce((s, r) => s + r.clicks, 0);
  const totalInq = funnelRows.reduce((s, r) => s + r.inquiries, 0);
  const avgConv = funnelRows.reduce((s, r) => s + r.conversionRate, 0) / funnelRows.length;

  return (
    <div className="px-8 py-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-ink">Funnel · ROI</h1>
        <p className="mt-1 text-sm text-ink-muted">ShortLink 클릭 → 문의 매칭 → 클라이언트 ROI</p>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card card-pad">
          <div className="kpi-label">총 클릭 (30d)</div>
          <div className="kpi-value">{totalClicks.toLocaleString()}</div>
        </div>
        <div className="card card-pad">
          <div className="kpi-label">총 문의 (30d)</div>
          <div className="kpi-value">{totalInq}</div>
        </div>
        <div className="card card-pad">
          <div className="kpi-label">평균 전환율</div>
          <div className="kpi-value">{avgConv.toFixed(1)}%</div>
        </div>
      </section>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3 text-left">ShortLink</th>
              <th className="px-4 py-3 text-left">테넌트 / 소스</th>
              <th className="px-4 py-3 text-right">클릭</th>
              <th className="px-4 py-3 text-right">문의</th>
              <th className="px-4 py-3 text-right">전환율</th>
            </tr>
          </thead>
          <tbody>
            {funnelRows.map((r) => (
              <tr key={r.shortLink} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs">{r.shortLink}</td>
                <td className="px-4 py-3 text-xs">
                  <div className="font-semibold text-ink">{r.tenantName}</div>
                  <div className="text-ink-muted">{r.source}</div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">{r.clicks}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{r.inquiries}</td>
                <td className="px-4 py-3 text-right font-mono text-xs font-bold text-status-success">
                  {r.conversionRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
