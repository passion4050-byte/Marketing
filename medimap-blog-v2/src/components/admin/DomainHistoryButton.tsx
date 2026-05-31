/**
 * Round 49 (2026-05-31) — 도메인 검증 히스토리 버튼 + mini chart modal.
 *
 * /api/admin/domain-history?domain=X 호출 → 일자별 인용 추이 + 분류 정보.
 * 자동 분류된 도메인의 효용 검증에 활용.
 */
'use client';

import { useState } from 'react';
import { TrendingUp, Loader2, X, AlertCircle } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type HistoryResponse = {
  ok: boolean;
  error?: string;
  domain?: string;
  days?: Array<{ date: string; count: number }>;
  total?: number;
  classification?: {
    domain: string;
    tier: string;
    category: string | null;
    is_active: boolean;
    created_at: string;
  } | null;
};

export function DomainHistoryButton({ domain, label = '추이' }: { domain: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [open, setOpen] = useState(false);

  const fetchHistory = async () => {
    setOpen(true);
    if (data?.domain === domain) return; // 이미 로드됨
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/domain-history?domain=${encodeURIComponent(domain)}&days=30`);
      const json: HistoryResponse = await res.json();
      setData(json);
    } catch (e) {
      setData({ ok: false, error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={fetchHistory}
        className="inline-flex items-center gap-1 rounded border border-border bg-surface-base px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft hover:bg-surface-soft"
        title={`${domain} 의 30일 인용 추이`}
      >
        <TrendingUp className="h-3 w-3" />
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-lg bg-surface-base p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-1.5 text-base font-bold text-ink">
                  <TrendingUp className="h-4 w-4 text-brand" />
                  도메인 인용 추이 (30일)
                </h3>
                <div className="mt-0.5 font-mono text-[11px] text-ink-muted">{domain}</div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-surface-soft">
                <X className="h-4 w-4 text-ink-muted" />
              </button>
            </div>

            {loading && (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
              </div>
            )}

            {data && !loading && (
              <>
                {!data.ok && (
                  <div className="rounded border border-status-danger/30 bg-status-dangerSoft/40 px-3 py-2 text-[11px] text-status-danger">
                    <AlertCircle className="mr-1 inline h-3 w-3" />
                    {data.error}
                  </div>
                )}

                {data.ok && (
                  <>
                    {/* 분류 정보 */}
                    {data.classification ? (
                      <div className="mb-3 flex items-center gap-2 rounded border border-border bg-surface-soft px-3 py-2 text-[11px]">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${
                            data.classification.tier === 'T1' ? 'bg-brand'
                            : data.classification.tier === 'T3' ? 'bg-status-warning'
                            : data.classification.tier === 'T4' ? 'bg-status-success'
                            : data.classification.tier === 'NOISE' ? 'bg-ink-muted'
                            : 'bg-status-danger'
                          }`}
                        >
                          {data.classification.tier}
                        </span>
                        <span className="text-ink-soft">{data.classification.category ?? '—'}</span>
                        {!data.classification.is_active && (
                          <span className="rounded bg-status-warning/15 px-1.5 py-0.5 text-[9px] font-bold text-status-warning">
                            비활성 (검토 대기)
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-ink-faint">
                          분류일: {new Date(data.classification.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    ) : (
                      <div className="mb-3 rounded border border-dashed border-border bg-surface-subtle px-3 py-2 text-[11px] text-ink-muted">
                        분류 사전 미등록 — T5 default 처리 중
                      </div>
                    )}

                    {/* 인용 카운트 */}
                    <div className="mb-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded border border-border bg-surface-base px-3 py-2">
                        <div className="text-[10px] text-ink-muted">30일 총 인용</div>
                        <div className="mt-0.5 text-xl font-bold text-ink">{data.total ?? 0}</div>
                      </div>
                      <div className="rounded border border-border bg-surface-base px-3 py-2">
                        <div className="text-[10px] text-ink-muted">일평균</div>
                        <div className="mt-0.5 text-xl font-bold text-ink">
                          {((data.total ?? 0) / 30).toFixed(1)}
                        </div>
                      </div>
                    </div>

                    {/* 차트 */}
                    {(data.days ?? []).every((d) => d.count === 0) ? (
                      <div className="flex h-32 items-center justify-center rounded border border-dashed border-border text-[12px] text-ink-muted">
                        측정 데이터 없음 — 다음 cron 후 누적
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={data.days} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="count"
                            name="인용 수"
                            stroke="#1B68FF"
                            fill="#1B68FF"
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}

                    <div className="mt-3 text-[10px] text-ink-faint">
                      💡 자동 분류 (Round 40) 도메인의 효용 검증 — 인용 빈도가 낮으면 분류 재검토 필요
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
