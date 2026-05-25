'use client';

import { MockBanner } from '@/components/admin/MockBanner';

import { costDaily, adminTenants } from '@/lib/admin-mock';

export default function CostPage() {
  const total14d = costDaily.reduce((s, d) => s + d.usd, 0);
  const todayUsd = costDaily[costDaily.length - 1]?.usd ?? 0;
  const MAX_DAILY = 10;
  const yesterdayUsd = costDaily[costDaily.length - 2]?.usd ?? 0;
  const delta = yesterdayUsd > 0 ? ((todayUsd - yesterdayUsd) / yesterdayUsd) * 100 : 0;

  return (
    <div className="px-8 py-6">
      <MockBanner source="Gemini API billing + Vercel function invocation" />
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-ink">비용 모니터</h1>
        <p className="mt-1 text-sm text-ink-muted">Gemini API + 인프라 비용 (USD)</p>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="card card-pad">
          <div className="kpi-label">오늘 비용</div>
          <div className="kpi-value">${todayUsd.toFixed(2)}</div>
          <div className="text-xs text-ink-muted">{delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}%</div>
        </div>
        <div className="card card-pad">
          <div className="kpi-label">일일 가드</div>
          <div className="kpi-value">${MAX_DAILY.toFixed(2)}</div>
          <div className="text-xs text-ink-muted">{((todayUsd / MAX_DAILY) * 100).toFixed(0)}% 사용</div>
        </div>
        <div className="card card-pad">
          <div className="kpi-label">14일 누적</div>
          <div className="kpi-value">${total14d.toFixed(2)}</div>
          <div className="text-xs text-ink-muted">일평균 ${(total14d / 14).toFixed(2)}</div>
        </div>
        <div className="card card-pad">
          <div className="kpi-label">활성 테넌트</div>
          <div className="kpi-value">{adminTenants.filter((t) => t.status === 'active').length}</div>
          <div className="text-xs text-ink-muted">월 청구 대상</div>
        </div>
      </section>

      <section className="card">
        <header className="border-b border-border px-5 py-3">
          <h2 className="section-title">일별 비용 (최근 14일)</h2>
        </header>
        <div className="p-5">
          <div className="flex h-40 items-end gap-1">
            {costDaily.map((d) => {
              const pct = (d.usd / Math.max(...costDaily.map((x) => x.usd))) * 100;
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-brand" style={{ height: `${pct}%` }} title={`${d.date}: $${d.usd}`} />
                  <span className="text-[9px] text-ink-muted">{d.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="card mt-4">
        <header className="border-b border-border px-5 py-3">
          <h2 className="section-title">테넌트별 비용 (오늘)</h2>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3 text-left">테넌트</th>
              <th className="px-4 py-3 text-right">오늘 USD</th>
              <th className="px-4 py-3 text-right">비율</th>
            </tr>
          </thead>
          <tbody>
            {(costDaily[costDaily.length - 1]?.tenantBreakdown ?? []).map((b) => {
              const t = adminTenants.find((x) => x.id === b.tenantId);
              const pct = todayUsd > 0 ? (b.usd / todayUsd) * 100 : 0;
              return (
                <tr key={b.tenantId} className="border-t border-border">
                  <td className="px-4 py-3 text-sm font-semibold text-ink">{t?.name ?? b.tenantId}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">${b.usd.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{pct.toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}