/**
 * Data Feeding — 다중 entry 지원.
 * 카테고리당 N개 entry 등록 (의사 N명, 장비 M개 등) + 리스트 표시 + 편집/삭제.
 *
 * 저장 스키마 (localStorage):
 *   {
 *     [categoryId: string]: Array<{ id, values: Record<fieldId, string>, createdAt, updatedAt }>
 *   }
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BadgePercent,
  ChevronRight,
  Clock3,
  Edit3,
  MapPin,
  Megaphone,
  MessageCircleQuestion,
  Microscope,
  Plus,
  Star,
  Stethoscope,
  Syringe,
  Trash2,
  X
} from 'lucide-react';
import { Header } from '@/components/Header';
import { feedingCategories, feedingFields, currentTenant } from '@/lib/mock-data';
import type { FeedingCategoryId } from '@/lib/types';
import { cn } from '@/lib/cn';
import { showToast } from '@/lib/clientActions';

const LS_KEY = 'medimap-geo:data-feeding:v2';

const iconMap = {
  Stethoscope,
  Microscope,
  BadgePercent,
  Clock3,
  MapPin,
  Syringe,
  Megaphone,
  MessageCircleQuestion,
  Star
} as const;

const STATUS_CHIP = {
  pending: { label: '대기 중', cls: 'chip-warning' },
  in_progress: { label: '진행 중', cls: 'chip-brand' },
  completed: { label: '완료', cls: 'chip-success' }
} as const;

interface EntryRecord {
  id: string;
  values: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

type Store = Partial<Record<FeedingCategoryId, EntryRecord[]>>;

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(store));
}

export default function DataFeedingPage() {
  const [activeCat, setActiveCat] = useState<FeedingCategoryId>('doctor');
  const [store, setStore] = useState<Store>({});
  const [editingId, setEditingId] = useState<string | null>(null); // 편집 중 entry id (null = 리스트, 'new' = 새 추가, '<id>' = 편집)
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStore(readStore());
  }, []);

  const totalFields = feedingCategories.reduce((s, c) => s + c.totalFields, 0);
  const totalEntries = Object.values(store).reduce((s, arr) => s + (arr?.length ?? 0), 0);
  const baseFilled = feedingCategories.reduce((s, c) => s + c.filledFields, 0);
  const filledFields = Math.min(totalFields, baseFilled + totalEntries * 4);
  const progress = Math.round((filledFields / totalFields) * 100);

  const expertise = feedingCategories.filter((c) => c.group === 'expertise');
  const operation = feedingCategories.filter((c) => c.group === 'operation');
  const content = feedingCategories.filter((c) => c.group === 'content');

  const sum = (arr: typeof feedingCategories) => {
    const t = arr.reduce((s, c) => s + c.totalFields, 0);
    const f = arr.reduce((s, c) => s + c.filledFields, 0);
    const ent = arr.reduce((s, c) => s + (store[c.id]?.length ?? 0), 0);
    return Math.round((Math.min(t, f + ent * 4) / t) * 100);
  };

  const fields = useMemo(
    () => feedingFields.filter((f) => f.categoryId === activeCat),
    [activeCat]
  );
  const activeCatMeta = feedingCategories.find((c) => c.id === activeCat)!;
  const entries = store[activeCat] ?? [];

  // entry 카드 타이틀: 첫 required 필드 또는 첫 필드 값
  const entryTitle = (e: EntryRecord) => {
    const titleField = fields.find((f) => f.required) ?? fields[0];
    return titleField ? e.values[titleField.id] || `(이름 미입력)` : `(${e.id.slice(-4)})`;
  };

  const openNew = () => {
    setEditingId('new');
    setDraft({});
  };

  const openEdit = (e: EntryRecord) => {
    setEditingId(e.id);
    setDraft({ ...e.values });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const onSave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const missing = fields.filter((f) => f.required && !(draft[f.id] ?? '').trim());
    if (missing.length > 0) {
      showToast(`필수 필드 누락: ${missing.map((f) => f.label).join(', ')}`, { kind: 'error' });
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const next: Store = { ...store };
      const list = [...(next[activeCat] ?? [])];
      if (editingId === 'new') {
        list.push({
          id: `${activeCat}-${Date.now()}`,
          values: draft,
          createdAt: now,
          updatedAt: now
        });
      } else if (editingId) {
        const idx = list.findIndex((x) => x.id === editingId);
        if (idx >= 0) list[idx] = { ...list[idx], values: draft, updatedAt: now };
      }
      next[activeCat] = list;
      writeStore(next);
      setStore(next);
      await new Promise((r) => setTimeout(r, 180));
      setEditingId(null);
      setDraft({});
      showToast(
        editingId === 'new'
          ? `${activeCatMeta.title} 1개 추가됨 (총 ${list.length}개)`
          : `${activeCatMeta.title} 수정됨`
      );
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (entryId: string) => {
    if (!confirm('이 항목을 삭제할까요?')) return;
    const next: Store = { ...store };
    const list = (next[activeCat] ?? []).filter((x) => x.id !== entryId);
    next[activeCat] = list;
    writeStore(next);
    setStore(next);
    if (editingId === entryId) cancelEdit();
    showToast('삭제됨');
  };

  return (
    <>
      <Header
        title="병원 데이터 최적화"
        subtitle="프로필을 채울수록 병원 데이터를 입력하면 AI 답변용 구조화 데이터가 완성됩니다."
        tabs={[
          { label: '통합 대시보드 & AI 모니터링', href: '/' },
          { label: '데이터 피딩', active: true }
        ]}
      />

      <section className="grid grid-cols-1 gap-6 px-8 py-6 lg:grid-cols-[260px_1fr_280px]">
        <div className="card card-pad">
          <div className="kpi-label">AI 프로필 완성도</div>
          <div className="kpi-value">{progress}%</div>
          <div className="text-xs font-medium text-ink-muted">
            {filledFields}/{totalFields}개 항목 · 총 {totalEntries}건 등록
          </div>
        </div>

        <div className="card card-pad">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="section-title">{currentTenant.name} 데이터 피딩</div>
            </div>
            <div className="text-xs text-ink-muted">
              입력값은 FAQ, JSON-LD, AI 응답 시뮬레이터에 반영됩니다.
            </div>
          </div>
          <div className="mt-4 progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} aria-hidden />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-ink-muted">
            <span>의료 전문성 · {sum(expertise)}%</span>
            <span>운영·위치 · {sum(operation)}%</span>
            <span>콘텐츠·평판 · {sum(content)}%</span>
          </div>
        </div>

        <div className="card card-pad">
          <div className="section-subtle">현재 카테고리</div>
          <div className="mt-1 text-sm font-bold text-ink">{activeCatMeta.title}</div>
          <div className="mt-2">
            <span className="chip-brand">{entries.length}건 등록됨</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 px-8 pb-10 lg:grid-cols-[420px_1fr]">
        {/* 좌: 카테고리 리스트 */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="section-title">추가할 데이터 유형</h2>
            <span className="section-subtle">카테고리당 다수 등록 가능</span>
          </div>
          <ul className="divide-y divide-border">
            {feedingCategories.map((c) => {
              const Icon = iconMap[c.icon as keyof typeof iconMap] ?? Stethoscope;
              const active = c.id === activeCat;
              const count = store[c.id]?.length ?? 0;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCat(c.id);
                      setEditingId(null);
                      setDraft({});
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-surface-subtle',
                      active && 'bg-brand-50'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                        active ? 'bg-brand text-white' : 'bg-brand-100 text-brand-700'
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink">{c.title}</span>
                        {count > 0 ? (
                          <span className="chip-success">{count}건</span>
                        ) : (
                          <span className={STATUS_CHIP[c.status].cls}>
                            {STATUS_CHIP[c.status].label}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">{c.summary}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 우: 등록된 entries 리스트 OR 편집 폼 */}
        <div className="card">
          <div className="flex items-start justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="text-sm font-bold text-ink">
                {activeCatMeta.title}{' '}
                <span className="ml-2 text-xs font-normal text-ink-muted">
                  ({entries.length}건 등록)
                </span>
              </h2>
              <p className="mt-1 text-xs text-ink-muted">{activeCatMeta.summary}</p>
            </div>
            {editingId === null && (
              <button type="button" onClick={openNew} className="btn-primary text-xs">
                <Plus className="h-3.5 w-3.5" /> 새 {activeCatMeta.title} 추가
              </button>
            )}
          </div>

          {/* 리스트 모드 */}
          {editingId === null && (
            <div className="px-6 py-5">
              {entries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-ink-muted">
                  아직 등록된 {activeCatMeta.title}이(가) 없습니다.
                  <br />
                  우측 상단 "새 {activeCatMeta.title} 추가" 버튼으로 시작하세요.
                </div>
              ) : (
                <ul className="space-y-3">
                  {entries.map((e, idx) => (
                    <li
                      key={e.id}
                      className="rounded-xl border border-border bg-surface-subtle px-4 py-3 hover:border-brand-200 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-ink-muted">
                              #{String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="text-sm font-bold text-ink">{entryTitle(e)}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                            {fields.slice(1, 4).map((f) => {
                              const v = e.values[f.id]?.trim();
                              if (!v) return null;
                              return (
                                <span key={f.id}>
                                  <span className="font-semibold">{f.label}:</span>{' '}
                                  <span className="text-ink-soft">
                                    {v.length > 30 ? v.slice(0, 30) + '…' : v}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(e)}
                            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-base hover:text-brand-700"
                            aria-label="편집"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(e.id)}
                            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-base hover:text-status-danger"
                            aria-label="삭제"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* 편집 모드 */}
          {editingId !== null && (
            <form className="space-y-5 px-6 py-6" onSubmit={onSave}>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                  {editingId === 'new'
                    ? `새 ${activeCatMeta.title} 추가`
                    : `${activeCatMeta.title} 편집`}
                </div>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-md p-1 text-ink-muted hover:bg-surface-muted"
                  aria-label="닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {fields.length === 0 && (
                <p className="text-sm text-ink-muted">이 카테고리의 필드는 곧 추가됩니다.</p>
              )}
              {fields.map((f) => (
                <div key={f.id}>
                  <label className="mb-1 block text-xs font-semibold text-ink">
                    {f.label}
                    {f.required && <span className="ml-1 text-status-danger">*</span>}
                  </label>
                  {f.type === 'textarea' ? (
                    <textarea
                      className="input-base min-h-[110px] resize-y"
                      placeholder={f.placeholder}
                      value={draft[f.id] ?? ''}
                      onChange={(e) => setDraft((p) => ({ ...p, [f.id]: e.target.value }))}
                    />
                  ) : (
                    <input
                      className="input-base"
                      placeholder={f.placeholder}
                      value={draft[f.id] ?? ''}
                      onChange={(e) => setDraft((p) => ({ ...p, [f.id]: e.target.value }))}
                    />
                  )}
                </div>
              ))}

              <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
                <button type="button" onClick={cancelEdit} className="btn-secondary">
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary disabled:opacity-60"
                >
                  {saving ? '저장 중…' : editingId === 'new' ? '추가하기' : '저장'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
