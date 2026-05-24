import { TrendingUp, Database } from "lucide-react";
import { getFunnelRoi } from "@/lib/admin-data";
import { formatKstRelative } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function FunnelPage() {
  const rows = await getFunnelRoi(50);
  const totalClicks = rows.reduce((s, r) => s + r.click_count, 0);
  const totalInquiries = rows.reduce((s, r) => s + r.inquiry_count, 0);
  const totalCites = rows.reduce((s, r) => s + r.cite_count, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-bold tracking-tight text-ink">Funnel · ROI</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          Publication별 클릭 → 문의 매칭 → AI 인용. 자사 블로그 + 외부 채널 통합.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-line bg-white p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">총 클릭</div>
          <div className="mt-2 text-[24px] font-bold tabular-nums text-ink">{totalClicks.toLocaleString("ko-KR")}</div>
        </div>
        <div className="rounded-card border border-line bg-white p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">총 문의 매칭</div>
          <div className="mt-2 text-[24px] font-bold tabular-nums text-ink">{totalInquiries.toLocaleString("ko-KR")}</div>
        </div>
        <div className="rounded-card border border-line bg-white p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">총 AI 인용</div>
          <div className="mt-2 text-[24px] font-bold tabular-nums text-accent-deep">{totalCites.toLocaleString("ko-KR")}</div>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="flex items-start gap-3 rounded-card border border-amber-200 bg-amber-50 p-4">
          <Database size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="text-[13px] text-amber-800">
            Publication 0건 — 발행 데이터 들어오면 자동 노출됩니다.
          </div>
        </div>
      )}

      <div className="rounded-card border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line/70 px-5 py-3">
          <h2 className="text-[14px] font-semibold text-ink">Publication별 ROI ({rows.length}건)</h2>
          <span className="text-[11px] text-ink-subtle">전환율 = 문의 / 클릭 × 100</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="border-b border-line/70 bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3 text-left">채널</th>
                <th className="px-4 py-3 text-left">제목</th>
                <th className="px-4 py-3 text-right">클릭</th>
                <th className="px-4 py-3 text-right">문의</th>
                <th className="px-4 py-3 text-right">전환율</th>
                <th className="px-4 py-3 text-right">AI 인용</th>
                <th className="px-4 py-3 text-left">발행일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {rows.map((r) => (
                <tr key={r.publication_id} className="hover:bg-surface-alt/50">
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand-700">{r.channel}</span>
                  </td>
                  <td className="px-4 py-3">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-ink hover:text-brand hover:underline">
                      {r.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.click_count.toLocaleString("ko-KR")}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-brand-700">{r.inquiry_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.click_count > 0 ? `${r.conversion_pct.toFixed(2)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.cite_count > 0 ? <span className="font-semibold text-accent-deep">{r.cite_count}</span> : <span className="text-ink-subtle">0</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {r.published_at ? formatKstRelative(r.published_at) : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-subtle">데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line/70 bg-surface-alt/40 px-5 py-3 text-[11px] text-ink-subtle">
          ※ 자사 블로그(blog_html)는 자동 publication 등록 패치 미배포 — 현재 수동 백필분만 노출됨.
          외부 채널(naver/instagram)은 기존 등록 로직 사용.
        </div>
      </div>
    </div>
  );
}
