'use client';

/**
 * Round 115 (2026-07-02) — 월간 리포트 기간 선택기.
 *
 * URL 쿼리 파라미터 (`?range=...&from=...&to=...`) 를 통해 fetchReportData 에 기간 옵션 전달.
 * pill 그룹 5개 + 커스텀 date range picker.
 *
 * pill 클릭 → router.push 로 새 URL 로 이동 → 서버 컴포넌트 (reports/[tenantId]/page.tsx) 재렌더.
 */
import { useState, useTransition, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Loader2, Calendar, Mail } from 'lucide-react';

const PRESETS: Array<{ code: string; label: string; hint?: string }> = [
  { code: '7d', label: '최근 7일', hint: '주간' },
  { code: '30d', label: '최근 30일', hint: '기본' },
  { code: '90d', label: '최근 90일', hint: '분기' },
  { code: 'month', label: '이번 달', hint: '월 초부터' },
  { code: 'prev_month', label: '지난 달', hint: '전체 월' },
];

interface Props {
  activeCode: string;
  activeLabel: string;
  from: string;
  to: string;
  tenantId: number;
  tenantEmail?: string | null;
}

export function ReportRangeSelector({
  activeCode,
  activeLabel,
  from,
  to,
  tenantId,
  tenantEmail,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const [showCustom, setShowCustom] = useState(activeCode === 'custom');
  const [emailStatus, setEmailStatus] = useState<null | { ok: boolean; message: string }>(null);
  const [emailSending, setEmailSending] = useState(false);

  const applyRange = useCallback(
    (code: string, opts?: { from?: string; to?: string }) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('range', code);
      if (code === 'custom' && opts?.from && opts?.to) {
        params.set('from', opts.from);
        params.set('to', opts.to);
      } else {
        params.delete('from');
        params.delete('to');
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams],
  );

  const sendEmail = useCallback(async () => {
    setEmailSending(true);
    setEmailStatus(null);
    try {
      const body: Record<string, unknown> = {
        tenantId,
        period: activeLabel,
      };
      if (activeCode === 'custom') {
        body.from = customFrom;
        body.to = customTo;
      } else {
        body.range = activeCode;
      }
      const res = await fetch('/api/admin/reports/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.ok) {
        setEmailStatus({
          ok: true,
          message: `${tenantEmail ?? '등록 이메일'} 로 발송 완료 (${activeLabel} 기준)`,
        });
      } else {
        setEmailStatus({
          ok: false,
          message: json.error ?? '발송 실패',
        });
      }
    } catch (err) {
      setEmailStatus({ ok: false, message: (err as Error).message });
    } finally {
      setEmailSending(false);
    }
  }, [activeCode, activeLabel, customFrom, customTo, tenantEmail, tenantId]);

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-surface-soft/40 p-3">
      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-ink-muted">기간</span>
        {PRESETS.map((p) => {
          const active = activeCode === p.code;
          return (
            <button
              key={p.code}
              type="button"
              onClick={() => {
                setShowCustom(false);
                applyRange(p.code);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'border-brand bg-brand text-white shadow-sm'
                  : 'border-border bg-white text-ink hover:border-brand-200 hover:bg-brand-50/50'
              }`}
            >
              {p.label}
              {p.hint && !active && (
                <span className="text-[9px] font-normal text-ink-subtle">· {p.hint}</span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowCustom((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            showCustom || activeCode === 'custom'
              ? 'border-brand bg-brand text-white shadow-sm'
              : 'border-border bg-white text-ink hover:border-brand-200 hover:bg-brand-50/50'
          }`}
        >
          <Calendar size={12} strokeWidth={2} /> 커스텀
        </button>
        {isPending && (
          <span className="ml-1 inline-flex items-center gap-1 text-[11px] text-ink-muted">
            <Loader2 size={12} className="animate-spin" /> 로딩
          </span>
        )}
        <span className="ml-auto rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-700">
          현재: {activeLabel}
        </span>
      </div>

      {/* Custom date picker */}
      {showCustom && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-2.5">
          <label className="text-[11px] font-semibold text-ink-muted">시작</label>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded border border-border px-2 py-1 text-xs"
          />
          <label className="text-[11px] font-semibold text-ink-muted">종료</label>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded border border-border px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={!customFrom || !customTo || customFrom > customTo}
            onClick={() => applyRange('custom', { from: customFrom, to: customTo })}
            className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink-subtle"
          >
            적용
          </button>
        </div>
      )}

      {/* Send email row */}
      <div className="flex items-center gap-2 border-t border-border pt-2">
        <button
          type="button"
          disabled={emailSending || !tenantEmail}
          onClick={sendEmail}
          className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[11px] font-bold text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink-subtle"
        >
          {emailSending ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
          {activeLabel} 리포트 즉시 발송
        </button>
        {!tenantEmail && (
          <span className="text-[10px] text-status-warning">이 클라이언트에 등록된 이메일이 없습니다</span>
        )}
        {tenantEmail && (
          <span className="text-[10px] text-ink-muted">→ {tenantEmail}</span>
        )}
        {emailStatus && (
          <span
            className={`ml-auto text-[10px] font-semibold ${
              emailStatus.ok ? 'text-status-success' : 'text-status-error'
            }`}
          >
            {emailStatus.message}
          </span>
        )}
      </div>
    </div>
  );
}
