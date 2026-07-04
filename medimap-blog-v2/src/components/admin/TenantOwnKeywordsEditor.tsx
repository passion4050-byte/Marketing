/**
 * Round 45 (2026-05-31) — tenant edit modal 안 own 키워드 chip editor.
 *
 * - tenant 의 own purpose 키워드 list fetch
 * - chip 으로 표시 (각 chip 에 ✕ 삭제)
 * - input + Enter 또는 [추가] 버튼으로 새 키워드 INSERT
 * - 모든 변경 즉시 DB 반영 (저장 버튼 별도 X)
 *
 * Tier 2 of 키워드 풀 — 클라이언트 편집 페이지 안에서 own 키워드 직관 관리.
 */
'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, X, Tag } from 'lucide-react';

type KwRow = {
  id: number;
  text: string;
  category: string | null;
  is_active: boolean | null;
};

export function TenantOwnKeywordsEditor({
  tenantId,
  defaultCategory,
}: {
  tenantId: number | undefined;
  defaultCategory?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [kws, setKws] = useState<KwRow[]>([]);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    if (!tenantId) {
      setKws([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/keywords', { cache: 'no-store' });
      const json = (await res.json()) as { ok: boolean; items: Array<KwRow & { tenant_id: number; purpose: string }> };
      if (json.ok) {
        setKws(json.items.filter((k) => k.tenant_id === tenantId && k.purpose === 'own'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) void load();
    else setKws([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const add = async () => {
    if (!tenantId || !draft.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          text: draft.trim(),
          category: defaultCategory || '기타',
          purpose: 'own',
          is_active: true,
        }),
      });
      if (res.ok) {
        setDraft('');
        await load();
      }
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: number) => {
    await fetch(`/api/admin/keywords?id=${id}`, { method: 'DELETE' });
    await load();
  };

  const toggle = async (kw: KwRow) => {
    await fetch(`/api/admin/keywords?id=${kw.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !kw.is_active }),
    });
    await load();
  };

  if (!tenantId) {
    return (
      <div className="rounded border border-dashed border-border bg-surface-subtle px-3 py-3 text-[11px] text-ink-muted">
        💡 클라이언트 저장 후 own 키워드 추가 가능 (예: "잠실 라식", "노안교정")
      </div>
    );
  }

  return (
    <div className="rounded border border-border bg-surface-subtle px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-[11px] font-semibold text-ink">
          <Tag className="mr-1 inline h-3 w-3 text-ink-soft" />
          자사 own 키워드 ({kws.length})
        </label>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-ink-soft" />}
      </div>
      <div className="mb-2 text-[10px] text-ink-faint">
        비즈니스 모델 (위 — 콤마 split) 는 trigger 로 competitor 키워드 자동 생성. 여기 추가는 own 측정용 (예: "잠실 라식", "노안교정")
      </div>

      {/* chip list */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {kws.length === 0 && !loading && (
          <span className="text-[11px] text-ink-faint">키워드 없음 — 아래 입력으로 추가</span>
        )}
        {kws.map((k) => (
          <span
            key={k.id}
            className={`group inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${
              k.is_active
                ? 'border-border bg-surface-muted text-ink-soft'
                : 'border-border bg-surface-base text-ink-muted'
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(k)}
              className="font-semibold hover:underline"
              title={k.is_active ? '비활성화' : '활성화'}
            >
              {k.text}
            </button>
            <button
              type="button"
              onClick={() => remove(k.id)}
              className="rounded p-0.5 opacity-50 hover:bg-status-danger/15 hover:text-status-danger hover:opacity-100"
              title="삭제"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {/* 추가 input */}
      <div className="flex gap-1">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void add();
            }
          }}
          placeholder="새 키워드 (Enter 로 추가)"
          className="flex-1 rounded border border-border bg-surface-base px-2 py-1 text-[11px]"
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={adding || !draft.trim()}
          className="inline-flex items-center gap-0.5 rounded border border-border bg-ink px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-ink/85 disabled:opacity-50"
        >
          {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          추가
        </button>
      </div>
    </div>
  );
}
