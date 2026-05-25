'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { showToast } from '@/lib/clientActions';
import { cn } from '@/lib/cn';

interface KwTenantOption {
  id: number | string;
  name: string;
  partner_slug: string | null;
}

interface KwRow {
  id: number | string;
  tenant_id: number;
  tenant_name: string;
  partner_slug: string | null;
  text: string;
  category: string | null;
  target_brand: string | null;
  is_active: boolean | null;
}

const CATEGORY_SUGGEST = ['라식·라섹', '백내장', '노안교정', '여드름', '모발이식', '임플란트', '교정', '기타'];

export default function KeywordsPage() {
  const [tenants, setTenants] = useState<KwTenantOption[]>([]);
  const [rows, setRows] = useState<KwRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{ tenant_id: string; text: string; category: string }>({
    tenant_id: '', text: '', category: '라식·라섹'
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, kRes] = await Promise.all([
        fetch('/api/admin/tenants', { cache: 'no-store' }),
        fetch('/api/admin/keywords', { cache: 'no-store' })
      ]);
      const tData = await tRes.json();
      const kData = await kRes.json();
      if (!tRes.ok || !tData.ok) throw new Error(tData.error ?? 'tenants fetch failed');
      if (!kRes.ok || !kData.ok) throw new Error(kData.error ?? 'keywords fetch failed');
      const ts: KwTenantOption[] = (tData.tenants ?? []).map((t: {
        id: number; name: string; partner_slug: string | null;
      }) => ({ id: t.id, name: t.name, partner_slug: t.partner_slug }));
      setTenants(ts);
      setRows(kData.items ?? []);
      setDraft((p) => ({ ...p, tenant_id: p.tenant_id || (ts[0]?.id?.toString() ?? '') }));
    } catch (e) {
      showToast(`로드 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const add = async () => {
    if (!draft.text.trim()) return showToast('키워드를 입력하세요', { kind: 'error' });
    if (!draft.tenant_id) return showToast('클라이언트를 선택하세요', { kind: 'error' });
    const t = tenants.find((x) => x.id.toString() === draft.tenant_id);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/keywords', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: Number(draft.tenant_id),
          text: draft.text.trim(),
          category: draft.category,
          target_brand: t?.partner_slug ?? null,
          is_active: true
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'create failed');
      showToast(`"${draft.text}" 추가됨`);
      setDraft((p) => ({ ...p, text: '' }));
      await load();
    } catch (e) {
      showToast(`추가 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally { setSaving(false); }
  };

  const toggle = async (r: KwRow) => {
    try {
      const res = await fetch(`/api/admin/keywords/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !r.is_active })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'toggle failed');
      await load();
    } catch (e) {
      showToast(`상태 변경 실패: ${(e as Error).message}`, { kind: 'error' });
    }
  };

  const remove = async (id: KwRow['id']) => {
    if (!confirm('이 키워드를 삭제할까요?')) return;
    try {
      const res = await fetch(`/api/admin/keywords/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'delete failed');
      showToast('삭제됨');
      await load();
    } catch (e) {
      showToast(`삭제 실패: ${(e as Error).message}`, { kind: 'error' });
    }
  };

  return (
    <div className="px-8 py-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-ink">키워드 풀 ({rows.length})</h1>
        <p className="mt-1 text-sm text-ink-muted">
          테넌트별 자동 생성 키워드 — Supabase keywords 실시간 연결
        </p>
      </header>

      <div className="card mb-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px]">
            <label className="mb-1 block text-[11px] font-semibold text-ink">클라이언트</label>
            <select className="input-base" value={draft.tenant_id}
              onChange={(e) => setDraft((p) => ({ ...p, tenant_id: e.target.value }))}>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[260px] flex-1">
            <label className="mb-1 block text-[11px] font-semibold text-ink">키워드</label>
            <input className="input-base" placeholder="새 키워드 (예: 잠실 노안교정)"
              value={draft.text}
              onChange={(e) => setDraft((p) => ({ ...p, text: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') void add(); }} />
          </div>
          <div className="min-w-[160px]">
            <label className="mb-1 block text-[11px] font-semibold text-ink">카테고리</label>
            <select className="input-base" value={draft.category}
              onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}>
              {CATEGORY_SUGGEST.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={() => void add()} disabled={saving} className="btn-primary text-xs">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            추가
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3 text-left">키워드</th>
              <th className="px-4 py-3 text-left">테넌트</th>
              <th className="px-4 py-3 text-left">카테고리</th>
              <th className="px-4 py-3 text-left">target_brand</th>
              <th className="px-4 py-3 text-left">상태</th>
              <th className="px-4 py-3 text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-ink-muted">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" /><div className="mt-2">로드 중…</div>
              </td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-ink-muted">
                등록된 키워드가 없습니다.
              </td></tr>
            )}
            {rows.map((r) => (
              <tr key={String(r.id)} className="border-t border-border hover:bg-surface-subtle">
                <td className="px-4 py-3 text-sm font-semibold text-ink">{r.text}</td>
                <td className="px-4 py-3 text-xs">{r.tenant_name}</td>
                <td className="px-4 py-3 text-xs">{r.category ?? '—'}</td>
                <td className="px-4 py-3 text-xs font-mono text-brand-700">{r.target_brand ?? '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(r)}
                    className={cn('chip-base px-2', r.is_active ? 'chip-success' : 'chip-neutral')}>
                    {r.is_active ? '활성' : '일시정지'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => remove(r.id)} className="rounded-md p-1.5 text-ink-muted hover:text-status-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-border bg-surface-subtle px-4 py-2.5 text-[11px] text-ink-muted">
          7D 인용 / CTR 컬럼은 별도 분석 파이프라인 연결 후 자동 표시 (Phase 2)
        </div>
      </div>
    </div>
  );
}
