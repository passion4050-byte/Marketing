'use client';

/**
 * Round 117-A (2026-07-03) — 검수 탭 empty state 즉시발행 그자리 모달.
 *
 * 검수 대기 큐가 비어있을 때 "지금 바로 생성" 흐름을 제공:
 *   1. GET  /api/admin/tenants        → 클라이언트 선택 목록
 *   2. POST /api/admin/publish-now    → { tenantId, keyword? } (Round 112 API 재사용)
 *      → GitHub Actions auto-publish.yml workflow_dispatch 트리거
 *
 * 응답 케이스:
 *   - ok: true             → 트리거 완료 (2~5분 후 검수 대기 큐 등장)
 *   - ok: false + needsManual → GH_TOKEN 미설정 — workflowUrl 로 수동 실행 안내
 *   - ok: false            → 에러 표시
 *
 * self-contained: tenants fetch 를 자체 수행 — page.tsx 는 열림/닫힘 state 만 관리.
 */

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, Rocket, X } from 'lucide-react';

interface TenantOption {
  id: number;
  name: string;
  partner_slug?: string | null;
  domain_category?: string | null;
}

type Phase = 'form' | 'done';

interface TriggerResult {
  ok: boolean;
  needsManual?: boolean;
  message?: string;
  error?: string;
  tenantName?: string;
  workflowUrl?: string;
}

export function ImmediatePublishModal({
  onClose,
  onTriggered,
}: {
  onClose: () => void;
  /** 트리거 성공 시 부모에게 알림 (배너 표시 등) */
  onTriggered?: (message: string) => void;
}) {
  const [tenants, setTenants] = useState<TenantOption[] | null>(null);
  const [tenantsError, setTenantsError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<number | ''>('');
  const [keyword, setKeyword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [result, setResult] = useState<TriggerResult | null>(null);

  // 클라이언트 목록 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/tenants', { cache: 'no-store' });
        const json = (await res.json().catch(() => null)) as
          | { ok?: boolean; tenants?: TenantOption[]; error?: string }
          | null;
        if (cancelled) return;
        if (!res.ok || !json?.ok) {
          setTenantsError(json?.error ?? `클라이언트 목록 로드 실패 (HTTP ${res.status})`);
          return;
        }
        const list = json.tenants ?? [];
        setTenants(list);
        if (list.length === 1) setTenantId(list[0].id);
      } catch (e) {
        if (!cancelled)
          setTenantsError(e instanceof Error ? e.message : '네트워크 오류');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = useCallback(async () => {
    if (tenantId === '') return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/publish-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
        }),
      });
      const json = (await res.json().catch(() => null)) as TriggerResult | null;
      const r: TriggerResult = json ?? {
        ok: false,
        error: `요청 실패 (HTTP ${res.status})`,
      };
      setResult(r);
      setPhase('done');
      if (r.ok && r.message) onTriggered?.(r.message);
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : '네트워크 오류',
      });
      setPhase('done');
    } finally {
      setSubmitting(false);
    }
  }, [tenantId, keyword, onTriggered]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200/70 px-5 py-3">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-emerald-700" />
            <span className="text-sm font-black text-stone-900">즉시 발행</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {phase === 'form' ? (
          <>
            <div className="space-y-4 px-5 py-4">
              <p className="text-xs leading-relaxed text-stone-500">
                자동 cron 을 기다리지 않고 선택한 클라이언트의 콘텐츠를 지금 바로
                생성합니다. 트리거 후 2~5분 뒤 검수 대기 큐에 등장합니다.
              </p>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">
                  클라이언트
                </label>
                {tenantsError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    {tenantsError}
                  </div>
                ) : tenants === null ? (
                  <div className="flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs text-stone-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> 목록 불러오는 중…
                  </div>
                ) : tenants.length === 0 ? (
                  <div className="rounded-md border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs text-stone-500">
                    등록된 클라이언트가 없습니다. 클라이언트 관리에서 먼저 등록해
                    주세요.
                  </div>
                ) : (
                  <select
                    value={tenantId}
                    onChange={(e) =>
                      setTenantId(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:outline-none"
                  >
                    <option value="">— 선택 —</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.domain_category ? ` (${t.domain_category})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-stone-500">
                  키워드 <span className="font-medium normal-case text-stone-400">(선택)</span>
                </label>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="비우면 키워드 풀에서 자동 선택"
                  className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-stone-200/70 bg-stone-50/40 px-5 py-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || tenantId === ''}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Rocket className="h-3 w-3" />
                )}
                지금 생성
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3 px-5 py-5">
              {result?.ok ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="text-sm font-bold text-emerald-800">
                    트리거 완료
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                    {result.message ??
                      '즉시 발행이 트리거되었습니다. 2~5분 후 검수 대기 큐를 새로고침해 주세요.'}
                  </p>
                </div>
              ) : result?.needsManual ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="text-sm font-bold text-amber-800">
                    수동 실행 필요
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-amber-700">
                    {result.message}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
                  <div className="text-sm font-bold text-red-800">트리거 실패</div>
                  <p className="mt-1 text-xs leading-relaxed text-red-700">
                    {result?.error ?? result?.message ?? '알 수 없는 오류'}
                  </p>
                </div>
              )}
              {result?.workflowUrl && (
                <a
                  href={result.workflowUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-950 hover:underline"
                >
                  GitHub Actions 워크플로 열기{' '}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-stone-200/70 bg-stone-50/40 px-5 py-3">
              {!result?.ok && (
                <button
                  type="button"
                  onClick={() => setPhase('form')}
                  className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
                >
                  다시 시도
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-stone-900 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-stone-700"
              >
                닫기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
