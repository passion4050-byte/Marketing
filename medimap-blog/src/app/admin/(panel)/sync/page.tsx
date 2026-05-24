import { RefreshCw, Database, ExternalLink } from "lucide-react";
import { listDeployHooks } from "@/lib/admin-data";
import { formatKstRelative } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  const hooks = await listDeployHooks();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-bold tracking-tight text-ink">블로그 동기화</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          medimap-blog ISR 캐시 즉시 무효화. 자동 발행 직후 또는 수동 콘텐츠 추가 시 호출.
        </p>
      </header>

      {hooks.length === 0 && (
        <div className="flex items-start gap-3 rounded-card border border-amber-200 bg-amber-50 p-4">
          <Database size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="text-[13px] text-amber-800">Deploy hook 0건 — deploy_hooks 테이블 확인.</div>
        </div>
      )}

      <div className="rounded-card border border-line bg-white">
        <div className="border-b border-line/70 px-5 py-3">
          <h2 className="text-[14px] font-semibold text-ink">Deploy Hooks ({hooks.length}건)</h2>
        </div>
        <div className="divide-y divide-line/70">
          {hooks.map((h) => (
            <div key={h.id} className="flex items-center justify-between px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <RefreshCw size={14} className={h.enabled ? "text-brand" : "text-ink-subtle"} />
                  <span className="font-semibold text-ink">{h.name}</span>
                  {!h.enabled && (
                    <span className="rounded-full bg-status-neutral/20 px-2 py-0.5 text-[10px] font-semibold text-ink-subtle">
                      DISABLED
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[12px] text-ink-muted">
                  마지막 실행: {h.last_fired_at ? formatKstRelative(h.last_fired_at) : "없음"}
                  {h.last_status && (
                    <span className="ml-2 text-ink-subtle">· status: {h.last_status}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-line/70 bg-surface-alt/40 px-5 py-3 text-[11px] text-ink-subtle">
          ※ Deploy hook fire 는 fire_vercel_deploy_hook() RPC (service_role) 또는
          GH Actions cron workflow 의 마지막 step 에서 자동 호출.
        </div>
      </div>

      <div className="rounded-card border border-line bg-white p-5">
        <div className="flex items-start gap-3">
          <ExternalLink size={16} className="mt-0.5 text-brand" />
          <div className="flex-1 text-[13px]">
            <div className="font-semibold text-ink">관련 운영 페이지</div>
            <ul className="mt-2 space-y-1.5 text-ink-muted">
              <li>
                <a href="https://vercel.com/medimaps-projects/medimap-blog/deployments" target="_blank" rel="noopener noreferrer"
                   className="hover:text-brand hover:underline">
                  Vercel Deployments →
                </a>
              </li>
              <li>
                <a href="https://github.com/passion4050-byte/Marketing/actions" target="_blank" rel="noopener noreferrer"
                   className="hover:text-brand hover:underline">
                  GitHub Actions (cron) →
                </a>
              </li>
              <li>
                <a href="https://supabase.com/dashboard/project/gifopyowyankfsfghhdi" target="_blank" rel="noopener noreferrer"
                   className="hover:text-brand hover:underline">
                  Supabase Dashboard →
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
