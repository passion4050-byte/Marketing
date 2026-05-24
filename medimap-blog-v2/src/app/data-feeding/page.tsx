/**
 * Data Feeding — 36개 항목 / 9개 카테고리 / 진행률바.
 * Figma 시안(node 804:388) IA 100% 싱크로.
 */
'use client';

import { useMemo, useState } from 'react';
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

  const totalFields = feedingCategories.reduce((s, c) => s + c.totalFields, 0);
  const filledFields = feedingCategories.reduce((s, c) => s + c.filledFields, 0);
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

      {/* 상단 진행률 영역 */}
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

      {/* 카테고리 리스트 + 입력 패널 */}
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
                    onClick={() => setActiveCat(c.id)}
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

        <div className="card">
          <div className="flex items-start justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="text-sm font-bold text-ink">{activeCatMeta.title}</h2>
              <p className="mt-1 text-xs text-ink-muted">{activeCatMeta.summary}</p>
            </div>
            <button type="button" className="rounded-md p-1 text-ink-muted hover:bg-surface-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form className="space-y-5 px-6 py-6">
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
                  <textarea className="input-base min-h-[110px] resize-y" placeholder={f.placeholder} />
                ) : (
                  <input className="input-base" placeholder={f.placeholder} />
                )}
              </div>
            ))}

            <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
              <button type="button" className="btn-secondary">
                미리 검수
              </button>
              <button type="submit" className="btn-primary">
                + {activeCatMeta.title} 추가
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
