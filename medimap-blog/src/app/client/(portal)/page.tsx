import Link from "next/link";
import { FileText, MousePointer, Quote, Tag, Sparkles, Clock } from "lucide-react";
import { getClientDashboard, listClientPublications } from "@/lib/client-data";
import { formatKstRelative } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function ClientDashboard() {
  const [stats, pubs] = await Promise.all([getClientDashboard(), listClientPublications(5)]);

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[12px] font-semibold uppercase tracking-wider text-brand">현황 대시보드</div>
        <h1 className="mt-1 text-[24px] font-bold tracking-tight text-ink">{stats.tenantName} 운영 현황</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          메디맵이 발행 중인 콘텐츠와 AI 검색 인용 현황입니다.
          {stats.lastPublishedAt && (
            <> 마지막 발행: <span className="font-semibold text-ink">{formatKstRelative(stats.lastPublishedAt)}</span></>
          )}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={FileText} label="발행 콘텐츠" value={stats.publishedCount} accent="brand" />
        <KpiCard icon={Quote} label="AI 인용" value={stats.totalCites} accent="accent" desc="ChatGPT/Claude/Gemini/Perplexity 응답에 인용" />
        <KpiCard icon={MousePointer} label="총 클릭" value={stats.totalClicks} accent="brand" />
        <KpiCard icon={Tag} label="활성 키워드" value={stats.activeKeywords} accent="accent" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-card border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line/70 px-5 py-3">
            <h2 className="text-[14px] font-semibold text-ink">최근 발행 콘텐츠</h2>
            <Link href="/blog" className="text-[12px] font-semibold text-brand hover:underline">
              블로그 전체 →
            </Link>
          </div>
          <div className="divide-y divide-line/70">
            {pubs.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer"
                 className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-surface-alt/50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                      {p.channel}
                    </span>
                    {p.cite_count > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent-deep">
                        <Sparkles size={9} /> {p.cite_count} 인용
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 text-[14px] font-semibold text-ink truncate">{p.title}</div>
                </div>
                <div className="shrink-0 flex items-center gap-1 text-[11.5px] text-ink-subtle">
                  <Clock size={11} />
                  {p.published_at ? formatKstRelative(p.published_at) : "—"}
                </div>
              </a>
            ))}
            {pubs.length === 0 && (
              <div className="px-5 py-8 text-center text-[13px] text-ink-subtle">아직 발행된 콘텐츠가 없습니다.</div>
            )}
          </div>
        </div>

        <div className="rounded-card border border-line bg-gradient-to-br from-brand/5 to-accent/5 p-5">
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="mt-0.5 text-brand" />
            <div>
              <h3 className="text-[14px] font-bold text-ink">메디맵이 운영해 드립니다</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
                키워드 추가 / 병원 정보 변경 요청만 주시면 메디맵 에디터 팀이
                의료법 검수를 거쳐 AI 검색 인용 최적화 콘텐츠를 자동 발행합니다.
              </p>
              <Link href="/client/keywords" className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline">
                키워드 추가 →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent, desc }: {
  icon: typeof FileText; label: string; value: number; accent: "brand" | "accent"; desc?: string;
}) {
  const tint = accent === "brand" ? "bg-brand/10 text-brand" : "bg-accent/10 text-accent-deep";
  return (
    <div className="rounded-card border border-line bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-muted">{label}</div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tint}`}>
          <Icon size={15} />
        </div>
      </div>
      <div className="mt-3 text-[28px] font-extrabold tabular-nums tracking-tight text-ink">
        {value.toLocaleString("ko-KR")}
      </div>
      {desc && <div className="mt-1 text-[11px] text-ink-subtle">{desc}</div>}
    </div>
  );
}
