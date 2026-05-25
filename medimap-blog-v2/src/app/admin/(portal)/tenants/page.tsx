'use client';

import { useCallback, useEffect, useState } from 'react';
import { Edit3, Loader2, Pause, Play, Plus, Trash2, X } from 'lucide-react';
import { showToast } from '@/lib/clientActions';

type TenantStatus = 'active' | 'paused' | 'trial';

interface SbTenant {
  id: number | string;
  name: string;
  domain: string | null;
  category: string | null;
  region: string | null;
  contact: string | null;
  status: TenantStatus | null;
  partner_slug: string | null;
  publish_count: number | null;
  monthly_cost: number | null;
  joined_at: string | null;
}

const STATUS_CHIP: Record<TenantStatus, { label: string; cls: string }> = {
  active: { label: '활성', cls: 'chip-success' },
  paused: { label: '일시정지', cls: 'chip-neutral' },
  trial: { label: '체험', cls: 'chip-warning' }
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<SbTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<SbTenant | null>(null);
  const [draft, setDraft] = useState<Partial<SbTenant>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tenants', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'fetch failed');
      setTenants(data.tenants ?? []);
    } catch (e) {
      showToast(`목록 로드 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditing({} as SbTenant);
    setDraft({ status: 'trial', publish_count: 0, monthly_cost: 0 });
  };
  const openEdit = (t: SbTenant) => {
    setEditing(t);
    setDraft({ ...t });
  };
  const close = () => {
    setEditing(null);
    setDraft({});
  };

  const save = async () => {
    if (!draft.name?.toString().trim()) {
      showToast('병원명은 필수입니다', { kind: 'error' });
      return;
    }
    setSaving(true);
    try {
      const isUpdate = editing && (editing as SbTenant).id;
      const url = isUpdate
        ? `/api/admin/tenants/${(editing as SbTenant).id}`
        : '/api/admin/tenants';
      const res = await fetch(url, {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'save failed');
      showToast(isUpdate ? '수정 저장됨' : `${draft.name} 등록됨`);
      close();
      await load();
    } catch (e) {
      showToast(`저장 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: SbTenant['id']) => {
    if (!confirm('이 클라이언트를 삭제할까요? (복구 불가)')) return;
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'delete failed');
      showToast('삭제됨');
      await load();
    } catch (e) {
      showToast(`삭제 실패: ${(e as Error).message}`, { kind: 'error' });
    }
  };

  const togglePause = async (t: SbTenant) => {
    const next: TenantStatus = t.status === 'paused' ? 'active' : 'paused';
    try {
      const res = await fetch(`/api/admin/tenants/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'status failed');
      await load();
    } catch (e) {
      showToast(`상태 변경 실패: ${(e as Error).message}`, { kind: 'error' });
    }
  };

  return (
    <div className="px-8 py-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            클라이언트 ({tenants.length})
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            병원/의원 단위 멀티 테넌트 관리 — Supabase tenants 실시간 연결
          </p>
        </div>
        <button onClick={openNew} className="btn-primary text-xs">
          <Plus className="h-3.5 w-3.5" /> 신규 클라이언트
        </button>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3 text-left">병원명 / 도메인</th>
              <th className="px-4 py-3 text-left">카테고리</th>
              <th className="px-4 py-3 text-left">지역</th>
              <th className="px-4 py-3 text-left">partner_slug</th>
              <th className="px-4 py-3 text-right">발행</th>
              <th className="px-4 py-3 text-right">월 비용</th>
              <th className="px-4 py-3 text-left">상태</th>
              <th className="px-4 py-3 text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-xs text-ink-muted">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  <div className="mt-2">로드 중…</div>
                </td>
              </tr>
            )}
            {!loading && tenants.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-xs text-ink-muted">
                  등록된 클라이언트가 없습니다.
                </td>
              </tr>
            )}
            {tenants.map((t) => {
              const status = (t.status ?? 'trial') as TenantStatus;
              return (
                <tr key={String(t.id)} className="border-t border-border hover:bg-surface-subtle">
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-ink">{t.name}</div>
                    <div className="text-[11px] text-ink-muted">{t.domain ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{t.category ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{t.region ?? '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-brand-700">
                    {t.partner_slug ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono">
                    {t.publish_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono">
                    ${Number(t.monthly_cost ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={STATUS_CHIP[status].cls}>
                      {STATUS_CHIP[status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => togglePause(t)} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-base hover:text-brand-700" aria-label="일시정지/재개">
                        {status === 'paused' ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => openEdit(t)} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-base hover:text-brand-700" aria-label="편집">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(t.id)} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-base hover:text-status-danger" aria-label="삭제">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/60 p-4" onClick={close}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-bold text-ink">
                {(editing as SbTenant).id ? '클라이언트 편집' : '신규 클라이언트 등록'}
              </h3>
              <button onClick={close} className="rounded-md p-1 text-ink-muted hover:bg-surface-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-6 py-5 text-sm">
              {([
                ['name', '병원명 *', 'BGN 밝은눈안과 잠실'],
                ['domain', '도메인', 'bgn-jamsil.example'],
                ['category', '카테고리', '안과 / 피부과 / 모발이식'],
                ['region', '지역', '잠실'],
                ['contact', '담당자 이메일', 'manager@bgn.com'],
                ['partner_slug', 'partner_slug (URL용 영문)', 'bgn / tete / mourim']
              ] as const).map(([k, l, ph]) => (
                <div key={k}>
                  <label className="mb-1 block text-xs font-semibold text-ink">{l}</label>
                  <input
                    className="input-base"
                    placeholder={ph}
                    value={(draft[k as keyof SbTenant] as string | null) ?? ''}
                    onChange={(e) => setDraft((p) => ({ ...p, [k]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">상태</label>
                <select
                  className="input-base"
                  value={draft.status ?? 'trial'}
                  onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as TenantStatus }))}
                >
                  <option value="trial">체험</option>
                  <option value="active">활성</option>
                  <option value="paused">일시정지</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button onClick={close} className="btn-secondary text-xs" disabled={saving}>
                취소
              </button>
              <button onClick={save} className="btn-primary text-xs" disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
