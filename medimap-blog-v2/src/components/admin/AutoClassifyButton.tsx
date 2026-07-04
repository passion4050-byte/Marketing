/**
 * Round 42 A (2026-05-31) — 자동 분류 일괄 등록 버튼.
 *
 * /admin 의 신규 도메인 차트 옆 또는 /admin/domain-classifications 에서 사용.
 * 클릭 시 /api/admin/auto-classify-domains POST → rule-based 매칭 → DB INSERT.
 * 결과 토스트 또는 인라인 표시.
 */
'use client';

import { useState } from 'react';
import { Sparkles, Loader2, CheckCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';

type ApiResponse = {
  ok: boolean;
  error?: string;
  total_candidates: number;
  added: Array<{ domain: string; tier: string; category: string; confidence: number; reason: string }>;
  skipped: Array<{ domain: string; reason: string }>;
  note?: string;
};

export function AutoClassifyButton({
  candidateDomains,
  label = '자동 분류 일괄 등록',
}: {
  candidateDomains?: string[];
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/auto-classify-domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: candidateDomains ?? [] }),
      });
      const json: ApiResponse = await res.json();
      setResult(json);
      // 성공 시 페이지 reload (신규 도메인 차트 갱신)
      if (json.ok && json.added.length > 0) {
        setTimeout(() => router.refresh(), 1500);
      }
    } catch (e) {
      setResult({
        ok: false,
        error: (e as Error).message,
        total_candidates: 0,
        added: [],
        skipped: [],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:bg-surface-muted disabled:opacity-50"
        title="rule-based 자동 분류 — T1/T3/T4/NOISE 매칭 도메인 자동 등록 (is_active=false, 검토 후 활성화 필요)"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        {label}
      </button>

      {/* 결과 모달 */}
      {result && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={() => setResult(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-surface-base p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-base font-bold text-ink">
                <Sparkles className="h-4 w-4 text-ink-soft" />
                자동 분류 결과
              </h3>
              <button onClick={() => setResult(null)} className="rounded p-1 hover:bg-surface-soft">
                <X className="h-4 w-4 text-ink-muted" />
              </button>
            </div>

            {!result.ok && (
              <div className="rounded border border-status-danger/30 bg-status-dangerSoft/40 px-3 py-2 text-[11px] text-status-danger">
                ❌ {result.error}
              </div>
            )}

            {result.ok && (
              <>
                <div className="mb-3 flex gap-2 text-[11px]">
                  <span className="rounded bg-surface-muted px-2 py-1 font-semibold text-ink-soft">
                    후보 {result.total_candidates}
                  </span>
                  <span className="rounded bg-status-successSoft/40 px-2 py-1 font-semibold text-status-success">
                    등록 {result.added.length}
                  </span>
                  <span className="rounded bg-surface-subtle px-2 py-1 font-semibold text-ink-muted">
                    스킵 {result.skipped.length}
                  </span>
                </div>

                {result.added.length > 0 && (
                  <div className="mb-3">
                    <h4 className="mb-1 text-[12px] font-semibold text-ink">
                      <CheckCircle className="mr-1 inline h-3 w-3 text-ink-soft" />
                      자동 등록됨 ({result.added.length}건 — is_active=false, 운영자 검토 후 활성화 필요)
                    </h4>
                    <ul className="space-y-1 rounded border border-border bg-surface-soft p-2 text-[11px]">
                      {result.added.map((a) => (
                        <li key={a.domain} className="flex items-start gap-2">
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] font-bold text-white shrink-0',
                              a.tier === 'T1' ? 'bg-ink'
                              : a.tier === 'T3' ? 'bg-status-warning'
                              : a.tier === 'T4' ? 'bg-status-success'
                              : 'bg-ink-muted'
                            )}
                          >
                            {a.tier}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-mono">{a.domain}</div>
                            <div className="text-[10px] text-ink-muted">
                              {a.category} · {a.reason} (confidence {a.confidence})
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.skipped.length > 0 && (
                  <details className="mb-3">
                    <summary className="cursor-pointer text-[12px] font-semibold text-ink-muted hover:text-ink">
                      스킵 사유 보기 ({result.skipped.length}건)
                    </summary>
                    <ul className="mt-1 space-y-0.5 rounded border border-border bg-surface-soft p-2 text-[10px]">
                      {result.skipped.slice(0, 20).map((s) => (
                        <li key={s.domain} className="flex justify-between gap-2">
                          <span className="font-mono">{s.domain}</span>
                          <span className="text-ink-muted">{s.reason}</span>
                        </li>
                      ))}
                      {result.skipped.length > 20 && (
                        <li className="text-ink-faint">… 외 {result.skipped.length - 20}건</li>
                      )}
                    </ul>
                  </details>
                )}

                {result.note && (
                  <div className="text-[10px] text-ink-faint">ℹ️ {result.note}</div>
                )}

                <div className="mt-3 text-[11px] text-ink-muted">
                  💡 등록된 도메인은 <a href="/admin/domain-classifications" className="text-ink-soft hover:underline">/admin/domain-classifications</a> 에서 검토 후 [활성] 토글
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
