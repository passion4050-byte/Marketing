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
  // Round 42 D — purpose 컬럼 추가
  purpose?: 'own' | 'competitor_landscape' | string;
  is_saas_marketing?: boolean;
  // Round 174 (2026-08-23) — is_active 하나가 '발행'과 'AI 인용 측정'을 동시에 제어해서
  //   헤드 키워드를 측정만 남기고 발행에서 빼는 게 불가능했다. 두 축으로 분리.
  content_eligible?: boolean;
  measure_eligible?: boolean;
  lang?: string;
  /** 어절 수 — 롱테일 여부의 1차 지표 (GSC: 1~2어절 헤드 텀은 44~91위, 클릭 0) */
  tokens?: number;
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
  // Round 42 D — purpose 필터 (all/own/competitor)
  const [purposeFilter, setPurposeFilter] = useState<'all' | 'own' | 'competitor_landscape'>('all');
  const [search, setSearch] = useState('');

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

  /**
   * Round 174 — 발행/측정 플래그 개별 토글.
   *   content_eligible=false → 발행 로테이션에서만 제외 (AI 인용 측정은 그대로)
   *   measure_eligible=false → 측정에서만 제외 (발행은 그대로, LLM 크레딧 절약)
   */
  const toggleFlag = async (r: KwRow, field: 'content_eligible' | 'measure_eligible') => {
    const next = !(r[field] ?? true);
    try {
      const res = await fetch(`/api/admin/keywords/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'toggle failed');
      await load();
    } catch (e) {
      showToast(`플래그 변경 실패: ${(e as Error).message}`, { kind: 'error' });
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

  /*
   * Round 169 (2026-08-20) — 모바일: 7컬럼 표 → 듀얼 레이아웃.
   * 표는 min-width 640px 이 필요해 360px 화면에서 가로 스크롤 없이는 못 읽는다.
   * tenants 페이지에 이미 있는 패턴(md:hidden 카드 + hidden md:block 표)을 그대로 적용.
   * 필터/검색 결과는 두 레이아웃이 공유하도록 여기서 한 번만 계산.
   */
  const visibleRows = rows
    .filter((r) => purposeFilter === 'all' || r.purpose === purposeFilter)
    .filter((r) => !search
      || r.text.toLowerCase().includes(search.toLowerCase())
      || r.tenant_name.toLowerCase().includes(search.toLowerCase())
      || (r.category ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    // Round 169 (2026-08-20) — 모바일: px-8 하드코딩 → 반응형(md+ 는 기존 px-8 복원)
    <div className="px-4 py-5 md:px-8 md:py-6">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">키워드 풀 ({rows.length})</h1>
          <p className="admin-page-desc">측정 대상 키워드를 등록하고 클라이언트별 전용 키워드 풀을 관리합니다</p>
        </div>
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

      {/* Round 42 D — purpose 필터 + 검색 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-[12px]">
          <span className="text-ink-muted">분류:</span>
          {[
            { key: 'all' as const, label: `전체 (${rows.length})` },
            { key: 'own' as const, label: `자사 own (${rows.filter((r) => r.purpose === 'own').length})` },
            { key: 'competitor_landscape' as const, label: `경쟁 (${rows.filter((r) => r.purpose === 'competitor_landscape').length})` },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setPurposeFilter(opt.key)}
              className={cn(
                'rounded-md border px-2.5 py-1 font-semibold transition',
                purposeFilter === opt.key
                  ? 'border-ink bg-ink text-white'
                  : 'border-border bg-surface-base text-ink-soft hover:bg-surface-soft'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="키워드/테넌트/카테고리 검색"
          className="flex-1 max-w-[280px] rounded border border-border bg-surface-base px-2 py-1 text-[12px]"
        />
      </div>

      {/* 데스크톱 — 기존 7컬럼 표 그대로 (md+) */}
      <div className="card hidden overflow-hidden md:block">
        <div className="admin-table-wrap">
        <table className="w-full text-sm">
          <thead className="bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3 text-left">키워드</th>
              <th className="px-4 py-3 text-left">분류</th>
              <th className="px-4 py-3 text-left">테넌트</th>
              <th className="px-4 py-3 text-left">카테고리</th>
              <th className="px-4 py-3 text-left">target_brand</th>
              <th className="px-4 py-3 text-left">상태</th>
              <th className="px-4 py-3 text-left">발행 · 측정</th>
              <th className="px-4 py-3 text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-ink-muted">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" /><div className="mt-2">로드 중…</div>
              </td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-ink-muted">
                등록된 키워드가 없습니다.
              </td></tr>
            )}
            {visibleRows.map((r) => (
              <tr key={String(r.id)} className="border-t border-border hover:bg-surface-subtle">
                <td className="px-4 py-3 text-sm font-semibold text-ink">
                  {r.text}
                  {r.is_saas_marketing && (
                    <span className="ml-1 rounded bg-surface-muted px-1 py-0.5 text-[9px] font-bold text-ink-soft">SaaS</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-bold',
                    r.purpose === 'own' ? 'bg-surface-muted text-ink-soft'
                    : r.purpose === 'competitor_landscape' ? 'bg-status-warningSoft text-status-warning'
                    : 'bg-surface-subtle text-ink-muted'
                  )}>
                    {r.purpose === 'own' ? '자사' : r.purpose === 'competitor_landscape' ? '경쟁' : '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{r.tenant_name}</td>
                <td className="px-4 py-3 text-xs">{r.category ?? '—'}</td>
                <td className="px-4 py-3 text-xs font-mono text-ink">{r.target_brand ?? '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(r)}
                    className={cn('chip-base px-2', r.is_active ? 'chip-success' : 'chip-neutral')}>
                    {r.is_active ? '활성' : '일시정지'}
                  </button>
                </td>
                {/* Round 174 — 발행/측정 분리 토글 + 어절 수(롱테일 지표) */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleFlag(r, 'content_eligible')}
                      title="발행 로테이션 포함 여부 (측정과 무관)"
                      className={cn('chip-base px-2', (r.content_eligible ?? true) ? 'chip-success' : 'chip-neutral')}>
                      발행
                    </button>
                    <button
                      onClick={() => toggleFlag(r, 'measure_eligible')}
                      title="AI 인용 측정 포함 여부 (LLM 크레딧 소모)"
                      className={cn('chip-base px-2', (r.measure_eligible ?? true) ? 'chip-success' : 'chip-neutral')}>
                      측정
                    </button>
                    {typeof r.tokens === 'number' && (
                      <span
                        title={r.tokens <= 2
                          ? '헤드 텀 — GSC 실측 44~91위, 클릭 0. 발행 대상으로는 부적합'
                          : '롱테일 — 이 도메인이 실제로 순위가 나오는 구간'}
                        className={cn('chip-base px-2 tabular-nums',
                          r.tokens <= 2 ? 'chip-neutral' : 'chip-success')}>
                        {r.tokens}어절
                      </span>
                    )}
                  </div>
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
        </div>
        <div className="border-t border-border bg-surface-subtle px-4 py-2.5 text-[11px] text-ink-muted">
          7D 인용 / CTR 컬럼은 별도 분석 파이프라인 연결 후 자동 표시 (Phase 2)
        </div>
      </div>

      {/* 모바일 — 카드 리스트 (md 미만). 표의 7컬럼을 '키워드 → 소속 → 액션' 위계로 재배치 */}
      <div className="space-y-2 md:hidden">
        {loading && (
          <div className="card admin-empty">
            <Loader2 className="admin-empty-icon animate-spin" />
            <div className="admin-empty-title">로드 중…</div>
          </div>
        )}
        {!loading && visibleRows.length === 0 && (
          <div className="card admin-empty">
            <div className="admin-empty-title">
              {rows.length === 0 ? '등록된 키워드 없음' : '조건에 맞는 키워드 없음'}
            </div>
            <div className="admin-empty-desc">
              {rows.length === 0 ? '상단 입력창에서 키워드를 추가하세요' : '분류·검색어를 바꿔 보세요'}
            </div>
          </div>
        )}
        {visibleRows.map((r) => (
          <div key={`m-${String(r.id)}`} className="card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="break-keep text-[15px] font-bold leading-snug text-ink">
                  {r.text}
                  {r.is_saas_marketing && (
                    <span className="ml-1 align-middle rounded bg-surface-muted px-1 py-0.5 text-[9px] font-bold text-ink-soft">
                      SaaS
                    </span>
                  )}
                </div>
                <div className="mt-1 truncate text-[12px] text-ink-muted">{r.tenant_name}</div>
              </div>
              <span className={cn(
                'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold',
                r.purpose === 'own' ? 'bg-surface-muted text-ink-soft'
                : r.purpose === 'competitor_landscape' ? 'bg-status-warningSoft text-status-warning'
                : 'bg-surface-subtle text-ink-muted'
              )}>
                {r.purpose === 'own' ? '자사' : r.purpose === 'competitor_landscape' ? '경쟁' : '—'}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-ink-soft">
              <div className="truncate"><span className="text-ink-muted">카테고리:</span> {r.category ?? '—'}</div>
              <div className="truncate">
                <span className="text-ink-muted">target:</span>{' '}
                <span className="font-mono text-ink">{r.target_brand ?? '—'}</span>
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-2 border-t border-border pt-2.5">
              <button
                onClick={() => toggle(r)}
                className={cn(
                  'inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border text-[12px] font-semibold transition active:scale-95',
                  r.is_active
                    ? 'border-status-success/30 bg-status-successSoft text-status-success'
                    : 'border-border bg-surface-subtle text-ink-muted'
                )}
              >
                {r.is_active ? '활성 — 탭하면 일시정지' : '일시정지 — 탭하면 활성'}
              </button>
              <button
                onClick={() => remove(r.id)}
                aria-label="키워드 삭제"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-ink-muted active:bg-status-dangerSoft active:text-status-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        <div className="px-1 text-[11px] text-ink-muted">
          7D 인용 / CTR 컬럼은 별도 분석 파이프라인 연결 후 자동 표시 (Phase 2)
        </div>
      </div>
    </div>
  );
}
