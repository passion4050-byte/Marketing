'use client';

import { useCallback, useEffect, useState } from 'react';
import { Edit3, Loader2, Pause, Play, Plus, Trash2, X } from 'lucide-react';
import { showToast } from '@/lib/clientActions';

type TenantStatus = 'active' | 'paused' | 'trial';

interface SbTenant {
  id: number | string;
  name: string;
  domain_category: string | null;
  region: string | null;
  business_model: string | null;
  address: string | null;
  naver_place_url: string | null;
  phone: string | null;
  homepage: string | null;
  partner_slug: string | null;
  status: TenantStatus | null;
  publish_count: number | null;
  monthly_cost: number | null;
  joined_at: string | null;
}

const STATUS_CHIP: Record<TenantStatus, { label: string; cls: string }> = {
  active: { label: '활성', cls: 'chip-success' },
  paused: { label: '일시정지', cls: 'chip-neutral' },
  trial: { label: '체험', cls: 'chip-warning' }
};

const DOMAIN_CATEGORIES = ['안과', '피부과', '성형외과', '치과', '내과', '모발이식', '기타'];

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
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openNew = () => {
    setEditing({} as SbTenant);
    setDraft({ status: 'trial', publish_count: 0, monthly_cost: 0, domain_category: '안과' });
  };
  const openEdit = (t: SbTenant) => { setEditing(t); setDraft({ ...t }); };
  const close = () => { setEditing(null); setDraft({}); };

  const save = async () => {
    if (!draft.name?.toString().trim()) {
      showToast('병원명은 필수입니다', { kind: 'error' });
      return;
    }
    setSaving(true);
    try {
      const isUpdate = editing && (editing as SbTenant).id;
      const url = isUpdate ? `/api/admin/tenants/${(editing as SbTenant).id}` : '/api/admin/tenants';
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
    } finally { setSaving(false); }
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
          <h1 className="text-2xl font-bold text-ink">클라이언트 ({tenants.length})</h1>
          <p className="mt-1 text-sm text-ink-muted">병원/의원 단위 멀티 테넌트 관리 — Supabase tenants 실시간 연결</p>
        </div>
        <button onClick={openNew} className="btn-primary text-xs">
          <Plus className="h-3.5 w-3.5" /> 신규 클라이언트
        </button>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3 text-left">병원명</th>
              <th className="px-4 py-3 text-left">진료과목</th>
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
              <tr><td colSpan={8} className="px-4 py-10 text-center text-xs text-ink-muted">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" /><div className="mt-2">로드 중…</div>
              </td></tr>
            )}
            {!loading && tenants.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-xs text-ink-muted">
                등록된 클라이언트가 없습니다.
              </td></tr>
            )}
            {tenants.map((t) => {
              const status = (t.status ?? 'trial') as TenantStatus;
              return (
                <tr key={String(t.id)} className="border-t border-border hover:bg-surface-subtle">
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-ink">{t.name}</div>
                    <div className="text-[11px] text-ink-muted">{t.business_model ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{t.domain_category ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{t.region ?? '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-brand-700">{t.partner_slug ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-xs font-mono">{t.publish_count ?? 0}</td>
                  <td className="px-4 py-3 text-right text-xs font-mono">${Number(t.monthly_cost ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3"><span className={STATUS_CHIP[status].cls}>{STATUS_CHIP[status].label}</span></td>
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
          <div className="card w-full max-w-lg max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-bold text-ink">
                {(editing as SbTenant).id ? '클라이언트 편집' : '신규 클라이언트 등록'}
              </h3>
              <button onClick={close} className="rounded-md p-1 text-ink-muted hover:bg-surface-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-6 py-5 text-sm">
              {/* 병원명 (필수) */}
              <Field label="병원명 *" placeholder="BGN 밝은눈안과 잠실"
                value={draft.name ?? ''} onChange={(v) => setDraft((p) => ({ ...p, name: v }))} />

              {/* 진료과목 (select) */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">진료과목</label>
                <select className="input-base" value={draft.domain_category ?? '안과'}
                  onChange={(e) => setDraft((p) => ({ ...p, domain_category: e.target.value }))}>
                  {DOMAIN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <Field label="지역" placeholder="잠실 / 강남 / 송파"
                value={draft.region ?? ''} onChange={(v) => setDraft((p) => ({ ...p, region: v }))} />
              <Field label="비즈니스 모델" placeholder="라식·라섹·스마일라식"
                value={draft.business_model ?? ''} onChange={(v) => setDraft((p) => ({ ...p, business_model: v }))} />
              <Field label="주소" placeholder="서울 송파구 ..."
                value={draft.address ?? ''} onChange={(v) => setDraft((p) => ({ ...p, address: v }))} />
              <Field label="네이버 플레이스 URL" placeholder="https://map.naver.com/p/..."
                value={draft.naver_place_url ?? ''} onChange={(v) => setDraft((p) => ({ ...p, naver_place_url: v }))} />
              <Field label="홈페이지" placeholder="https://example.com"
                value={draft.homepage ?? ''} onChange={(v) => setDraft((p) => ({ ...p, homepage: v }))} />
              <Field label="전화번호" placeholder="02-0000-0000"
                value={draft.phone ?? ''} onChange={(v) => setDraft((p) => ({ ...p, phone: v }))} />
              <Field label="partner_slug (URL용 영문)" placeholder="bgn / tete / mourim"
                value={draft.partner_slug ?? ''} onChange={(v) => setDraft((p) => ({ ...p, partner_slug: v }))} />

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">상태</label>
                <select className="input-base" value={draft.status ?? 'trial'}
                  onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value as TenantStatus }))}>
                  <option value="trial">체험</option>
                  <option value="active">활성</option>
                  <option value="paused">일시정지</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button onClick={close} className="btn-secondary text-xs" disabled={saving}>취소</button>
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

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-ink">{label}</label>
      <input className="input-base" placeholder={placeholder}
        value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
