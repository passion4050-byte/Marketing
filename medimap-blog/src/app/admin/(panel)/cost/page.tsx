import { Database, DollarSign, Zap } from "lucide-react";
import { getLlmCostTotals, getLlmCostDaily } from "@/lib/admin-data";
import { KpiCard } from "@/components/admin/KpiCard";

export const dynamic = "force-dynamic";

const DAILY_CAP_USD = 10; // MAX_DAILY_USD 기본값

function usd(n: number) {
  return `$${n.toFixed(4)}`;
}

export default async function CostPage() {
  const [totals, daily] = await Promise.all([
    getLlmCostTotals(),
    getLlmCostDaily(30),
  ]);

  const todayPct = Math.min(100, (totals.today / DAILY_CAP_USD) * 100);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-bold tracking-tight text-ink">LLM 비용</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          OpenAI / Anthropic / Gemini / Perplexity 호출 비용 합산. 일일 가드레일 ${DAILY_CAP_USD}/일.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-card border border-line bg-white p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            <DollarSign size={14} /> 오늘 USD
          </div>
          <div className="mt-2 text-[24px] font-bold tabular-nums text-ink">{usd(totals.today)}</div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-surface-alt">
            <div
              className={`h-full rounded-full ${todayPct > 80 ? "bg-status-warning" : "bg-brand"}`}
              style={{ width: `${todayPct}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-ink-subtle tabular-nums">
            {todayPct.toFixed(1)}% / ${DAILY_CAP_USD}
          </div>
        </div>
        <KpiCard label="지난 7일" value={usd(totals.last7)} icon={<DollarSign size={14} />} tone="accent" />
        <KpiCard label="지난 30일" value={usd(totals.last30)} icon={<DollarSign size={14} />} tone="brand" />
        <KpiCard label="총 호출" value={totals.totalCalls.toLocaleString("ko-KR")} icon={<Zap size={14} />} tone="accent" />
      </div>

      {totals.totalCalls === 0 && (
        <div className="flex items-start gap-3 rounded-card border border-amber-200 bg-amber-50 p-4">
          <Database size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="text-[13px] text-amber-800">
            <div className="font-semibold">LLM 호출 0건</div>
            <p className="mt-1">DATABASE_URL 미설정 또는 llm_call_logs 비어있음.</p>
          </div>
        </div>
      )}

      <div className="rounded-card border border-line bg-white">
        <div className="border-b border-line/70 px-5 py-3">
          <h2 className="text-[14px] font-semibold text-ink">Provider별 (지난 30일)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="border-b border-line/70 bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3 text-left">Provider</th>
                <th className="px-4 py-3 text-right">호출 수</th>
                <th className="px-4 py-3 text-right">비용</th>
                <th className="px-4 py-3 text-right">호출당 평균</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {Object.entries(totals.byProvider).map(([provider, v]) => {
                const avg = v.calls > 0 ? v.cost / v.calls : 0;
                return (
                  <tr key={provider}>
                    <td className="px-4 py-3 font-semibold text-ink">{provider}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{v.calls.toLocaleString("ko-KR")}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{usd(v.cost)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-subtle">{usd(avg)}</td>
                  </tr>
                );
              })}
              {Object.keys(totals.byProvider).length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-subtle">데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-card border border-line bg-white">
        <div className="border-b border-line/70 px-5 py-3">
          <h2 className="text-[14px] font-semibold text-ink">일별 (최근 30일, KST)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="border-b border-line/70 bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3 text-left">날짜</th>
                <th className="px-4 py-3 text-left">Provider</th>
                <th className="px-4 py-3 text-left">Model</th>
                <th className="px-4 py-3 text-right">호출</th>
                <th className="px-4 py-3 text-right">비용</th>
                <th className="px-4 py-3 text-right">In tokens</th>
                <th className="px-4 py-3 text-right">Out tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {daily.map((r, i) => (
                <tr key={`${r.day}-${r.provider}-${r.model}-${i}`}>
                  <td className="px-4 py-3 text-ink-muted">{r.day}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{r.provider}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.model}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.calls.toLocaleString("ko-KR")}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{usd(r.cost_usd)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-subtle">{r.input_tokens.toLocaleString("ko-KR")}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-subtle">{r.output_tokens.toLocaleString("ko-KR")}</td>
                </tr>
              ))}
              {daily.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-subtle">데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
