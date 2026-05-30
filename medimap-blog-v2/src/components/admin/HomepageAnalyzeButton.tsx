/**
 * Round 34 phase 4 (2026-05-30) — 클라이언트 홈페이지 자동 분석 버튼.
 *
 * 두 가지 모드:
 *   1. 🔍 분석 미리보기 (preview)    — apply=false. 추출된 키워드만 보고 수동 적용 결정
 *   2. ⚡ 분석 + 즉시 적용 (apply)    — apply=true. business_model 자동 UPDATE + trigger 발동
 */
'use client';

import { useState } from 'react';
import { Loader2, Search, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';

type AnalyzeResult = {
  ok: boolean;
  error?: string;
  keywords?: Array<{ keyword: string; count: number }>;
  suggested_business_model?: string;
  fetched_url?: string;
  applied?: boolean;
};

export function HomepageAnalyzeButton({
  tenantId,
  homepage,
  onApply,
}: {
  tenantId: number | string | undefined;
  homepage: string;
  onApply: (keywords: string) => void;
}) {
  const [loading, setLoading] = useState<'preview' | 'apply' | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  const run = async (mode: 'preview' | 'apply') => {
    if (tenantId == null || tenantId === '') {
      setResult({ ok: false, error: '먼저 클라이언트를 저장한 후 분석 가능' });
      return;
    }
    if (!homepage || !homepage.startsWith('http')) {
      setResult({ ok: false, error: '홈페이지 URL 을 먼저 입력하세요' });
      return;
    }
    setLoading(mode);
    setResult(null);
    try {
      const url = `/api/admin/tenants/${tenantId}/analyze-homepage${
        mode === 'apply' ? '?apply=true' : ''
      }`;
      const res = await fetch(url, { method: 'POST' });
      const json: AnalyzeResult = await res.json();
      setResult(json);
      if (mode === 'apply' && json.ok && json.suggested_business_model) {
        onApply(json.suggested_business_model);
      }
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => run('preview')}
          disabled={loading !== null || tenantId == null || tenantId === ''}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-base px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:border-brand-200 hover:text-brand disabled:opacity-50"
          title="홈페이지에서 키워드만 추출 — 검수 후 수동 적용"
        >
          {loading === 'preview' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Search className="h-3 w-3" />
          )}
          분석 미리보기
        </button>
        <button
          type="button"
          onClick={() => run('apply')}
          disabled={loading !== null || tenantId == null || tenantId === ''}
          className="inline-flex items-center gap-1.5 rounded-md border border-brand/30 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand transition hover:bg-brand-100 disabled:opacity-50"
          title="키워드 추출 + business_model 자동 UPDATE + trigger 발동 (검수 없음)"
        >
          {loading === 'apply' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Zap className="h-3 w-3" />
          )}
          분석 + 즉시 적용
        </button>
      </div>
      {(tenantId == null || tenantId === '') && (
        <div className="mt-1 text-[10px] text-ink-faint">
          💡 신규 등록 시 — 먼저 홈페이지 URL 입력 + 저장 → 그 후 분석 버튼 활성화
        </div>
      )}
      {result && (
        <div
          className={cn(
            'mt-2 rounded-md border px-3 py-2 text-[11px]',
            result.ok
              ? 'border-brand/20 bg-brand-50/40 text-ink-soft'
              : 'border-status-danger/30 bg-status-dangerSoft/40 text-status-danger'
          )}
        >
          {!result.ok && <div>❌ {result.error}</div>}
          {result.ok && result.keywords && (
            <>
              <div className="mb-1 flex items-center justify-between">
                <strong className="text-ink">
                  추출 키워드 ({result.keywords.length}개)
                </strong>
                {result.applied && (
                  <span className="rounded bg-brand text-white px-1.5 py-0.5 text-[10px] font-bold">
                    ✓ 자동 적용됨
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {result.keywords.map((k, i) => (
                  <span
                    key={i}
                    className="rounded bg-surface-base px-1.5 py-0.5 font-mono"
                  >
                    {k.keyword} <span className="text-ink-faint">×{k.count}</span>
                  </span>
                ))}
              </div>
              {!result.applied && result.suggested_business_model && (
                <button
                  type="button"
                  onClick={() => onApply(result.suggested_business_model!)}
                  className="mt-2 inline-flex items-center gap-1 rounded bg-brand px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-brand-dark"
                >
                  ✓ 이 키워드로 적용
                </button>
              )}
              {result.fetched_url && (
                <div className="mt-1 text-[10px] text-ink-muted">
                  분석한 URL: <span className="font-mono">{result.fetched_url}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
