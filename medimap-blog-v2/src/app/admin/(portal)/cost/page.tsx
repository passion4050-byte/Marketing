/**
 * Round 84 (2026-06-28) — 비용 모니터 server component.
 *
 * 이전: Mock 데이터 (admin-mock.ts) 사용 + MockBanner. 사용자 지시 — mock 제거.
 * 지금: llm_call_logs 테이블 query (Round 81 USD 실토큰 미터링 산출물).
 *   - 일별 비용 (14일)
 *   - provider 별 비용 비중
 *   - tenant 별 비용 (오늘)
 *   - 데이터 없으면 빈 상태 메시지 ("측정 데이터 누적 중" — 허위 표시 금지)
 */
import { DollarSign } from 'lucide-react';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface LlmCallLog {
  tenant_id: number | null;
  called_at: string;
  provider: string | null;
  cost_usd: number | null;
  status: string | null;
}

interface Tenant {
  id: number;
  name: string;
  status: string | null;
}

export default async function CostPage() {
  const sb = getServerClient();

  let logs: LlmCallLog[] = [];
  let tenants: Tenant[] = [];
  let dataError: string | null = null;

  if (!sb) {
    dataError = 'Supabase 미연결 — 환경변수 확인 필요';
  } else {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: logRows, error: logErr } = await sb
      .from('llm_call_logs')
      .select('tenant_id, called_at, provider, cost_usd, status')
      .gte('called_at', since)
      .order('called_at', { ascending: true })
      .limit(10000);
    if (logErr) {
      dataError = `llm_call_logs query 실패: ${logErr.message}`;
    } else {
      logs = (logRows ?? []) as LlmCallLog[];
    }

    const { data: tRows } = await sb
      .from('tenants')
      .select('id, name, status')
      .limit(200);
    tenants = (tRows ?? []) as Tenant[];
  }

  // 일별 집계
  const dailyMap = new Map<string, number>();
  for (const r of logs) {
    const d = (r.called_at ?? '').slice(0, 10);
    if (!d) continue;
    dailyMap.set(d, (dailyMap.get(d) ?? 0) + (r.cost_usd ?? 0));
  }
  const dailyRows = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, usd]) => ({ date, usd }));

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayUsd = dailyMap.get(todayKey) ?? 0;
  const total14d = dailyRows.reduce((s, r) => s + r.usd, 0);
  const MAX_DAILY = parseFloat(process.env.MAX_DAILY_USD ?? '5');
  const yesterdayKey = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const yesterdayUsd = dailyMap.get(yesterdayKey) ?? 0;
  const delta = yesterdayUsd > 0 ? ((todayUsd - yesterdayUsd) / yesterdayUsd) * 100 : 0;

  // provider 별 (claude → anthropic 통합)
  const providerMap = new Map<string, { usd: number; calls: number }>();
  for (const r of logs) {
    const p = (r.provider ?? 'unknown').toLowerCase();
    const norm = p === 'claude' ? 'anthropic' : p;
    const prev = providerMap.get(norm) ?? { usd: 0, calls: 0 };
    providerMap.set(norm, {
      usd: prev.usd + (r.cost_usd ?? 0),
      calls: prev.calls + 1,
    });
  }
  const providerRows = Array.from(providerMap.entries())
    .sort(([, a], [, b]) => b.usd - a.usd)
    .map(([provider, v]) => ({ provider, ...v }));

  // tenant 별 (오늘)
  const tenantNameMap = new Map(tenants.map((t) => [t.id, t.name]));
  const tenantTodayMap = new Map<number, number>();
  for (const r of logs) {
    if (!r.tenant_id) continue;
    if (!(r.called_at ?? '').startsWith(todayKey)) continue;
    tenantTodayMap.set(r.tenant_id, (tenantTodayMap.get(r.tenant_id) ?? 0) + (r.cost_usd ?? 0));
  }
  const tenantRows = Array.from(tenantTodayMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([tid, usd]) => ({
      tenantId: tid,
      tenantName: tenantNameMap.get(tid) ?? `tenant#${tid}`,
      usd,
    }));

  const activeTenants = tenants.filter((t) => t.status === 'active').length;
  const hasData = logs.length > 0;

  return (
    <div className="px-8 py-6">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">비용 모니터</h1>
          <p className="admin-page-desc">
            AI 모델 호출 비용과 일별 추이 — Round 81 USD 실토큰 미터링 기반 (라이브 llm_call_logs)
          </p>
        </div>
      </header>

      {dataError && (
        <div className="mb-4 rounded-lg border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
          ⚠ 데이터 로드 실패: {dataError}
        </div>
      )}

      {!hasData && !dataError && (
        <div className="mb-4 rounded-lg border border-border bg-surface-subtle px-4 py-3 text-sm text-ink-muted">
          <div className="font-semibold text-ink">📊 측정 데이터 누적 중</div>
          <div className="mt-1 text-xs">
            llm_call_logs 테이블이 비어있습니다. auto-publish cron 1~2회 실행 후 자동 누적됩니다.
          </div>
        </div>
      )}

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="card card-pad">
          <div className="kpi-label">오늘 비용</div>
          <div className="kpi-value">${todayUsd.toFixed(2)}</div>
          <div className="text-xs text-ink-muted">
            {yesterdayUsd > 0 ? `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(0)}% vs 어제` : '비교 데이터 없음'}
          </div>
        </div>
        <div className="card card-pad">
          <div className="kpi-label">일일 가드</div>
          <div className="kpi-value">${MAX_DAILY.toFixed(2)}</div>
          <div className="text-xs text-ink-muted">
            {MAX_DAILY > 0 ? `${((todayUsd / MAX_DAILY) * 100).toFixed(0)}% 사용` : 'MAX_DAILY_USD 미설정'}
          </div>
        </div>
        <div className="card card-pad">
          <div className="kpi-label">14일 누적</div>
          <div className="kpi-value">${total14d.toFixed(2)}</div>
          <div className="text-xs text-ink-muted">일평균 ${(total14d / Math.max(dailyRows.length, 1)).toFixed(2)}</div>
        </div>
        <div className="card card-pad">
          <div className="kpi-label">활성 테넌트</div>
          <div className="kpi-value">{activeTenants}</div>
          <div className="text-xs text-ink-muted">월 청구 대상</div>
        </div>
      </section>

      {hasData && (
        <section className="card mb-4">
          <header className="border-b border-border px-5 py-3">
            <h2 className="section-title">일별 비용 (실측, 최근 14일)</h2>
          </header>
          <div className="p-5">
            <div className="flex h-40 items-end gap-1">
              {dailyRows.map((d) => {
                const max = Math.max(...dailyRows.map((x) => x.usd), 0.01);
                const pct = (d.usd / max) * 100;
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-ink"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                      title={`${d.date}: $${d.usd.toFixed(4)}`}
                    />
                    <span className="text-[9px] text-ink-muted">{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {hasData && providerRows.length > 0 && (
        <section className="card mb-4">
          <header className="border-b border-border px-5 py-3">
            <h2 className="section-title">Provider 별 비용 (14일)</h2>
          </header>
          <table className="w-full text-sm">
            <thead className="bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3 text-left">Provider</th>
                <th className="px-4 py-3 text-right">호출 수</th>
                <th className="px-4 py-3 text-right">14일 USD</th>
                <th className="px-4 py-3 text-right">호출당 평균</th>
                <th className="px-4 py-3 text-right">비중</th>
              </tr>
            </thead>
            <tbody>
              {providerRows.map((p) => {
                const pct = total14d > 0 ? (p.usd / total14d) * 100 : 0;
                return (
                  <tr key={p.provider} className="border-t border-border">
                    <td className="px-4 py-3 text-sm font-semibold text-ink capitalize">{p.provider}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{p.calls.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">${p.usd.toFixed(4)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      ${p.calls > 0 ? (p.usd / p.calls).toFixed(5) : '0.00'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{pct.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {hasData && tenantRows.length > 0 && (
        <section className="card">
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
              {tenantRows.map((b) => {
                const pct = todayUsd > 0 ? (b.usd / todayUsd) * 100 : 0;
                return (
                  <tr key={b.tenantId} className="border-t border-border">
                    <td className="px-4 py-3 text-sm font-semibold text-ink">{b.tenantName}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">${b.usd.toFixed(4)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{pct.toFixed(0)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {hasData && tenantRows.length === 0 && (
        <div className="card card-pad text-center text-sm text-ink-muted">
          <DollarSign className="mx-auto mb-2 h-6 w-6 opacity-40" />
          오늘은 아직 tenant 별 호출이 없습니다. (cron 발행 시점부터 누적)
        </div>
      )}
    </div>
  );
}
