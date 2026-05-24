import { Database, FileText } from "lucide-react";
import { listPublications, getPublicationStats } from "@/lib/admin-data";
import { KpiCard } from "@/components/admin/KpiCard";
import { formatKstRelative } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function PublicationsPage() {
  const [rows, stats] = await Promise.all([
    listPublications(100),
    getPublicationStats(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-bold tracking-tight text-ink">발행 관리</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          자사 블로그 + 외부 채널(네이버/Instagram 등) 발행글 통합 관리. AI 인용 횟수와 함께 추적.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="총 발행" value={stats.total} icon={<FileText size={14} />} tone="brand" />
        <KpiCard label="채널 종류" value={Object.keys(stats.byChannel).length} tone="accent" />
        <KpiCard label="총 AI 인용" value={stats.totalCites} tone="brand" />
        <KpiCard label="인용된 발행" value={stats.withCitations} tone="accent" />
      </div>

      {stats.total === 0 && (
        <div className="flex items-start gap-3 rounded-card border border-amber-200 bg-amber-50 p-4">
          <Database size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="text-[13px] text-amber-800">
            <div className="font-semibold">Publication 0건</div>
            <p className="mt-1">DATABASE_URL 미설정 또는 자동 발행 → publications 자동 등록 패치 미배포 상태.</p>
          </div>
        </div>
      )}

      <div className="rounded-card border border-line bg-white">
        <div className="border-b border-line/70 px-5 py-3">
          <h2 className="text-[14px] font-semibold text-ink">
            발행 리스트 ({rows.length}건)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="border-b border-line/70 bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3 text-left">채널</th>
                <th className="px-4 py-3 text-left">제목</th>
                <th className="px-4 py-3 text-left">블로그</th>
                <th className="px-4 py-3 text-right">인용</th>
                <th className="px-4 py-3 text-left">발행일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-surface-alt/50">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                      {r.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                       className="font-medium text-ink hover:text-brand hover:underline">
                      {r.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{r.blog_name ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={r.cite_count > 0 ? "font-bold text-accent-deep" : "text-ink-subtle"}>
                      {r.cite_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {r.published_at ? formatKstRelative(r.published_at) : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-subtle">
                    발행글이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
