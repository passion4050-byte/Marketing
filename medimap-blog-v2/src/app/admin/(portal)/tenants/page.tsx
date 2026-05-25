'use client';

import { useState } from 'react';
import { Edit3, Pause, Play, Plus, Trash2, X } from 'lucide-react';
import { adminTenants as base, type AdminTenant, type TenantStatus } from '@/lib/admin-mock';
import { showToast } from '@/lib/clientActions';
import { cn } from '@/lib/cn';

const STATUS_CHIP: Record<TenantStatus, { label: string; cls: string }> = {
  active: { label: '활성', cls: 'chip-success' },
  paused: { label: '일시정지', cls: 'chip-neutral' },
  trial: { label: '체험', cls: 'chip-warning' }
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>(base);
  const [editing, setEditing] = useState<AdminTenant | null>(null);
  const [draft, setDraft] = useState<Partial<AdminTenant>>({});

  const openNew = () => {
    setEditing({} as AdminTenant);
    setDraft({ status: 'trial', publishCount: 0, monthlyCost: 0 });
  };
  const openEdit = (t: AdminTenant) => {
    setEditing(t);
    setDraft({ ...t });
  };
  const close = () => { setEditing(null); setDraft({}); };

  const save = () => {
    if (!draft.name?.trim() || !draft.domain?.trim()) {
      showToast('병원명과 도메인은 필수입니다', { kind: 'error' });
      return;
    }
    if (editing?.id) {
      setTenants((p) => p.map((t) => (t.id === editing.id ? { ...t, ...draft } as AdminTenant : t)));
      showToast(`${draft.name} 정보 수정됨`);
    } else {
      const newT: AdminTenant = {
        id: `t-${Date.now()}`,
        name: draft.name!,
        domain: draft.domain!,
        category: draft.category ?? '안과',
        region: draft.region ?? '',
        contact: draft.contact ?? '',
        status: (draft.status as TenantStatus) ?? 'trial',
        publishCount: 0,
        monthlyCost: 0,
        joinedAt: new Date().toISOString().slice(0, 10)
      };
      setTenants((p) => [newT, ...p]);
      showToast(`${newT.name} 등록됨`);
    }
    close();
  };

  const remove = (id: string) => {
    if (!confirm('이 클라이언트를 삭제할까요? (복구 불가)')) return;
    setTenants((p) => p.filter((t) => t.id !== id));
    showToast('삭제됨');
  };

  const togglePause = (id: string) => {
    setTenants((p) =>
      p.map((t) =>
        t.id === id ? { ...t, status: t.status === 'paused' ? 'active' : 'paused' } : t
      )
    );
  };

  return (
    <div className="px-8 py-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">클라이언트 ({tenants.length})</h1>
          <p className="mt-1 text-sm text-ink-muted">병원/의원 단위 멀티 테넌트 관리</p>
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
              <th className="px-4 py-3 text-right">발행 누적</th>
              <th className="px-4 py-3 text-right">월 비용</th>
              <th className="px-4 py-3 text-left">상태</th>
              <th className="px-4 py-3 text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-t border-border hover:bg-surface-subtle">
                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-ink">{t.name}</div>
                  <div className="text-[11px] text-ink-muted">{t.domain}</div>
                </td>
                <td className="px-4 py-3 text-xs">{t.category}</td>
                <td className="px-4 py-3 text-xs">{t.region}</td>
                <td className="px-4 py-3 text-right text-xs font-mono">{t.publishCount}</td>
                <td className="px-4 py-3 text-right text-xs font-mono">${t.monthlyCost.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={STATUS_CHIP[t.status].cls}>{STATUS_CHIP[t.status].label}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => togglePause(t.id)} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-base hover:text-brand-700" aria-label="일시정지/재개">
                      {t.status === 'paused' ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
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
            ))}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/60 p-4" onClick={close}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-bold text-ink">
                {editing.id ? '클라이언트 편집' : '신규 클라이언트 등록'}
              </h3>
              <button onClick={close} className="rounded-md p-1 text-ink-muted hover:bg-surface-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-6 py-5 text-sm">
              {([
                ['name', '병원명 *', 'BGN 밝은눈안과 잠실'],
                ['domain', '도메인 *', 'bgn-jamsil.example'],
                ['category', '카테고리', '안과 / 모발이식 / 피부과'],
                ['region', '지역', '잠실'],
                ['contact', '담당자 이메일', 'manager@bgn.com']
              ] as const).map(([k, l, ph]) => (
                <div key={k}>
                  <label className="mb-1 block text-xs font-semibold text-ink">{l}</label>
                  <input
                    className="input-base"
                    placeholder={ph}
                    value={(draft as any)[k] ?? ''}
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
              <button onClick={close} className="btn-secondary text-xs">취소</button>
              <button onClick={save} className="btn-primary text-xs">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
