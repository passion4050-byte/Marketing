import { Database, Users, Power } from "lucide-react";
import { listTenantsSummary } from "@/lib/admin-data";
import { formatKstRelative } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const rows = await listTenantsSummary();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-bold tracking-tight text-ink">테넌트 & 자동 발행</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          멀티테넌트 SaaS 의 테넌트 운영 현황 + 자동 콘텐츠 큐 설정.
        </p>
      </header>

      {rows.length === 0 && (
        <div className="flex items-start gap-3 rounded-card border border-amber-200 bg-amber-50 p-4">
          <Database size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="text-[13px] text-amber-800">테넌트 0건 — DATABASE_URL 또는 tenants 테이블 확인.</div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {rows.map((t) => {
          const lastRunOld = t.last_run_at
            ? Date.now() - new Date(t.last_run_at).getTime() > 1000 * 60 * 60 * 25
            : true;
          return (
            <div key={t.id} className="rounded-card border border-line bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-brand" />
                    <h3 className="text-[15px] font-bold text-ink">{t.name}</h3>
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-subtle">tenant_id: {t.id}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {t.auto_enabled && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent-deep">
                      <Power size={11} /> ENABLED
                    </span>
                  )}
                  {t.auto_publish && (
                    <span className="inline-flex rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                      AUTO-PUBLISH
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line/70 pt-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-muted">키워드</div>
                  <div className="mt-1 text-[18px] font-bold tabular-nums text-ink">{t.active_keywords}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-muted">생성</div>
                  <div className="mt-1 text-[18px] font-bold tabular-nums text-ink">{t.generated_count}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-ink-muted">발행</div>
                  <div className="mt-1 text-[18px] font-bold tabular-nums text-brand">{t.published_count}</div>
                </div>
              </div>

              <div className="mt-4 border-t border-line/70 pt-3 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">자동 콘텐츠 daily_count</span>
                  <span className="font-semibold tabular-nums text-ink">{t.daily_count}/일</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-ink-muted">마지막 cron 실행</span>
                  <span className={lastRunOld ? "font-semibold text-status-danger" : "text-ink"}>
                    {t.last_run_at ? formatKstRelative(t.last_run_at) : "없음"}
                    {lastRunOld && t.last_run_at && " ⚠️"}
                  </span>
                </div>
              </div>
              {lastRunOld && (
                <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[11.5px] text-amber-800">
                  25시간+ 미실행 — GH Actions cron / Streamlit Cloud 슬립 확인 필요
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
