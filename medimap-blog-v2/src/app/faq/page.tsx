/**
 * FAQ & Q&A 텍스트 — Schema.org FAQ 자동 변환.
 * 사용자 목표(LLM 인용)에 가장 직접적인 페이지.
 */
'use client';

import { useMemo, useState } from 'react';
import { ClipboardCheck, Copy, FilePlus2, Filter, ShieldCheck } from 'lucide-react';
import { Header } from '@/components/Header';
import { faqItems as baseFaqItems } from '@/lib/mock-data';
import { faqPageSchema } from '@/lib/aeo';
import { formatKstDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { copyToClipboard, showToast } from '@/lib/clientActions';
import type { FaqItem, PublishStatus } from '@/lib/types';

const STATUS_CHIP: Record<PublishStatus, { label: string; cls: string }> = {
  draft: { label: '초안', cls: 'chip-warning' },
  review: { label: '검수 중', cls: 'chip-brand' },
  published: { label: '발행됨', cls: 'chip-success' },
  archived: { label: '보관됨', cls: 'chip-neutral' }
};

export default function FaqPage() {
  const [filter, setFilter] = useState<'all' | PublishStatus>('all');
  const [items, setItems] = useState<FaqItem[]>(baseFaqItems);
  const [adding, setAdding] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const visible = filter === 'all' ? items : items.filter((q) => q.status === filter);

  const kpis = useMemo(
    () => [
      { label: '총 FAQ', value: items.length, suffix: '건' },
      { label: '발행 완료', value: items.filter((q) => q.status === 'published').length, suffix: '건' },
      { label: 'Schema 적용', value: items.filter((q) => q.schemaReady).length, suffix: '건' },
      { label: 'AI 생성', value: items.filter((q) => q.generatedBy !== 'manual').length, suffix: '건' }
    ],
    [items]
  );

  const copyFaqJsonLd = async () => {
    const payload = faqPageSchema(items);
    const wrapped = `<script type="application/ld+json">\n${JSON.stringify(payload, null, 2)}\n</script>`;
    const ok = await copyToClipboard(wrapped);
    showToast(ok ? `FAQPage Schema ${items.length}건 복사됨` : '복사 실패', {
      kind: ok ? 'success' : 'error'
    });
  };

  const copyAnswer = async (q: FaqItem) => {
    const ok = await copyToClipboard(`Q. ${q.question}\nA. ${q.answer}`);
    showToast(ok ? '본문 복사됨' : '복사 실패', { kind: ok ? 'success' : 'error' });
  };

  const setStatus = (id: string, status: PublishStatus) => {
    setItems((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status, updatedAt: new Date().toISOString() } : q))
    );
    const label = status === 'published' ? '발행' : status === 'review' ? '검수 중' : '초안';
    showToast(`${label}으로 변경됨`);
  };

  const generateFromAi = async (kw: string) => {
    const keyword = kw.trim();
    if (!keyword) {
      showToast('키워드를 입력하세요', { kind: 'error' });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/faq/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, count: 3 })
      });
      const data = await res.json();
      if (!data.ok) throw new Error('failed');
      setItems((prev) => [...data.generated, ...prev]);
      setShowAddModal(false);
      setNewKeyword('');
      showToast(`${data.generated.length}건 FAQ 추가됨`);
    } catch (err) {
      showToast(`오류: ${(err as Error).message}`, { kind: 'error' });
    } finally {
      setAdding(false);
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
        {kpis.map((k) => (
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
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="btn-primary text-xs ml-2"
              >
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
                    <button type="button" onClick={() => copyAnswer(q)} className="btn-secondary text-xs">
                      <Copy className="h-3.5 w-3.5" /> 본문 복사
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(q.id, 'review')}
                      className="btn-secondary text-xs"
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" /> 검수
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(q.id, 'published')}
                      disabled={q.status === 'published'}
                      className="btn-primary text-xs disabled:opacity-60"
                    >
                      {q.status === 'published' ? '발행됨' : '발행'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {showAddModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/60 p-4"
          onClick={() => !adding && setShowAddModal(false)}
        >
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-base font-bold text-ink">AI로 FAQ 추가</h3>
              <p className="mt-1 text-xs text-ink-muted">키워드를 입력하면 3건의 FAQ 초안이 자동 생성됩니다.</p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <input
                className="input-base"
                placeholder="예: 잠실 라섹, 강남안과 노안교정..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generateFromAi(newKeyword)}
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={adding}
                className="btn-secondary text-xs"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => generateFromAi(newKeyword)}
                disabled={adding}
                className="btn-primary text-xs disabled:opacity-60"
              >
                {adding ? '생성 중…' : '3건 생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
