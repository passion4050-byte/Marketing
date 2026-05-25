/**
 * Data Feeding — 36개 항목 / 9개 카테고리 / 진행률바.
 * Figma 시안(node 804:388) IA 100% 싱크로.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BadgePercent,
  ChevronRight,
  Clock3,
  MapPin,
  Megaphone,
  MessageCircleQuestion,
  Microscope,
  Star,
  Stethoscope,
  Syringe,
  X
} from 'lucide-react';
import { Header } from '@/components/Header';
import { feedingCategories, feedingFields, currentTenant } from '@/lib/mock-data';
import type { FeedingCategoryId } from '@/lib/types';
import { cn } from '@/lib/cn';
import { showToast } from '@/lib/clientActions';

const LS_KEY = 'medimap-geo:data-feeding:v1';

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

export default function DataFeedingPage() {
  const [activeCat, setActiveCat] = useState<FeedingCategoryId>('doctor');
  const [panelOpen, setPanelOpen] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) setValues(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, []);

  const persistedCount = useMemo(
    () => Object.values(values).filter((v) => v && v.trim().length > 0).length,
    [values]
  );

  const totalFields = feedingCategories.reduce((s, c) => s + c.totalFields, 0);
  const baseFilled = feedingCategories.reduce((s, c) => s + c.filledFields, 0);
  const filledFields = Math.min(totalFields, baseFilled + persistedCount);
  const progress = Math.round((filledFields / totalFields) * 100);

  const expertise = feedingCategories.filter((c) => c.group === 'expertise');
  const operation = feedingCategories.filter((c) => c.group === 'operation');
  const content = feedingCategories.filter((c) => c.group === 'content');

  const sum = (arr: typeof feedingCategories) => {
    const t = arr.reduce((s, c) => s + c.totalFields, 0);
    const f = arr.reduce((s, c) => s + c.filledFields, 0);
    return Math.round((f / t) * 100);
  };

  const fields = useMemo(() => feedingFields.filter((f) => f.categoryId === activeCat), [activeCat]);
  const activeCatMeta = feedingCategories.find((c) => c.id === activeCat)!;
  const nextField = fields.find((f) => f.required) ?? fields[0];

  const onChangeField = (id: string, val: string) => setValues((prev) => ({ ...prev, [id]: val }));

  const onPreview = () => {
    const filled = fields.filter((f) => (values[f.id] ?? '').trim().length > 0);
    if (filled.length === 0) {
      showToast('입력값이 없습니다. 먼저 필드를 채워주세요', { kind: 'error' });
      return;
    }
    showToast(`미리 검수 — ${filled.length}/${fields.length} 필드 입력됨`, { kind: 'info' });
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredMissing = fields.filter((f) => f.required && !(values[f.id] ?? '').trim());
    if (requiredMissing.length > 0) {
      showToast(`필수 필드 누락: ${requiredMissing.map((f) => f.label).join(', ')}`, { kind: 'error' });
      return;
    }
    setSaving(true);
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(values));
      await new Promise((r) => setTimeout(r, 280));
      showToast(`${activeCatMeta.title} 저장됨 — AI 프로필 완성도 ${progress}%`);
    } finally {
      setSaving(false);
    }
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
            {filledFields}/{totalFields}개 항목 입력
          </div>
        </div>

        <div className="card card-pad">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="section-title">{currentTenant.name} 데이터 피딩</div>
            </div>
            <div className="text-xs text-ink-muted">입력값은 FAQ, JSON-LD, AI 응답 시뮬레이터에 반영됩니다.</div>
          </div>
          <div className="mt-4 progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} aria-hidden />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-ink-muted">
            <span>의료 전문성 데이터 · {sum(expertise)}%</span>
            <span>운영·위치 데이터 · {sum(operation)}%</span>
            <span>콘텐츠·평판 데이터 · {sum(content)}%</span>
          </div>
        </div>

        <div className="card card-pad">
          <div className="section-subtle">다음 입력 필요</div>
          <div className="mt-1 text-sm font-bold text-ink">{nextField?.label ?? '—'}</div>
          <div className="mt-2">
            <span className="chip-warning">대기 중</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 px-8 pb-10 lg:grid-cols-[480px_1fr]">
        <div className="card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="section-title">추가할 데이터 유형</h2>
            <span className="section-subtle">항목을 클릭하면 오른쪽 입력 패널이 열립니다.</span>
          </div>
          <ul className="divide-y divide-border">
            {feedingCategories.map((c) => {
              const Icon = iconMap[c.icon as keyof typeof iconMap] ?? Stethoscope;
              const active = c.id === activeCat;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCat(c.id);
                      setPanelOpen(true);
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
                        <span className={STATUS_CHIP[c.status].cls}>{STATUS_CHIP[c.status].label}</span>
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

        {panelOpen ? (
          <div className="card">
            <div className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="text-sm font-bold text-ink">{activeCatMeta.title}</h2>
                <p className="mt-1 text-xs text-ink-muted">{activeCatMeta.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="입력 패널 닫기"
                className="rounded-md p-1 text-ink-muted hover:bg-surface-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="space-y-5 px-6 py-6" onSubmit={onSave}>
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
                      value={values[f.id] ?? ''}
                      onChange={(e) => onChangeField(f.id, e.target.value)}
                    />
                  ) : (
                    <input
                      className="input-base"
                      placeholder={f.placeholder}
                      value={values[f.id] ?? ''}
                      onChange={(e) => onChangeField(f.id, e.target.value)}
                    />
                  )}
                </div>
              ))}

              <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
                <button type="button" onClick={onPreview} className="btn-secondary">
                  미리 검수
                </button>
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                  {saving ? '저장 중…' : `+ ${activeCatMeta.title} 추가`}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="card flex h-full min-h-[160px] items-center justify-center px-6 py-8 text-sm text-ink-muted">
            패널이 닫혔습니다 —
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="ml-2 font-semibold text-brand-700 underline"
            >
              다시 열기
            </button>
          </div>
        )}
      </section>
    </>
  );
}
