/**
 * Round 39 (2026-05-31) — 대시보드 차트 5개 공통 필터.
 *
 * - 클라이언트 selector (search 가능한 datalist)
 * - 기간 토글 (7d / 30d / 90d / 사용자 지정)
 * - 사용자 지정 모드 시 from/to date input
 *
 * URL searchParams 로 상태 관리 → 새로고침 시 유지 + 공유 가능.
 *   ?tenantId=N&period=7|30|90|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search, Users, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export function DashboardFilters({
  tenants,
  currentTenantId,
  currentPeriod,
  currentFrom,
  currentTo,
}: {
  tenants: Array<{ id: number; name: string }>;
  currentTenantId: number | null;
  currentPeriod: string;       // '7' | '30' | '90' | 'custom'
  currentFrom?: string;
  currentTo?: string;
}) {
  const router = useRouter();
  const [tenantSearch, setTenantSearch] = useState(
    currentTenantId
      ? tenants.find((t) => t.id === currentTenantId)?.name ?? ''
      : ''
  );
  const [fromDraft, setFromDraft] = useState(currentFrom ?? '');
  const [toDraft, setToDraft] = useState(currentTo ?? '');

  useEffect(() => {
    if (currentTenantId) {
      const t = tenants.find((tn) => tn.id === currentTenantId);
      if (t) setTenantSearch(t.name);
    }
  }, [currentTenantId, tenants]);

  const updateUrl = (params: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([k, v]) => {
      if (v == null || v === '') url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    });
    router.push(url.pathname + url.search);
  };

  const selectTenant = (id: number | null) => {
    updateUrl({ tenantId: id ? String(id) : null });
  };

  const selectPeriod = (period: string) => {
    if (period === 'custom') {
      updateUrl({ period: 'custom', from: fromDraft || null, to: toDraft || null });
    } else {
      updateUrl({ period, from: null, to: null });
    }
  };

  const applyCustomRange = () => {
    if (fromDraft && toDraft) {
      updateUrl({ period: 'custom', from: fromDraft, to: toDraft });
    }
  };

  const matchedTenant = tenants.find((t) => t.name === tenantSearch);
  const filtered = tenantSearch
    ? tenants.filter((t) => t.name.toLowerCase().includes(tenantSearch.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="mt-6 space-y-2 rounded-lg border border-border bg-surface-base p-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* 클라이언트 selector — typeahead 입력 + datalist */}
        <div className="flex flex-1 items-center gap-1.5 min-w-[200px]">
          <Users className="h-3.5 w-3.5 text-ink-muted" />
          <label className="text-[11px] font-semibold text-ink-muted">클라이언트:</label>
          <div className="relative flex-1 max-w-[280px]">
            <input
              type="text"
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
              placeholder="전체 (모든 클라이언트) · 입력으로 검색"
              className="w-full rounded border border-border bg-surface-base py-1 pl-7 pr-7 text-[12px]"
              list="tenant-options"
            />
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-muted" />
            {tenantSearch && (
              <button
                type="button"
                onClick={() => {
                  setTenantSearch('');
                  selectTenant(null);
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-muted hover:bg-surface-subtle"
                aria-label="clear"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <datalist id="tenant-options">
              {tenants.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
          </div>
          {filtered.length > 0 && !matchedTenant && (
            <div className="relative">
              <div className="absolute top-1 z-10 max-h-48 w-[280px] overflow-y-auto rounded-md border border-border bg-surface-base shadow-card">
                {filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTenantSearch(t.name);
                      selectTenant(t.id);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-[12px] hover:bg-surface-subtle"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {matchedTenant && currentTenantId !== matchedTenant.id && (
            <button
              type="button"
              onClick={() => selectTenant(matchedTenant.id)}
              className="rounded bg-brand px-2 py-1 text-[11px] font-semibold text-white"
            >
              적용
            </button>
          )}
          {!tenantSearch && (
            <span className="text-[10px] text-ink-faint">전체</span>
          )}
        </div>

        {/* 기간 토글 */}
        <div className="flex items-center gap-1 text-[12px]">
          <span className="text-ink-muted">기간:</span>
          {['7', '30', '90', 'custom'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => selectPeriod(p)}
              className={cn(
                'rounded-md border px-2.5 py-1 font-semibold transition',
                currentPeriod === p
                  ? 'border-brand bg-brand text-white'
                  : 'border-border bg-surface-base text-ink-soft hover:bg-surface-soft'
              )}
            >
              {p === 'custom' ? '사용자 지정' : `${p}일`}
            </button>
          ))}
        </div>
      </div>

      {/* 사용자 지정 date range */}
      {currentPeriod === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2 text-[11px]">
          <label className="text-ink-muted">From:</label>
          <input
            type="date"
            value={fromDraft}
            onChange={(e) => setFromDraft(e.target.value)}
            className="rounded border border-border bg-surface-base px-2 py-1"
          />
          <label className="text-ink-muted">To:</label>
          <input
            type="date"
            value={toDraft}
            onChange={(e) => setToDraft(e.target.value)}
            className="rounded border border-border bg-surface-base px-2 py-1"
          />
          <button
            type="button"
            onClick={applyCustomRange}
            disabled={!fromDraft || !toDraft}
            className="rounded bg-brand px-3 py-1 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            적용
          </button>
        </div>
      )}
    </div>
  );
}
