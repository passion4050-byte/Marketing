/**
 * Round 37 C (2026-05-31) — 5-tier 도메인 분류 사전 관리 페이지.
 *
 * 기능:
 *   - 분류 사전 전체 목록 (T1/T3/T4/NOISE) — tier 별 카운트
 *   - 인라인 추가 (domain + tier + category + notes)
 *   - 인라인 편집 (tier 변경 / 활성 토글 / notes 수정)
 *   - 삭제 + 검색 필터
 *
 * 변경 즉시 lib/domain-classifier 의 cache 무효화 → citations/competitors 가 최대 5초 후 반영
 * (다음 fresh request).
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Loader2,
  Search,
  Filter,
  ShieldCheck,
  Globe,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/cn';

type Classification = {
  id: number;
  domain: string;
  tier: 'T1' | 'T3' | 'T4' | 'NOISE';
  category: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  classifications: Classification[];
  count: number;
  tier_count: { T1: number; T3: number; T4: number; NOISE: number };
};

const TIER_META: Record<Classification['tier'], { label: string; color: string; icon: typeof ShieldCheck; desc: string }> = {
  T1: { label: 'T1 메디맵', color: 'bg-brand text-white', icon: ShieldCheck, desc: '메디맵 SaaS 자체 도메인' },
  T3: { label: 'T3 권위', color: 'bg-status-warning text-white', icon: Building2, desc: '종합병원·학회·의료매체' },
  T4: { label: 'T4 플랫폼', color: 'bg-status-success text-white', icon: Globe, desc: '의료 플랫폼 (모두닥·강남언니 등)' },
  NOISE: { label: 'NOISE', color: 'bg-ink-muted text-white', icon: AlertTriangle, desc: '검색·위키·블로그 — 카운트 제외' },
};

export default function DomainClassificationsPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Classification[]>([]);
  const [tierCount, setTierCount] = useState({ T1: 0, T3: 0, T4: 0, NOISE: 0 });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | Classification['tier']>('ALL');

  // 신규 추가 form
  const [newDomain, setNewDomain] = useState('');
  const [newTier, setNewTier] = useState<Classification['tier']>('T3');
  const [newCategory, setNewCategory] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [adding, setAdding] = useState(false);

  // 편집
  const [editId, setEditId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Classification>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/domain-classifications');
      const json: ApiResponse = await res.json();
      if (!json.ok) {
        setError(json.error ?? '로드 실패');
        return;
      }
      setList(json.classifications);
      setTierCount(json.tier_count);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return list.filter((c) => {
      if (tierFilter !== 'ALL' && c.tier !== tierFilter) return false;
      if (search && !c.domain.toLowerCase().includes(search.toLowerCase()) &&
          !(c.category ?? '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [list, search, tierFilter]);

  const add = async () => {
    if (!newDomain.trim()) {
      alert('도메인 입력 필요');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/admin/domain-classifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: newDomain.trim(),
          tier: newTier,
          category: newCategory.trim() || null,
          notes: newNotes.trim() || null,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        alert(`추가 실패: ${json.error}`);
        return;
      }
      setNewDomain('');
      setNewCategory('');
      setNewNotes('');
      load();
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (c: Classification) => {
    setEditId(c.id);
    setEditDraft({ tier: c.tier, category: c.category, notes: c.notes, is_active: c.is_active });
  };

  const saveEdit = async () => {
    if (editId == null) return;
    const res = await fetch(`/api/admin/domain-classifications?id=${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editDraft),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!json.ok) {
      alert(`저장 실패: ${json.error}`);
      return;
    }
    setEditId(null);
    setEditDraft({});
    load();
  };

  const toggleActive = async (c: Classification) => {
    await fetch(`/api/admin/domain-classifications?id=${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    load();
  };

  const remove = async (c: Classification) => {
    if (!confirm(`${c.domain} 분류를 삭제하시겠습니까?`)) return;
    await fetch(`/api/admin/domain-classifications?id=${c.id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">도메인 분류 사전</h1>
          <div className="mt-1 text-[12px] text-ink-muted">
            5-tier 분류 규칙 — citations/competitors API 가 최대 5분 캐시 후 반영
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-md border border-border bg-surface-base px-3 py-1.5 text-[12px] font-semibold text-ink-soft hover:bg-surface-soft disabled:opacity-50"
        >
          {loading && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}새로고침
        </button>
      </div>

      {/* tier 카운트 카드 */}
      <div className="grid grid-cols-4 gap-3">
        {(Object.keys(TIER_META) as Classification['tier'][]).map((t) => {
          const meta = TIER_META[t];
          const Icon = meta.icon;
          return (
            <button
              key={t}
              onClick={() => setTierFilter(tierFilter === t ? 'ALL' : t)}
              className={cn(
                'rounded-lg border p-3 text-left transition',
                tierFilter === t ? 'border-brand bg-brand-50' : 'border-border bg-surface-base hover:bg-surface-soft'
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded', meta.color)}>
                  <Icon className="h-3 w-3" />
                </span>
                <div className="text-[11px] font-semibold text-ink-muted">{meta.label}</div>
              </div>
              <div className="mt-1 text-xl font-bold text-ink">{tierCount[t]}</div>
              <div className="mt-0.5 text-[10px] text-ink-faint">{meta.desc}</div>
            </button>
          );
        })}
      </div>

      {/* 신규 추가 카드 */}
      <section className="card">
        <header className="border-b border-border px-5 py-3">
          <h2 className="section-title">
            <Plus className="mr-1 inline h-4 w-4 text-brand" />신규 도메인 분류 추가
          </h2>
          <div className="mt-1 text-[11px] text-ink-muted">
            T2 (클라이언트 자체) 는 동적 — 클라이언트 편집에서 additional_domains 로 추가. T5 는 default 라 별도 등록 불필요.
          </div>
        </header>
        <div className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-12">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="예: www.example.com (lowercase)"
            className="rounded border border-border bg-surface-base px-2 py-1.5 text-[12px] md:col-span-4"
          />
          <select
            value={newTier}
            onChange={(e) => setNewTier(e.target.value as Classification['tier'])}
            className="rounded border border-border bg-surface-base px-2 py-1.5 text-[12px] md:col-span-2"
          >
            <option value="T1">T1 메디맵</option>
            <option value="T3">T3 권위</option>
            <option value="T4">T4 플랫폼</option>
            <option value="NOISE">NOISE</option>
          </select>
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="카테고리 (예: 학회, 플랫폼)"
            className="rounded border border-border bg-surface-base px-2 py-1.5 text-[12px] md:col-span-2"
          />
          <input
            type="text"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="비고 (예: 대한안과학회)"
            className="rounded border border-border bg-surface-base px-2 py-1.5 text-[12px] md:col-span-3"
          />
          <button
            onClick={add}
            disabled={adding || !newDomain.trim()}
            className="inline-flex items-center justify-center gap-1 rounded bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50 md:col-span-1"
          >
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}추가
          </button>
        </div>
      </section>

      {/* 검색 + 목록 */}
      <section className="card">
        <header className="flex flex-col gap-2 border-b border-border px-5 py-3 md:flex-row md:items-center md:justify-between">
          <h2 className="section-title">분류 목록 ({filtered.length}건 / 전체 {list.length}건)</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="도메인 / 카테고리 검색"
                className="rounded border border-border bg-surface-base py-1 pl-7 pr-2 text-[11px]"
              />
            </div>
            {tierFilter !== 'ALL' && (
              <button
                onClick={() => setTierFilter('ALL')}
                className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] text-ink-soft hover:bg-surface-soft"
              >
                <X className="h-3 w-3" />필터: {tierFilter}
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="m-5 rounded border border-status-danger/30 bg-status-dangerSoft/40 px-3 py-2 text-[11px] text-status-danger">
            <AlertTriangle className="mr-1 inline h-3 w-3" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-ink-muted">
            <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />로딩 중...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-ink-muted">
            <Filter className="mx-auto mb-1 h-5 w-5 text-ink-faint" />검색 결과 없음
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface-subtle text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-3 py-2 text-left">도메인</th>
                  <th className="px-3 py-2 text-left">Tier</th>
                  <th className="px-3 py-2 text-left">카테고리</th>
                  <th className="px-3 py-2 text-left">비고</th>
                  <th className="px-3 py-2 text-center">활성</th>
                  <th className="px-3 py-2 text-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const meta = TIER_META[c.tier];
                  const editing = editId === c.id;
                  return (
                    <tr key={c.id} className={cn('border-t border-border', !c.is_active && 'opacity-50')}>
                      <td className="px-3 py-2 font-mono">{c.domain}</td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <select
                            value={editDraft.tier}
                            onChange={(e) => setEditDraft({ ...editDraft, tier: e.target.value as Classification['tier'] })}
                            className="rounded border border-border bg-surface-base px-1.5 py-0.5 text-[11px]"
                          >
                            <option value="T1">T1</option>
                            <option value="T3">T3</option>
                            <option value="T4">T4</option>
                            <option value="NOISE">NOISE</option>
                          </select>
                        ) : (
                          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', meta.color)}>
                            {c.tier}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <input
                            type="text"
                            value={editDraft.category ?? ''}
                            onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                            className="w-full rounded border border-border bg-surface-base px-1.5 py-0.5 text-[11px]"
                          />
                        ) : (
                          <span className="text-ink-soft">{c.category ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editing ? (
                          <input
                            type="text"
                            value={editDraft.notes ?? ''}
                            onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })}
                            className="w-full rounded border border-border bg-surface-base px-1.5 py-0.5 text-[11px]"
                          />
                        ) : (
                          <span className="text-ink-muted">{c.notes ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => toggleActive(c)}
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                            c.is_active ? 'bg-brand text-white' : 'border border-border text-ink-muted'
                          )}
                        >
                          {c.is_active ? '활성' : '비활성'}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {editing ? (
                          <div className="inline-flex items-center gap-1">
                            <button onClick={saveEdit} className="rounded bg-brand px-1.5 py-0.5 text-[10px] text-white hover:bg-brand-dark">
                              <Save className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => {
                                setEditId(null);
                                setEditDraft({});
                              }}
                              className="rounded border border-border px-1.5 py-0.5 text-[10px] text-ink-soft hover:bg-surface-soft"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => startEdit(c)}
                              className="rounded border border-border px-1.5 py-0.5 text-[10px] text-ink-soft hover:bg-surface-soft"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => remove(c)}
                              className="rounded border border-status-danger/30 px-1.5 py-0.5 text-[10px] text-status-danger hover:bg-status-dangerSoft/40"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
