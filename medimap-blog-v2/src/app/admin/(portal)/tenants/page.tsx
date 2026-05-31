'use client';

import { useCallback, useEffect, useState } from 'react';
import { Edit3, Loader2, Pause, Play, Plus, Trash2, X } from 'lucide-react';
import { showToast } from '@/lib/clientActions';
import { HomepageAnalyzeButton } from '@/components/admin/HomepageAnalyzeButton';
import { TenantOwnKeywordsEditor } from '@/components/admin/TenantOwnKeywordsEditor';

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
  email: string | null;
  partner_slug: string | null;
  status: TenantStatus | null;
  publish_count: number | null;
  monthly_cost: number | null;
  joined_at: string | null;
  report_send_day: number | null; // Round 53 — 1~28일
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

  const remove = async (id: SbTenant['id'], name?: string) => {
    // Round 23 (2026-05-28): CASCADE DELETE 사고 재발 방지 — 명시적 경고 강화.
    // 클라이언트 삭제 시 generated_contents·keywords·auto_content_settings 모두 함께 삭제됨.
    const label = name ? `"${name}"` : '이 클라이언트';
    const msg =
      `${label} 을(를) 삭제하시겠습니까?\n\n` +
      `⚠️  이 클라이언트와 연결된 모든 데이터가 함께 삭제됩니다:\n` +
      `  • 발행된 모든 글 (generated_contents)\n` +
      `  • 키워드 풀 (keywords)\n` +
      `  • 자동 발행 정책 (auto_content_settings)\n\n` +
      `복구 불가입니다. 정말 진행하시겠습니까?`;
    if (!confirm(msg)) return;
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
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">클라이언트 ({tenants.length})</h1>
          <p className="admin-page-desc">병·의원 등록 · 키워드 풀 / own 키워드 · 이메일 발송 대상 관리</p>
        </div>
        <button onClick={openNew} className="btn-primary text-xs">
          <Plus className="h-3.5 w-3.5" /> 신규 클라이언트
        </button>
      </header>

      {/* Round 43 F (2026-05-31) — 데스크탑 표 + 모바일 카드 dual layout */}
      {/* 데스크탑 (md+) 표 */}
      <div className="card hidden overflow-hidden md:block">
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
                      <button onClick={() => remove(t.id, t.name)} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-base hover:text-status-danger" aria-label="삭제">
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

      {/* 모바일 (sm) 카드 list */}
      <div className="space-y-2 md:hidden">
        {loading && (
          <div className="card admin-empty">
            <Loader2 className="admin-empty-icon animate-spin" />
            <div className="admin-empty-title">로드 중…</div>
          </div>
        )}
        {!loading && tenants.length === 0 && (
          <div className="card admin-empty">
            <div className="admin-empty-title">등록된 클라이언트 없음</div>
            <div className="admin-empty-desc">상단 [신규 클라이언트] 버튼으로 추가</div>
          </div>
        )}
        {tenants.map((t) => {
          const status = (t.status ?? 'trial') as TenantStatus;
          return (
            <div key={String(t.id)} className="card p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">{t.name}</div>
                  <div className="mt-0.5 truncate text-[11px] text-ink-muted">{t.business_model ?? '—'}</div>
                </div>
                <span className={STATUS_CHIP[status].cls + ' shrink-0'}>{STATUS_CHIP[status].label}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-ink-soft">
                <div><span className="text-ink-muted">진료과목:</span> {t.domain_category ?? '—'}</div>
                <div><span className="text-ink-muted">지역:</span> {t.region ?? '—'}</div>
                <div className="col-span-2 truncate">
                  <span className="text-ink-muted">slug:</span>{' '}
                  <span className="font-mono text-brand-700">{t.partner_slug ?? '—'}</span>
                </div>
                <div><span className="text-ink-muted">발행:</span> {t.publish_count ?? 0}편</div>
                <div><span className="text-ink-muted">월 비용:</span> ${Number(t.monthly_cost ?? 0).toFixed(2)}</div>
              </div>
              <div className="mt-2 flex justify-end gap-1 border-t border-border pt-2">
                <button
                  onClick={() => togglePause(t)}
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-border px-2.5 text-[11px] font-semibold text-ink-soft active:bg-surface-soft"
                >
                  {status === 'paused' ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                  {status === 'paused' ? '재개' : '일시정지'}
                </button>
                <button
                  onClick={() => openEdit(t)}
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-brand/30 bg-brand-50 px-2.5 text-[11px] font-semibold text-brand active:bg-brand-100"
                >
                  <Edit3 className="h-3 w-3" />편집
                </button>
                <button
                  onClick={() => remove(t.id, t.name)}
                  className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-status-danger/30 px-2 text-status-danger active:bg-status-dangerSoft"
                  aria-label="삭제"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
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
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">비즈니스 모델</label>
                <input
                  type="text"
                  className="input-base"
                  placeholder="라식,라섹,스마일라식 (콤마 구분)"
                  value={draft.business_model ?? ''}
                  onChange={(e) => setDraft((p) => ({ ...p, business_model: e.target.value }))}
                />
                {/* Round 34 phase 4 (2026-05-30): 홈페이지 자동 분석 → 비즈니스 모델 추출 */}
                <HomepageAnalyzeButton
                  tenantId={(editing as SbTenant)?.id}
                  homepage={draft.homepage ?? ''}
                  onApply={(keywords) =>
                    setDraft((p) => ({ ...p, business_model: keywords }))
                  }
                />
              </div>

              {/* Round 45 — own 키워드 chip editor */}
              <TenantOwnKeywordsEditor
                tenantId={typeof (editing as SbTenant)?.id === 'number' ? (editing as SbTenant).id as number : undefined}
                defaultCategory={draft.domain_category ?? null}
              />

              <Field label="주소" placeholder="서울 송파구 ..."
                value={draft.address ?? ''} onChange={(v) => setDraft((p) => ({ ...p, address: v }))} />
              <Field label="네이버 플레이스 URL" placeholder="https://map.naver.com/p/..."
                value={draft.naver_place_url ?? ''} onChange={(v) => setDraft((p) => ({ ...p, naver_place_url: v }))} />
              <Field label="홈페이지" placeholder="https://example.com"
                value={draft.homepage ?? ''} onChange={(v) => setDraft((p) => ({ ...p, homepage: v }))} />
              <Field label="전화번호" placeholder="02-0000-0000"
                value={draft.phone ?? ''} onChange={(v) => setDraft((p) => ({ ...p, phone: v }))} />
              <Field label="이메일 (보고서 발송용)" placeholder="manager@example.com"
                value={draft.email ?? ''} onChange={(v) => setDraft((p) => ({ ...p, email: v }))} />
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

              {/* Round 53 — 월간 보고서 발송일 (1~28일) */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">월간 보고서 발송일</label>
                <select className="input-base" value={String(draft.report_send_day ?? 1)}
                  onChange={(e) => setDraft((p) => ({ ...p, report_send_day: Number(e.target.value) }))}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}일</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-ink-muted">매월 이 날 18시 KST 에 보고서 이메일 자동 발송</p>
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
