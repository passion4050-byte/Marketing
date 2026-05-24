/**
 * FAQ & Q&A 텍스트 — Schema.org FAQ 자동 변환.
 * 사용자 목표(LLM 인용)에 가장 직접적인 페이지 — AI 모델은 Q/A 매칭을 최우선 선호.
 */
'use client';

import { useState } from 'react';
import { ClipboardCheck, Copy, FilePlus2, Filter, ShieldCheck } from 'lucide-react';
import { Header } from '@/components/Header';
import { faqItems } from '@/lib/mock-data';
import { faqPageSchema } from '@/lib/aeo';
import { formatKstDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { PublishStatus } from '@/lib/types';

const STATUS_CHIP: Record<PublishStatus, { label: string; cls: string }> = {
  draft: { label: '초안', cls: 'chip-warning' },
  review: { label: '검수 중', cls: 'chip-brand' },
  published: { label: '발행됨', cls: 'chip-success' },
  archived: { label: '보관됨', cls: 'chip-neutral' }
};

const KPIS = [
  { label: '총 FAQ', value: faqItems.length, suffix: '건' },
  { label: '발행 완료', value: faqItems.filter((q) => q.status === 'published').length, suffix: '건' },
  { label: 'Schema 적용', value: faqItems.filter((q) => q.schemaReady).length, suffix: '건' },
  { label: 'AI 생성', value: faqItems.filter((q) => q.generatedBy !== 'manual').length, suffix: '건' }
];

export default function FaqPage() {
  const [filter, setFilter] = useState<'all' | PublishStatus>('all');
  const visible = filter === 'all' ? faqItems : faqItems.filter((q) => q.status === filter);

  const copyFaqJsonLd = async () => {
    const payload = faqPageSchema(faqItems);
    const wrapped = `<script type="application/ld+json">\n${JSON.stringify(payload, null, 2)}\n</script>`;
    try {
      await navigator.clipboard.writeText(wrapped);
    } catch {
      /* noop */
    }
  };

  return (
    <>
      <Header
        title="FAQ & Q&A 텍스트"
        subtitle="자주 묻는 질문을 Schema.org FAQPage로 자동 변환하고 자사 페이지·블로그·네이버에 일괄 노출합니다."
        actionLabel="Schema 복사"
        onAction={copyFaqJsonLd}
      />

      <section className="grid grid-cols-1 gap-4 px-8 py-6 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="card card-pad">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">
              {k.value}
              <span className="ml-1 text-base font-semibold text-ink-muted">{k.suffix}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="px-8 pb-10">
        <div className="card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <h2 className="section-title">전체 FAQ</h2>
              <span className="section-subtle">AI가 인용하기 쉬운 답변 형태로 자동 변환됩니다.</span>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-ink-muted" />
              {(['all', 'published', 'review', 'draft'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilter(s)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-semibold transition',
                    filter === s ? 'bg-brand text-white' : 'text-ink-muted hover:bg-surface-muted'
                  )}
                >
                  {s === 'all' ? '전체' : STATUS_CHIP[s].label}
                </button>
              ))}
              <button type="button" className="btn-primary text-xs ml-2">
                <FilePlus2 className="h-3.5 w-3.5" /> AI로 FAQ 추가
              </button>
            </div>
          </div>

          <ul className="divide-y divide-border">
            {visible.map((q) => (
              <li key={q.id} className="px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="chip-brand">{q.category}</span>
                      <span className={STATUS_CHIP[q.status].cls}>{STATUS_CHIP[q.status].label}</span>
                      {q.schemaReady && (
                        <span className="chip-success inline-flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Schema OK
                        </span>
                      )}
                      <span className="text-[11px] text-ink-muted">
                        {q.generatedBy === 'manual' ? '직접 작성' : `${q.generatedBy} 생성`}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-ink">{q.question}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{q.answer}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <span>업데이트 {formatKstDateTime(q.updatedAt)}</span>
                      <span>·</span>
                      <span className="flex flex-wrap gap-1">
                        {q.keywords.map((k) => (
                          <span key={k} className="chip-neutral">#{k}</span>
                        ))}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <button type="button" className="btn-secondary text-xs">
                      <Copy className="h-3.5 w-3.5" /> 본문 복사
                    </button>
                    <button type="button" className="btn-secondary text-xs">
                      <ClipboardCheck className="h-3.5 w-3.5" /> 검수
                    </button>
                    <button type="button" className="btn-primary text-xs">발행</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
